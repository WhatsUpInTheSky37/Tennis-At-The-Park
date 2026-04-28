import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const postSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  categoryId: z.string().nullable().optional(),
})

const replySchema = z.object({
  body: z.string().min(1).max(2000),
})

const reactionSchema = z.object({
  emoji: z.string().min(1).max(8),
})

const reportSchema = z.object({
  category: z.string().min(1).max(50),
  details: z.string().min(1).max(1000),
})

const ALLOWED_REACTIONS = ['👍', '🔥', '😂', '🎾', '👏', '💯']

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_-]{2,30})/g) || []
  return Array.from(new Set(matches.map(m => m.slice(1).toLowerCase())))
}

async function notifyMentions(text: string, fromUserId: string, postId: string | null, replyId: string | null) {
  const handles = extractMentions(text)
  if (!handles.length) return
  const profiles = await prisma.profile.findMany({
    where: { displayName: { in: handles, mode: 'insensitive' } },
    select: { userId: true },
  })
  const targets = profiles.map(p => p.userId).filter(id => id !== fromUserId)
  if (!targets.length) return
  await prisma.notification.createMany({
    data: targets.map(userId => ({
      userId,
      fromUserId,
      type: 'forum_mention',
      postId,
      replyId,
    })),
  })
}

const postInclude = {
  author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
  category: true,
  reactions: { select: { emoji: true, userId: true } },
  _count: { select: { replies: true } },
}

const replyInclude = {
  author: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } },
  reactions: { select: { emoji: true, userId: true } },
}

