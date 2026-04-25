import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { checkEnforcement } from '../middleware/auth'
import { sendChallengeEmail } from '../lib/email'

const createSchema = z.object({
  challengedId: z.string(),
  locationId: z.string(),
  proposedTime: z.string().datetime(),
  proposedEndTime: z.string().datetime(),
  format: z.enum(['singles', 'doubles']),
  stakes: z.string().default('casual'),
  message: z.string().max(300).default('')
})

export async function challengeRoutes(server: FastifyInstance) {
  // List challenges for current user (both sent and received)
  server.get('/', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    const query = req.query as any
    const direction = query.direction // 'sent' | 'received' | undefined (both)
    const status = query.status // filter by status

    const where: any = {}
    if (direction === 'sent') {
      where.challengerId = userId
    } else if (direction === 'received') {
      where.challengedId = userId
    } else {
      where.OR = [{ challengerId: userId }, { challengedId: userId }]
    }
    if (status) where.status = status

    return prisma.challenge.findMany({
      where,
      include: {
        challenger: {
          select: {
            id: true,
            profile: { select: { displayName: true, skillLevel: true, photoUrl: true } },
            rating: { select: { elo: true, wins: true, losses: true, matchesPlayed: true } }
          }
        },
        challenged: {
          select: {
            id: true,
            profile: { select: { displayName: true, skillLevel: true, photoUrl: true } },
            rating: { select: { elo: true, wins: true, losses: true, matchesPlayed: true } }
          }
        },
        location: true
      },
      orderBy: { createdAt: 'desc' }
    })
  })

  // Get pending challenge count for current user
  server.get('/pending-count', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    const count = await prisma.challenge.count({
      where: { challengedId: userId, status: 'pending' }
    })
    return { count }
  })

  // Create a challenge
  server.post('/', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    if (!await checkEnforcement(userId, reply)) return

    const body = createSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const data = body.data

    // Can't challenge yourself
    if (data.challengedId === userId) {
      return reply.status(400).send({ error: 'You cannot challenge yourself' })
    }

    // Verify challenged user exists
    const challenged = await prisma.user.findUnique({ where: { id: data.challengedId } })
    if (!challenged) return reply.status(404).send({ error: 'Player not found' })

    // Verify location exists
    const location = await prisma.location.findUnique({ where: { id: data.locationId } })
    if (!location) return reply.status(404).send({ error: 'Location not found' })

    // Check for duplicate pending challenges to same user
    const existing = await prisma.challenge.findFirst({
      where: {
        challengerId: userId,
        challengedId: data.challengedId,
        status: 'pending'
      }
    })
    if (existing) {
      return reply.status(409).send({ error: 'You already have a pending challenge to this player' })
    }

    const challenge = await prisma.challenge.create({
      data: {
        challengerId: userId,
        challengedId: data.challengedId,
        locationId: data.locationId,
        proposedTime: new Date(data.proposedTime),
        proposedEndTime: new Date(data.proposedEndTime),
        format: data.format,
        stakes: data.stakes,
        message: data.message
      },
      include: {
        challenger: { select: { id: true, profile: { select: { displayName: true } } } },
        challenged: { select: { id: true, profile: { select: { displayName: true } } } },
        location: true
      }
    })

    await sendChallengeEmail(
      challenged.email,
      challenge.challenged?.profile?.displayName || 'Player',
      challenge.challenger?.profile?.displayName || 'Someone',
      data.format,
      location.name,
      new Date(data.proposedTime)
    )

    return reply.status(201).send(challenge)
  })

  // Get single challenge
  server.get('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        challenger: {
          select: {
            id: true,
            profile: { select: { displayName: true, skillLevel: true, photoUrl: true } },
            rating: { select: { elo: true, wins: true, losses: true, matchesPlayed: true } }
          }
        },
        challenged: {
          select: {
            id: true,
            profile: { select: { displayName: true, skillLevel: true, photoUrl: true } },
            rating: { select: { elo: true, wins: true, losses: true, matchesPlayed: true } }
          }
        },
        location: true
      }
    })

    if (!challenge) return reply.status(404).send({ error: 'Challenge not found' })
    if (challenge.challengerId !== userId && challenge.challengedId !== userId) {
      return reply.status(403).send({ error: 'Not your challenge' })
    }

    return challenge
  })

  // Accept a challenge
  server.post('/:id/accept', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    if (!await checkEnforcement(userId, reply)) return
    const { id } = req.params as { id: string }

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        challenger: { select: { id: true, profile: { select: { displayName: true, skillLevel: true } } } },
        challenged: { select: { id: true, profile: { select: { displayName: true, skillLevel: true } } } },
        location: true
      }
    })
    if (!challenge) return reply.status(404).send({ error: 'Challenge not found' })
    if (challenge.challengedId !== userId) return reply.status(403).send({ error: 'Only the challenged player can accept' })
    if (challenge.status !== 'pending') return reply.status(400).send({ error: `Challenge is already ${challenge.status}` })

    const challengerSkill = challenge.challenger?.profile?.skillLevel || 3
    const challengedSkill = challenge.challenged?.profile?.skillLevel || 3
    const levelMin = Math.min(challengerSkill, challengedSkill)
    const levelMax = Math.max(challengerSkill, challengedSkill)
    const challengerName = challenge.challenger?.profile?.displayName || 'Player'
    const challengedName = challenge.challenged?.profile?.displayName || 'Player'

    const session = await prisma.session.create({
      data: {
        createdBy: challenge.challengerId,
        locationId: challenge.locationId,
        startTime: challenge.proposedTime,
        endTime: challenge.proposedEndTime,
        format: challenge.format,
        stakes: challenge.stakes,
        levelMin,
        levelMax,
        notes: `Challenge match: ${challengerName} vs ${challengedName}`,
        flexibleCourt: true,
        participants: {
          createMany: {
            data: [
              { userId: challenge.challengerId, role: 'host', status: 'confirmed' },
              { userId: challenge.challengedId, role: 'guest', status: 'confirmed' },
            ]
          }
        }
      }
    })

    const updated = await prisma.challenge.update({
      where: { id },
      data: { status: 'accepted' },
      include: {
        challenger: { select: { id: true, profile: { select: { displayName: true } } } },
        challenged: { select: { id: true, profile: { select: { displayName: true } } } },
        location: true
      }
    })

    return { ...updated, sessionId: session.id }
  })

  // Decline a challenge
  server.post('/:id/decline', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const { reason } = (req.body as any) || {}

    const challenge = await prisma.challenge.findUnique({ where: { id } })
    if (!challenge) return reply.status(404).send({ error: 'Challenge not found' })
    if (challenge.challengedId !== userId) return reply.status(403).send({ error: 'Only the challenged player can decline' })
    if (challenge.status !== 'pending') return reply.status(400).send({ error: `Challenge is already ${challenge.status}` })

    const updated = await prisma.challenge.update({
      where: { id },
      data: { status: 'declined', declineReason: reason || '' },
      include: {
        challenger: { select: { id: true, profile: { select: { displayName: true } } } },
        location: true
      }
    })

    return updated
  })

  // Cancel a challenge (only by challenger)
  server.post('/:id/cancel', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }

    const challenge = await prisma.challenge.findUnique({ where: { id } })
    if (!challenge) return reply.status(404).send({ error: 'Challenge not found' })
    if (challenge.challengerId !== userId) return reply.status(403).send({ error: 'Only the challenger can cancel' })
    if (challenge.status !== 'pending') return reply.status(400).send({ error: `Challenge is already ${challenge.status}` })

    const updated = await prisma.challenge.update({
      where: { id },
      data: { status: 'cancelled' }
    })

    return updated
  })

  // Get all challenges for calendar view (accepted + pending for current user)
  server.get('/calendar/events', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    const query = req.query as any

    const where: any = {
      OR: [{ challengerId: userId }, { challengedId: userId }],
      status: { in: ['pending', 'accepted'] }
    }

    if (query.from) {
      where.proposedTime = { ...(where.proposedTime || {}), gte: new Date(query.from) }
    }
    if (query.to) {
      where.proposedTime = { ...(where.proposedTime || {}), lte: new Date(query.to) }
    }

    const challenges = await prisma.challenge.findMany({
      where,
      include: {
        challenger: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
        challenged: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
        location: true
      },
      orderBy: { proposedTime: 'asc' }
    })

    // Also get sessions for the calendar
    const sessionWhere: any = {
      status: { not: 'cancelled' },
      OR: [
        { participants: { some: { userId } } },
        { createdBy: userId }
      ]
    }
    if (query.from) {
      sessionWhere.startTime = { ...(sessionWhere.startTime || {}), gte: new Date(query.from) }
    }
    if (query.to) {
      sessionWhere.startTime = { ...(sessionWhere.startTime || {}), lte: new Date(query.to) }
    }

    const sessions = await prisma.session.findMany({
      where: sessionWhere,
      include: {
        location: true,
        participants: {
          include: {
            user: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    return { challenges, sessions }
  })
}
