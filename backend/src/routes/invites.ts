import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export default async function inviteRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [(fastify as any).authenticate] }, async (request) => {
    const { id: userId } = request.user as any

    return prisma.invite.findMany({
      where: { toUser: userId },
      include: {
        session: { include: { location: true, creator: { select: { id: true, profile: { select: { displayName: true } } } } } },
        sender: { select: { id: true, profile: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  fastify.post('/:id/respond', { preHandler: [(fastify as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as any
    const { id: userId } = request.user as any

    const body = z.object({ accept: z.boolean() }).parse(request.body)

    const invite = await prisma.invite.findUnique({ where: { id } })
    if (!invite) return reply.status(404).send({ error: 'Invite not found' })
    if (invite.toUser !== userId) return reply.status(403).send({ error: 'Not your invite' })
    if (invite.status !== 'pending') return reply.status(400).send({ error: 'Invite already responded' })

    const status = body.accept ? 'accepted' : 'declined'
    await prisma.invite.update({ where: { id }, data: { status } })

    if (body.accept) {
      // Add as participant
      const existing = await prisma.sessionParticipant.findUnique({
        where: { sessionId_userId: { sessionId: invite.sessionId, userId } },
      })
      if (!existing) {
        await prisma.sessionParticipant.create({
          data: { sessionId: invite.sessionId, userId, role: 'guest', status: 'confirmed' },
        })
      }
    }

    return { status }
  })
}
