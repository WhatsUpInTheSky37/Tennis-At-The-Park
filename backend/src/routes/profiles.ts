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
  isInstructor: z.boolean().optional(),
  acceptingClients: z.boolean().optional(),
  availability: z.array(z.string()).optional()
})

const notificationPrefsSchema = z.object({
  dms: z.boolean().optional(),
  forumReplies: z.boolean().optional(),
  forumReactions: z.boolean().optional(),
  challenges: z.boolean().optional(),
  sessionInvites: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
})

export const NOTIFICATION_PREF_DEFAULTS = {
  dms: true,
  forumReplies: true,
  forumReactions: true,
  challenges: true,
  sessionInvites: true,
  emailNotifications: true,
}

export async function getNotificationPrefs(userId: string) {
  const existing = await prisma.notificationPreferences.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.notificationPreferences.create({ data: { userId } })
}

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

  // Notification preferences (lazy-created with defaults the first time)
  server.get('/me/notifications', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    return getNotificationPrefs(userId)
  })

  server.put('/me/notifications', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const body = notificationPrefsSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    return prisma.notificationPreferences.upsert({
      where: { userId },
      update: body.data,
      create: { userId, ...body.data },
    })
  })

  server.get('/:userId', async (req) => {
    const { userId } = req.params as { userId: string }
    return prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, createdAt: true } } }
    })
  })
}
