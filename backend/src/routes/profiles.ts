import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const updateSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  skillLevel: z.number().min(1).max(7).optional(),
  handedness: z.enum(['right', 'left', 'ambidextrous']).optional(),
  bio: z.string().max(500).optional(),
  lookingToPlay: z.boolean().optional(),
  availabilityJson: z.any().optional(),
  photoUrl: z.string().optional().nullable().transform(v => (!v || v === '') ? null : v),
  preferredFormats: z.array(z.string()).optional(),
  yearsPlaying: z.number().int().min(0).max(80).optional().nullable(),
  favoritePro: z.string().max(100).optional().nullable().transform(v => (!v || v === '') ? null : v),
  phone: z.string().max(20).optional().nullable().transform(v => (!v || v === '') ? null : v),
  okToText: z.boolean().optional(),
  availability: z.array(z.string()).optional()
})

export async function profileRoutes(server: FastifyInstance) {
  server.get('/me', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    return prisma.profile.findUnique({ where: { userId } })
  })

  server.put('/me', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const body = updateSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    return prisma.profile.update({ where: { userId }, data: body.data })
  })

  server.get('/:userId', async (req) => {
    const { userId } = req.params as { userId: string }
    return prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, createdAt: true } } }
    })
  })
}
