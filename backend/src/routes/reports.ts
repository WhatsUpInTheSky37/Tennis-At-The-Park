import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const schema = z.object({
  reportedUser: z.string().optional(),
  messageId: z.string().optional(),
  matchId: z.string().optional(),
  sessionId: z.string().optional(),
  category: z.enum(['harassment', 'sandbagging', 'no_show', 'dishonest_score', 'spam', 'safety', 'other']),
  details: z.string().min(10).max(1000)
})

export async function reportRoutes(server: FastifyInstance) {
  server.post('/', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const body = schema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const report = await prisma.report.create({ data: { ...body.data, reporterUser: userId } })
    return reply.status(201).send(report)
  })
}
