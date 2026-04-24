import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { checkEnforcement } from '../middleware/auth'

const createSchema = z.object({
  locationId: z.string(),
  courtNumber: z.number().int().min(1).optional().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  format: z.enum(['singles', 'doubles', 'mixed']),
  stakes: z.string().default('casual'),
  levelMin: z.number().min(1).max(7),
  levelMax: z.number().min(1).max(7),
  notes: z.string().max(500).default(''),
  flexibleCourt: z.boolean().default(false)
})

export async function sessionRoutes(server: FastifyInstance) {
  // List sessions
  server.get('/', async (req) => {
    const query = req.query as any
    const where: any = { status: { not: 'cancelled' } }
    if (query.locationId) where.locationId = query.locationId
    if (query.format) where.format = query.format
    if (query.date) {
      const d = new Date(query.date)
      if (query.dateTo) {
        const end = new Date(query.dateTo)
        end.setDate(end.getDate() + 1)
        where.startTime = { gte: d, lt: end }
      } else {
        const next = new Date(d); next.setDate(next.getDate() + 1)
        where.startTime = { gte: d, lt: next }
      }
    }
    return prisma.session.findMany({
      where,
      include: {
        creator: { select: { id: true } },
        location: true,
        participants: { include: { user: { select: { id: true, profile: { select: { displayName: true, skillLevel: true, photoUrl: true } } } } } },
        _count: { select: { messages: true } }
      },
      orderBy: { startTime: 'asc' }
    })
  })

  // Create session
  server.post('/', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    if (!await checkEnforcement(userId, reply)) return

    const body = createSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const data = body.data

    // Validate court number against location
    const location = await prisma.location.findUnique({ where: { id: data.locationId } })
    if (!location) return reply.status(404).send({ error: 'Location not found' })
    if (!data.flexibleCourt && data.courtNumber && data.courtNumber > location.courtCount) {
      return reply.status(400).send({ error: `Court ${data.courtNumber} does not exist at ${location.name}` })
    }

    // Conflict detection (non-flexible sessions on same court)
    if (!data.flexibleCourt && data.courtNumber) {
      const conflict = await prisma.session.findFirst({
        where: {
          locationId: data.locationId,
          courtNumber: data.courtNumber,
          status: { not: 'cancelled' },
          flexibleCourt: false,
          OR: [
            { startTime: { lt: new Date(data.endTime), gte: new Date(data.startTime) } },
            { endTime: { gt: new Date(data.startTime), lte: new Date(data.endTime) } },
            { startTime: { lte: new Date(data.startTime) }, endTime: { gte: new Date(data.endTime) } }
          ]
        }
      })
      if (conflict) return reply.status(409).send({ error: 'Time conflict: another session is planned for that court and time.' })
    }

    const session = await prisma.session.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        createdBy: userId,
        participants: { create: { userId, role: 'host', status: 'confirmed' } }
      },
      include: { location: true, participants: true }
    })
    return reply.status(201).send(session)
  })

  // Get single session
  server.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        location: true,
        creator: { select: { id: true } },
        participants: { include: { user: { select: { id: true, profile: { select: { displayName: true, skillLevel: true, photoUrl: true } } } } } },
        invites: true,
        messages: { include: { user: { select: { id: true, profile: { select: { displayName: true } } } } }, orderBy: { createdAt: 'asc' } }
      }
    })
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    return session
  })

  // Update session
  server.put('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const session = await prisma.session.findUnique({ where: { id } })
    if (!session) return reply.status(404).send({ error: 'Not found' })
    if (session.createdBy !== userId) return reply.status(403).send({ error: 'Not the host' })
    const body = createSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    return prisma.session.update({ where: { id }, data: body.data })
  })

  // Cancel session
  server.delete('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const session = await prisma.session.findUnique({ where: { id } })
    if (!session) return reply.status(404).send({ error: 'Not found' })
    if (session.createdBy !== userId) return reply.status(403).send({ error: 'Not the host' })
    return prisma.session.update({ where: { id }, data: { status: 'cancelled' } })
  })

  // Join session
  server.post('/:id/join', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    if (!await checkEnforcement(userId, reply)) return
    const { id } = req.params as { id: string }
    const existing = await prisma.sessionParticipant.findUnique({ where: { sessionId_userId: { sessionId: id, userId } } })
    if (existing) return reply.status(409).send({ error: 'Already joined' })
    return prisma.sessionParticipant.create({ data: { sessionId: id, userId, role: 'guest' } })
  })

  // Invite player
  server.post('/:id/invite', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    if (!await checkEnforcement(userId, reply)) return
    const { id } = req.params as { id: string }
    const { toUser } = req.body as { toUser: string }
    return prisma.invite.create({ data: { sessionId: id, fromUser: userId, toUser } })
  })

  // Respond to invite
  server.post('/invites/:inviteId/respond', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { inviteId } = req.params as { inviteId: string }
    const { status } = req.body as { status: 'accepted' | 'declined' }
    const invite = await prisma.invite.findUnique({ where: { id: inviteId } })
    if (!invite || invite.toUser !== userId) return reply.status(403).send({ error: 'Not your invite' })
    await prisma.invite.update({ where: { id: inviteId }, data: { status } })
    if (status === 'accepted') {
      const existing = await prisma.sessionParticipant.findUnique({ where: { sessionId_userId: { sessionId: invite.sessionId, userId } } })
      if (!existing) await prisma.sessionParticipant.create({ data: { sessionId: invite.sessionId, userId, role: 'guest' } })
    }
    return { ok: true }
  })

  // Messages
  server.get('/:id/messages', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const participant = await prisma.sessionParticipant.findUnique({ where: { sessionId_userId: { sessionId: id, userId } } })
    if (!participant) return reply.status(403).send({ error: 'Not a participant' })
    return prisma.message.findMany({
      where: { sessionId: id },
      include: { user: { select: { id: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: 'asc' }
    })
  })

  server.post('/:id/messages', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    if (!await checkEnforcement(userId, reply)) return
    const { id } = req.params as { id: string }
    const { body: msgBody } = req.body as { body: string }
    if (!msgBody || msgBody.trim().length === 0) return reply.status(400).send({ error: 'Empty message' })
    const participant = await prisma.sessionParticipant.findUnique({ where: { sessionId_userId: { sessionId: id, userId } } })
    if (!participant) return reply.status(403).send({ error: 'Not a participant' })
    return prisma.message.create({ data: { sessionId: id, fromUser: userId, body: msgBody.trim() } })
  })
}
