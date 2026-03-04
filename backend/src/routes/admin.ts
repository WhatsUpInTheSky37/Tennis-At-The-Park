import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

async function requireAdmin(req: any, reply: any) {
  if (!req.user?.isAdmin) return reply.status(403).send({ error: 'Admin only' })
}

export async function adminRoutes(server: FastifyInstance) {
  const preHandler = [(server as any).authenticate, requireAdmin]

  server.get('/reports', { preHandler }, async (req) => {
    const q = req.query as any
    const where: any = {}
    if (q.status) where.status = q.status
    return prisma.report.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, include: { reporter: { select: { id: true, profile: { select: { displayName: true } } } } } })
  })

  server.post('/reports/:id/resolve', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    return prisma.report.update({ where: { id }, data: { status } })
  })

  server.post('/users/:id/warn', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { notes } = req.body as { notes?: string }
    return prisma.enforcement.upsert({
      where: { userId: id },
      update: { warningCount: { increment: 1 }, notes: notes || '' },
      create: { userId: id, warningCount: 1, notes: notes || '' }
    })
  })

  server.post('/users/:id/suspend', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { suspended, notes } = req.body as { suspended: boolean, notes?: string }
    return prisma.enforcement.upsert({
      where: { userId: id },
      update: { suspended, notes: notes || '' },
      create: { userId: id, suspended, notes: notes || '' }
    })
  })

  server.post('/disputes/:id/resolve', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status, adminNote } = req.body as { status: string, adminNote?: string }
    const dispute = await prisma.dispute.update({ where: { id }, data: { status } })
    if (status === 'resolved') {
      await prisma.match.update({ where: { id: dispute.matchId }, data: { status: 'normal' } })
    }
    return dispute
  })

  server.get('/disputes', { preHandler }, async () => {
    return prisma.dispute.findMany({
      where: { status: 'open' },
      include: { match: true, opener: { select: { id: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: 'asc' }
    })
  })
}
