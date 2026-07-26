import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { shouldEmailUser, sendPollEmail } from '../lib/email'

async function requireAdmin(req: any, reply: any) {
  if (!req.user?.isAdmin) return reply.status(403).send({ error: 'Admin only' })
}

// The current active poll with per-option counts + the caller's own vote.
async function activePollPayload(userId?: string) {
  const poll = await prisma.poll.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } })
  if (!poll) return null
  const votes = await prisma.pollVote.findMany({ where: { pollId: poll.id }, select: { userId: true, optionIndex: true } })
  const options = (poll.options as string[]) || []
  const counts = options.map((_, i) => votes.filter(v => v.optionIndex === i).length)
  const myVote = userId ? (votes.find(v => v.userId === userId)?.optionIndex ?? null) : null
  return { id: poll.id, question: poll.question, options, counts, total: votes.length, myVote }
}

export async function pollRoutes(server: FastifyInstance) {
  // Active poll (public). If signed in, includes which option you picked.
  server.get('/active', async (req) => {
    let userId: string | undefined
    try { await (req as any).jwtVerify(); userId = (req as any).user?.userId } catch { /* not signed in */ }
    return activePollPayload(userId)
  })

  // Cast (or change) your vote on the active poll.
  server.post('/:id/vote', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId } = (req as any).user
    const body = z.object({ optionIndex: z.number().int().min(0).max(20) }).safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid option' })
    const poll = await prisma.poll.findUnique({ where: { id } })
    if (!poll || !poll.active) return reply.status(400).send({ error: 'This poll is closed' })
    const options = (poll.options as string[]) || []
    if (body.data.optionIndex >= options.length) return reply.status(400).send({ error: 'Invalid option' })
    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId: id, userId } },
      create: { pollId: id, userId, optionIndex: body.data.optionIndex },
      update: { optionIndex: body.data.optionIndex }
    })
    return activePollPayload(userId)
  })

  // Admin: create a poll (it becomes THE active poll; any prior one is closed).
  server.post('/', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req, reply) => {
    const body = z.object({
      question: z.string().min(1).max(300),
      options: z.array(z.string().min(1).max(120)).min(2).max(8)
    }).safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const { userId } = (req as any).user
    await prisma.poll.updateMany({ where: { active: true }, data: { active: false } })
    const question = body.data.question.trim()
    const poll = await prisma.poll.create({
      data: { question, options: body.data.options.map(o => o.trim()), active: true, createdBy: userId }
    })

    // Notify all members: in-app notification + email (respecting opt-out).
    const users = await prisma.user.findMany({ select: { id: true, email: true, profile: { select: { displayName: true } } } })
    await prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, fromUserId: userId, type: 'poll', title: question, message: 'Cast your vote on the dashboard.', link: '/dashboard' }))
    })
    for (const u of users) {
      if (await shouldEmailUser(u.id)) sendPollEmail(u.email, u.profile?.displayName || 'there', question)
    }

    return reply.status(201).send({ id: poll.id })
  })

  // Admin: list all polls with vote totals.
  server.get('/', { preHandler: [(server as any).authenticate, requireAdmin] }, async () => {
    const polls = await prisma.poll.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { votes: true } } } })
    return polls.map(p => ({ id: p.id, question: p.question, options: p.options, active: p.active, votes: p._count.votes, createdAt: p.createdAt }))
  })

  // Admin: open/close a poll (opening one closes the others).
  server.patch('/:id', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = z.object({ active: z.boolean() }).safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid' })
    if (body.data.active) await prisma.poll.updateMany({ where: { active: true }, data: { active: false } })
    await prisma.poll.update({ where: { id }, data: { active: body.data.active } })
    return { ok: true }
  })

  // Admin: delete a poll (and its votes).
  server.delete('/:id', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req) => {
    const { id } = req.params as { id: string }
    await prisma.poll.delete({ where: { id } })
    return { ok: true }
  })
}
