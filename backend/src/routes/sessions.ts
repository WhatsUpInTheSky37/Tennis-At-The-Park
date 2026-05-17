import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { checkEnforcement } from '../middleware/auth'
import { sendSessionInviteEmail, shouldEmailUser } from '../lib/email'

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

// An unanswered invite stays "active" (counts as a possible player and shows
// in the UI) right up until the session starts. Once the session has started,
// pending invites expire and the "possible" slot frees up.
const inviteProfileSelect = {
  id: true,
  profile: { select: { displayName: true, photoUrl: true, skillLevel: true } },
}

const inviteInclude = {
  sender:   { select: inviteProfileSelect },
  receiver: { select: inviteProfileSelect },
}

// Drop pending invites once the session has started.
function filterActiveInvites(invites: any[], sessionStart: Date) {
  const now = new Date()
  return invites.filter((i: any) => {
    if (i.status !== 'pending') return true // keep accepted/declined for history
    return now < sessionStart
  })
}

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
        invites: { include: inviteInclude, orderBy: { createdAt: 'desc' } },
        messages: { include: { user: { select: { id: true, profile: { select: { displayName: true } } } } }, orderBy: { createdAt: 'asc' } }
      }
    })
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    return { ...session, invites: filterActiveInvites(session.invites, session.startTime) }
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

  // Leave session
  server.post('/:id/leave', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const session = await prisma.session.findUnique({ where: { id } })
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    if (session.createdBy === userId) return reply.status(400).send({ error: 'The host cannot leave. Cancel the session instead.' })
    const participant = await prisma.sessionParticipant.findUnique({ where: { sessionId_userId: { sessionId: id, userId } } })
    if (!participant) return reply.status(404).send({ error: 'You are not in this session' })
    await prisma.sessionParticipant.delete({ where: { sessionId_userId: { sessionId: id, userId } } })
    return { ok: true }
  })

  // List my pending (non-expired) invites
  server.get('/my-invites', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    const now = new Date()
    const invites = await prisma.invite.findMany({
      where: {
        toUser: userId,
        status: 'pending',
        session: {
          status: { not: 'cancelled' },
          // Only return invites for sessions that haven't started yet
          startTime: { gt: now },
        },
      },
      include: {
        sender: { select: inviteProfileSelect },
        session: {
          include: { location: true, creator: { select: { id: true, profile: { select: { displayName: true } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return invites
  })

  // Invite player (host only)
  server.post('/:id/invite', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    if (!await checkEnforcement(userId, reply)) return
    const { id } = req.params as { id: string }
    const parsed = z.object({ toUser: z.string().min(1) }).safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const { toUser } = parsed.data

    if (toUser === userId) return reply.status(400).send({ error: "You can't invite yourself" })

    const session = await prisma.session.findUnique({
      where: { id },
      include: { participants: { select: { userId: true } } },
    })
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    if (session.status === 'cancelled') return reply.status(400).send({ error: 'Session is cancelled' })
    if (session.createdBy !== userId) return reply.status(403).send({ error: 'Only the host can invite players' })

    if (session.startTime.getTime() <= Date.now()) {
      return reply.status(400).send({ error: 'Too late to invite — the session has already started' })
    }

    const invitee = await prisma.user.findUnique({ where: { id: toUser }, select: { id: true } })
    if (!invitee) return reply.status(404).send({ error: 'Player not found' })

    if (session.participants.some(p => p.userId === toUser)) {
      return reply.status(409).send({ error: 'Player is already in this session' })
    }

    const existingPending = await prisma.invite.findFirst({
      where: { sessionId: id, toUser, status: 'pending' },
    })
    if (existingPending) return reply.status(409).send({ error: 'Player already has a pending invite' })

    const invite = await prisma.invite.create({
      data: { sessionId: id, fromUser: userId, toUser },
      include: inviteInclude,
    })

    if (await shouldEmailUser(toUser, 'sessionInvites')) {
      const [recipient, sessionInfo] = await Promise.all([
        prisma.user.findUnique({
          where: { id: toUser },
          select: { email: true, profile: { select: { displayName: true } } },
        }),
        prisma.session.findUnique({
          where: { id },
          select: { startTime: true, location: { select: { name: true } } },
        }),
      ])
      if (recipient && sessionInfo) {
        await sendSessionInviteEmail(
          recipient.email,
          recipient.profile?.displayName || 'Player',
          invite.sender?.profile?.displayName || 'Someone',
          sessionInfo.location?.name || 'a tennis location',
          sessionInfo.startTime,
          id,
        )
      }
    }

    return invite
  })

  // Respond to invite (accept = join the session; decline = drop the invite)
  server.post('/invites/:inviteId/respond', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    if (!await checkEnforcement(userId, reply)) return
    const { inviteId } = req.params as { inviteId: string }
    const parsed = z.object({ status: z.enum(['accepted', 'declined']) }).safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const { status } = parsed.data

    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
      include: { session: true },
    })
    if (!invite || invite.toUser !== userId) return reply.status(403).send({ error: 'Not your invite' })
    if (invite.status !== 'pending') return reply.status(400).send({ error: 'Invite already responded' })
    if (invite.session.status === 'cancelled') return reply.status(400).send({ error: 'Session is cancelled' })

    if (status === 'accepted' && invite.session.startTime.getTime() <= Date.now()) {
      return reply.status(400).send({ error: 'This session has already started' })
    }

    await prisma.invite.update({ where: { id: inviteId }, data: { status } })
    if (status === 'accepted') {
      const existing = await prisma.sessionParticipant.findUnique({ where: { sessionId_userId: { sessionId: invite.sessionId, userId } } })
      if (!existing) await prisma.sessionParticipant.create({ data: { sessionId: invite.sessionId, userId, role: 'guest', status: 'confirmed' } })
    }
    return { ok: true, status }
  })

  // Cancel / withdraw an invite. Allowed for the session host or the invitee.
  server.delete('/invites/:inviteId', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { inviteId } = req.params as { inviteId: string }
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
      include: { session: { select: { createdBy: true } } },
    })
    if (!invite) return reply.status(404).send({ error: 'Invite not found' })
    const isHost = invite.session.createdBy === userId
    const isInvitee = invite.toUser === userId
    if (!isHost && !isInvitee) return reply.status(403).send({ error: 'Not allowed' })
    await prisma.invite.delete({ where: { id: inviteId } })
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