export async function forumRoutes(server: FastifyInstance) {
  // Categories
  server.get('/categories', async () => {
    return prisma.forumCategory.findMany({ orderBy: { sortOrder: 'asc' } })
  })

  // List posts with search/sort/category filter
  server.get('/', async (req) => {
    const query = req.query as any
    const take = Math.min(Number(query.limit) || 20, 50)
    const skip = Number(query.offset) || 0
    const search = (query.search || '').trim()
    const categoryId = query.categoryId || undefined
    const sort = query.sort || 'recent'

    const where: any = {}
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ]
    }

    let orderBy: any
    if (sort === 'replies') {
      orderBy = [{ pinned: 'desc' }, { replies: { _count: 'desc' } }, { createdAt: 'desc' }]
    } else if (sort === 'active') {
      orderBy = [{ pinned: 'desc' }, { createdAt: 'desc' }]
    } else {
      orderBy = [{ pinned: 'desc' }, { createdAt: 'desc' }]
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({ where, include: postInclude, orderBy, take, skip }),
      prisma.forumPost.count({ where }),
    ])
    return { posts, total }
  })

  server.get('/recent', async () => {
    return prisma.forumPost.findMany({
      include: postInclude,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 3,
    })
  })

  server.get('/:id', async (req, reply) => {
    const { id } = req.params as any
    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        ...postInclude,
        replies: {
          include: replyInclude,
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
    const post = await prisma.forumPost.create({
      data: {
        userId,
        subject: parsed.data.subject,
        body: parsed.data.body,
        categoryId: parsed.data.categoryId || null,
      },
      include: postInclude,
    })
    await notifyMentions(`${parsed.data.subject} ${parsed.data.body}`, userId, post.id, null)
    return post
  })

  server.delete('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as any
    const { userId } = (req as any).user
    const post = await prisma.forumPost.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
    if (post.userId !== userId && !me?.isAdmin) return reply.status(403).send({ error: 'Not allowed' })
    await prisma.notification.deleteMany({ where: { postId: id } })
    await prisma.forumReaction.deleteMany({ where: { postId: id } })
    await prisma.forumReaction.deleteMany({ where: { reply: { postId: id } } })
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
      data: {
        subject: parsed.data.subject,
        body: parsed.data.body,
        categoryId: parsed.data.categoryId !== undefined ? parsed.data.categoryId : post.categoryId,
        editedAt: new Date(),
      },
      include: {
        ...postInclude,
        replies: { include: replyInclude, orderBy: { createdAt: 'asc' as const } },
      },
    })
  })

  // Pin/unpin (admin only)
  server.post('/:id/pin', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as any
    const { userId } = (req as any).user
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
    if (!me?.isAdmin) return reply.status(403).send({ error: 'Admin only' })
    const post = await prisma.forumPost.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    return prisma.forumPost.update({
      where: { id },
      data: { pinned: !post.pinned },
      include: postInclude,
    })
  })

  // Replies
  server.post('/:id/replies', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as any
    const parsed = replySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const post = await prisma.forumPost.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    const { userId } = (req as any).user
    const created = await prisma.forumReply.create({
      data: { postId: id, userId, body: parsed.data.body },
      include: replyInclude,
    })
    // Notify post author (skip self-replies)
    if (post.userId !== userId) {
      await prisma.notification.create({
        data: {
          userId: post.userId,
          fromUserId: userId,
          type: 'forum_reply',
          postId: id,
          replyId: created.id,
        },
      })
    }
    await notifyMentions(parsed.data.body, userId, id, created.id)
    return created
  })

  server.put('/replies/:replyId', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { replyId } = req.params as any
    const { userId } = (req as any).user
    const parsed = replySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const r = await prisma.forumReply.findUnique({ where: { id: replyId } })
    if (!r) return reply.status(404).send({ error: 'Reply not found' })
    if (r.userId !== userId) return reply.status(403).send({ error: 'Not allowed' })
    return prisma.forumReply.update({
      where: { id: replyId },
      data: { body: parsed.data.body, editedAt: new Date() },
      include: replyInclude,
    })
  })

  server.delete('/replies/:replyId', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { replyId } = req.params as any
    const { userId } = (req as any).user
    const r = await prisma.forumReply.findUnique({ where: { id: replyId } })
    if (!r) return reply.status(404).send({ error: 'Reply not found' })
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
    if (r.userId !== userId && !me?.isAdmin) return reply.status(403).send({ error: 'Not allowed' })
    await prisma.notification.deleteMany({ where: { replyId } })
    await prisma.forumReaction.deleteMany({ where: { replyId } })
    await prisma.forumReply.delete({ where: { id: replyId } })
    return { ok: true }
  })

  // Reactions on posts
  server.post('/:id/reactions', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as any
    const parsed = reactionSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!ALLOWED_REACTIONS.includes(parsed.data.emoji)) return reply.status(400).send({ error: 'Invalid reaction' })
    const post = await prisma.forumPost.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    const { userId } = (req as any).user
    const existing = await prisma.forumReaction.findFirst({ where: { userId, postId: id, emoji: parsed.data.emoji } })
    if (existing) {
      await prisma.forumReaction.delete({ where: { id: existing.id } })
      return { toggled: 'off', emoji: parsed.data.emoji }
    }
    await prisma.forumReaction.create({ data: { userId, postId: id, emoji: parsed.data.emoji } })
    return { toggled: 'on', emoji: parsed.data.emoji }
  })

  // Reactions on replies
  server.post('/replies/:replyId/reactions', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { replyId } = req.params as any
    const parsed = reactionSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!ALLOWED_REACTIONS.includes(parsed.data.emoji)) return reply.status(400).send({ error: 'Invalid reaction' })
    const r = await prisma.forumReply.findUnique({ where: { id: replyId } })
    if (!r) return reply.status(404).send({ error: 'Reply not found' })
    const { userId } = (req as any).user
    const existing = await prisma.forumReaction.findFirst({ where: { userId, replyId, emoji: parsed.data.emoji } })
    if (existing) {
      await prisma.forumReaction.delete({ where: { id: existing.id } })
      return { toggled: 'off', emoji: parsed.data.emoji }
    }
    await prisma.forumReaction.create({ data: { userId, replyId, emoji: parsed.data.emoji } })
    return { toggled: 'on', emoji: parsed.data.emoji }
  })

  // Report a post
  server.post('/:id/report', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as any
    const parsed = reportSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const post = await prisma.forumPost.findUnique({ where: { id }, select: { userId: true } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    const { userId } = (req as any).user
    return prisma.report.create({
      data: {
        reporterUser: userId,
        reportedUser: post.userId,
        forumPostId: id,
        category: parsed.data.category,
        details: parsed.data.details,
      },
    })
  })

  // Report a reply
  server.post('/replies/:replyId/report', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { replyId } = req.params as any
    const parsed = reportSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const r = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { userId: true } })
    if (!r) return reply.status(404).send({ error: 'Reply not found' })
    const { userId } = (req as any).user
    return prisma.report.create({
      data: {
        reporterUser: userId,
        reportedUser: r.userId,
        forumReplyId: replyId,
        category: parsed.data.category,
        details: parsed.data.details,
      },
    })
  })
}
