import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function notificationRoutes(server: FastifyInstance) {
  server.get('/', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    const items = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        fromUser: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
        post: { select: { id: true, subject: true } },
        reply: { select: { id: true, postId: true, body: true } },
      },
    })
    return items
  })

  server.get('/unread-count', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    const count = await prisma.notification.count({ where: { userId, read: false } })
    return { count }
  })

  server.post('/:id/read', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as any
    const { userId } = (req as any).user
    const n = await prisma.notification.findUnique({ where: { id } })
    if (!n || n.userId !== userId) return reply.status(404).send({ error: 'Not found' })
    return prisma.notification.update({ where: { id }, data: { read: true } })
  })

  server.post('/read-all', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
    return { ok: true }
  })
}
