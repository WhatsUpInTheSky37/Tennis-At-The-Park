import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { sendNewMessageEmail } from '../lib/email'

const sendSchema = z.object({
  toId: z.string().min(1),
  subject: z.string().max(200).default(''),
  body: z.string().min(1).max(5000),
})

export async function dmRoutes(server: FastifyInstance) {
  server.addHook('preHandler', (server as any).authenticate)

  server.get('/inbox', async (req) => {
    const { userId } = (req as any).user
    const q = req.query as any
    const page = Math.max(1, parseInt(q.page) || 1)
    const take = 20
    const skip = (page - 1) * take

    const [messages, total, unreadCount] = await Promise.all([
      prisma.directMessage.findMany({
        where: { toId: userId },
        include: { sender: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.directMessage.count({ where: { toId: userId } }),
      prisma.directMessage.count({ where: { toId: userId, read: false } }),
    ])

    return { messages, total, unreadCount }
  })

  server.get('/sent', async (req) => {
    const { userId } = (req as any).user
    const q = req.query as any
    const page = Math.max(1, parseInt(q.page) || 1)
    const take = 20
    const skip = (page - 1) * take

    const [messages, total] = await Promise.all([
      prisma.directMessage.findMany({
        where: { fromId: userId },
        include: { receiver: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.directMessage.count({ where: { fromId: userId } }),
    ])

    return { messages, total }
  })

  server.get('/conversation/:otherUserId', async (req) => {
    const { userId } = (req as any).user
    const { otherUserId } = req.params as any

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { fromId: userId, toId: otherUserId },
          { fromId: otherUserId, toId: userId },
        ],
      },
      include: {
        sender: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
        receiver: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    await prisma.directMessage.updateMany({
      where: { fromId: otherUserId, toId: userId, read: false },
      data: { read: true },
    })

    return messages
  })

  server.post('/', async (req, reply) => {
    const { userId } = (req as any).user
    const parsed = sendSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { toId, subject, body } = parsed.data
    if (toId === userId) return reply.status(400).send({ error: 'Cannot message yourself' })

    const recipient = await prisma.user.findUnique({ where: { id: toId }, include: { profile: { select: { displayName: true } } } })
    if (!recipient) return reply.status(404).send({ error: 'User not found' })

    const sender = await prisma.user.findUnique({ where: { id: userId }, include: { profile: { select: { displayName: true } } } })

    const msg = await prisma.directMessage.create({
      data: { fromId: userId, toId, subject, body },
      include: { sender: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } } },
    })

    await sendNewMessageEmail(
      recipient.email,
      recipient.profile?.displayName || 'Player',
      sender?.profile?.displayName || 'Someone',
      body
    )

    return msg
  })

  server.post('/:id/read', async (req) => {
    const { userId } = (req as any).user
    const { id } = req.params as any

    await prisma.directMessage.updateMany({
      where: { id, toId: userId },
      data: { read: true },
    })

    return { ok: true }
  })

  server.delete('/:id', async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as any

    const msg = await prisma.directMessage.findUnique({ where: { id } })
    if (!msg) return reply.status(404).send({ error: 'Not found' })
    if (msg.fromId !== userId && msg.toId !== userId) return reply.status(403).send({ error: 'Forbidden' })

    await prisma.directMessage.delete({ where: { id } })
    return { ok: true }
  })

  server.get('/unread-count', async (req) => {
    const { userId } = (req as any).user
    const count = await prisma.directMessage.count({ where: { toId: userId, read: false } })
    return { count }
  })
}
