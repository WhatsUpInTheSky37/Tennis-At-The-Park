import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const postSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
})

const replySchema = z.object({
  body: z.string().min(1).max(2000),
})

export async function forumRoutes(server: FastifyInstance) {
  server.get('/', async (req) => {
    const query = req.query as any
    const take = Math.min(Number(query.limit) || 20, 50)
    const skip = Number(query.offset) || 0
    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        include: {
          author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.forumPost.count(),
    ])
    return { posts, total }
  })

  server.get('/recent', async () => {
    return prisma.forumPost.findMany({
      include: {
        author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })
  })

  server.get('/:id', async (req, reply) => {
    const { id } = req.params as any
    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
        replies: {
          include: {
            author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    return post
  })

  server.post('/', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const parsed = postSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const { userId } = (req as any).user
    return prisma.forumPost.create({
      data: { userId, subject: parsed.data.subject, body: parsed.data.body },
      include: {
        author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
      },
    })
  })

  server.delete('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as any
    const { userId } = (req as any).user
    const post = await prisma.forumPost.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    if (post.userId !== userId) return reply.status(403).send({ error: 'You can only delete your own posts' })
    await prisma.forumReply.deleteMany({ where: { postId: id } })
    await prisma.forumPost.delete({ where: { id } })
    return { ok: true }
  })

  server.put('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as any
    const { userId } = (req as any).user
    const parsed = postSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const post = await prisma.forumPost.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    if (post.userId !== userId) return reply.status(403).send({ error: 'You can only edit your own posts' })
    return prisma.forumPost.update({
      where: { id },
      data: { subject: parsed.data.subject, body: parsed.data.body },
      include: {
        author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
        replies: {
          include: {
            author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
          },
          orderBy: { createdAt: 'asc' as const },
        },
      },
    })
  })

  server.post('/:id/replies', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as any
    const parsed = replySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const post = await prisma.forumPost.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    const { userId } = (req as any).user
    return prisma.forumReply.create({
      data: { postId: id, userId, body: parsed.data.body },
      include: {
        author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
      },
    })
  })
}
