import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const articleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).optional(),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(1),
  // Accept either a full URL (pasted) or a relative path like
  // /uploads/articles/... returned by the image upload endpoint.
  coverImage: z.string()
    .max(2000)
    .refine(v => /^https?:\/\//i.test(v) || v.startsWith('/'), {
      message: 'Cover image must be a valid URL or an uploaded image path',
    })
    .nullable()
    .optional(),
  published: z.boolean().optional(),
})

const commentSchema = z.object({
  body: z.string().min(1).max(2000),
  parentId: z.string().nullable().optional(),
})

const commentEditSchema = z.object({
  body: z.string().min(1).max(2000),
})

const reportSchema = z.object({
  category: z.string().min(1).max(50),
  details: z.string().min(1).max(1000),
})

const commentAuthorSelect = {
  id: true,
  isAdmin: true,
  profile: { select: { displayName: true, photoUrl: true } },
}

function slugify(s: string): string {
  return s.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'article'
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base
  let n = 1
  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug } })
    if (!existing || existing.id === excludeId) return slug
    n++
    slug = `${base}-${n}`
  }
}

async function requireAdmin(req: any, reply: any) {
  if (!req.user?.isAdmin) return reply.status(403).send({ error: 'Admin only' })
}

const authorSelect = { id: true, profile: { select: { displayName: true, photoUrl: true } } }

export async function articleRoutes(server: FastifyInstance) {
  // PUBLIC: list published articles
  server.get('/', async (req) => {
    const q = req.query as any
    const take = Math.min(Number(q.limit) || 20, 50)
    const skip = Number(q.offset) || 0
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where: { published: true },
        select: {
          id: true, slug: true, title: true, excerpt: true, coverImage: true,
          publishedAt: true, createdAt: true, viewCount: true,
          author: { select: authorSelect },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take, skip,
      }),
      prisma.article.count({ where: { published: true } }),
    ])
    return { articles, total }
  })

  // PUBLIC: latest published articles (homepage)
  server.get('/latest', async () => {
    return prisma.article.findMany({
      where: { published: true },
      select: {
        id: true, slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true,
        viewCount: true,
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 4,
    })
  })

  // PUBLIC: detail by slug. Includes viewer's-liked state when authenticated.
  server.get('/by-slug/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string }
    let viewerId: string | null = null
    try {
      await (req as any).jwtVerify()
      viewerId = (req as any).user?.userId || null
    } catch { /* anonymous */ }
    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
        ...(viewerId
          ? { likes: { where: { userId: viewerId }, select: { userId: true } } }
          : {}),
      },
    })
    if (!article || !article.published) return reply.status(404).send({ error: 'Not found' })
    const likedByMe = viewerId ? (article as any).likes?.length > 0 : false
    const { likes, ...rest } = article as any
    return { ...rest, likedByMe }
  })

  // PUBLIC: increment view count (called once per page load)
  server.post('/:id/view', async (req, reply) => {
    const { id } = req.params as { id: string }
    const article = await prisma.article.findUnique({ where: { id }, select: { id: true, published: true } })
    if (!article || !article.published) return reply.status(404).send({ error: 'Not found' })
    const updated = await prisma.article.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    })
    return updated
  })

  // AUTH: toggle a like on an article
  server.post('/:id/like', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId } = (req as any).user
    const article = await prisma.article.findUnique({ where: { id }, select: { id: true, published: true } })
    if (!article || !article.published) return reply.status(404).send({ error: 'Not found' })
    const existing = await prisma.articleLike.findUnique({
      where: { articleId_userId: { articleId: id, userId } },
    })
    if (existing) {
      await prisma.articleLike.delete({ where: { articleId_userId: { articleId: id, userId } } })
    } else {
      await prisma.articleLike.create({ data: { articleId: id, userId } })
    }
    const count = await prisma.articleLike.count({ where: { articleId: id } })
    return { liked: !existing, count }
  })

  // ADMIN: list ALL (drafts + published)
  server.get('/admin/all', { preHandler: [(server as any).authenticate, requireAdmin] }, async () => {
    return prisma.article.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { author: { select: authorSelect } },
    })
  })

  // ADMIN: get single (incl drafts)
  server.get('/admin/:id', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const article = await prisma.article.findUnique({
      where: { id },
      include: { author: { select: authorSelect } },
    })
    if (!article) return reply.status(404).send({ error: 'Not found' })
    return article
  })

  // ADMIN: create
  server.post('/', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req, reply) => {
    const parsed = articleSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const { userId } = (req as any).user
    const baseSlug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.title)
    const slug = await uniqueSlug(baseSlug)
    const willPublish = parsed.data.published === true
    return prisma.article.create({
      data: {
        authorId: userId,
        slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt || '',
        body: parsed.data.body,
        coverImage: parsed.data.coverImage || null,
        published: willPublish,
        publishedAt: willPublish ? new Date() : null,
      },
      include: { author: { select: authorSelect } },
    })
  })

  // ADMIN: update
  server.put('/:id', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = articleSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })

    let slug = existing.slug
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      slug = await uniqueSlug(slugify(parsed.data.slug), id)
    }

    const nextPublished = parsed.data.published ?? existing.published
    const publishedAt = nextPublished
      ? (existing.publishedAt || new Date())
      : null

    return prisma.article.update({
      where: { id },
      data: {
        slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt || '',
        body: parsed.data.body,
        coverImage: parsed.data.coverImage ?? existing.coverImage,
        published: nextPublished,
        publishedAt,
      },
      include: { author: { select: authorSelect } },
    })
  })

  // ADMIN: toggle publish
  server.post('/:id/publish', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    const nextPublished = !existing.published
    return prisma.article.update({
      where: { id },
      data: {
        published: nextPublished,
        publishedAt: nextPublished ? (existing.publishedAt || new Date()) : null,
      },
    })
  })

  // ADMIN: delete
  server.delete('/:id', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    await prisma.$transaction(async (tx) => {
      const comments = await tx.articleComment.findMany({ where: { articleId: id }, select: { id: true } })
      const commentIds = comments.map(c => c.id)
      if (commentIds.length) {
        await tx.report.updateMany({ where: { articleCommentId: { in: commentIds } }, data: { articleCommentId: null } })
        await tx.articleComment.deleteMany({ where: { articleId: id } })
      }
      await tx.articleLike.deleteMany({ where: { articleId: id } })
      await tx.article.delete({ where: { id } })
    })
    return { ok: true }
  })

  // PUBLIC: list visible comments for an article (threaded)
  // Admins (when sending a valid JWT) also see hidden comments.
  server.get('/:articleId/comments', async (req, reply) => {
    const { articleId } = req.params as { articleId: string }
    let isAdmin = false
    try {
      await (req as any).jwtVerify()
      isAdmin = !!(req as any).user?.isAdmin
    } catch { /* anonymous viewer */ }
    const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true, published: true } })
    if (!article) return reply.status(404).send({ error: 'Article not found' })
    if (!article.published && !isAdmin) return reply.status(404).send({ error: 'Article not found' })
    const where: any = { articleId }
    if (!isAdmin) where.hidden = false
    const comments = await prisma.articleComment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { author: { select: commentAuthorSelect } },
    })
    return comments
  })

  // AUTH: post a comment (or reply) to an article
  server.post('/:articleId/comments', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { articleId } = req.params as { articleId: string }
    const parsed = commentSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const { userId } = (req as any).user
    const article = await prisma.article.findUnique({ where: { id: articleId }, select: { published: true } })
    if (!article || !article.published) return reply.status(404).send({ error: 'Article not found' })

    // Block suspended users
    const enf = await prisma.enforcement.findUnique({ where: { userId } })
    if (enf?.suspended) return reply.status(403).send({ error: 'Your account is suspended.' })
    if (enf?.cooldownUntil && enf.cooldownUntil > new Date()) {
      return reply.status(403).send({ error: 'You are in cooldown. Try again later.' })
    }

    let parentId: string | null = null
    if (parsed.data.parentId) {
      const parent = await prisma.articleComment.findUnique({
        where: { id: parsed.data.parentId },
        select: { id: true, articleId: true, parentId: true, hidden: true },
      })
      if (!parent || parent.articleId !== articleId) {
        return reply.status(400).send({ error: 'Invalid parent comment' })
      }
      if (parent.hidden) return reply.status(400).send({ error: 'Cannot reply to hidden comment' })
      // Flatten one level: a reply's parent is always a top-level comment
      parentId = parent.parentId || parent.id
    }

    return prisma.articleComment.create({
      data: { articleId, userId, parentId, body: parsed.data.body },
      include: { author: { select: commentAuthorSelect } },
    })
  })

  // AUTH: edit own comment
  server.put('/comments/:commentId', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { commentId } = req.params as { commentId: string }
    const parsed = commentEditSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const { userId } = (req as any).user
    const c = await prisma.articleComment.findUnique({ where: { id: commentId } })
    if (!c) return reply.status(404).send({ error: 'Comment not found' })
    if (c.userId !== userId) return reply.status(403).send({ error: 'You can only edit your own comments' })
    return prisma.articleComment.update({
      where: { id: commentId },
      data: { body: parsed.data.body, editedAt: new Date() },
      include: { author: { select: commentAuthorSelect } },
    })
  })

  // AUTH: delete own comment (or admin)
  server.delete('/comments/:commentId', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { commentId } = req.params as { commentId: string }
    const { userId, isAdmin } = (req as any).user
    const c = await prisma.articleComment.findUnique({ where: { id: commentId } })
    if (!c) return reply.status(404).send({ error: 'Comment not found' })
    if (c.userId !== userId && !isAdmin) return reply.status(403).send({ error: 'Not allowed' })
    await prisma.$transaction(async (tx) => {
      const replyIds = (await tx.articleComment.findMany({ where: { parentId: commentId }, select: { id: true } })).map(r => r.id)
      const allIds = [commentId, ...replyIds]
      await tx.report.updateMany({ where: { articleCommentId: { in: allIds } }, data: { articleCommentId: null } })
      await tx.articleComment.deleteMany({ where: { parentId: commentId } })
      await tx.articleComment.delete({ where: { id: commentId } })
    })
    return { ok: true }
  })

  // ADMIN: hide/unhide a comment (soft moderation)
  server.post('/comments/:commentId/hide', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req, reply) => {
    const { commentId } = req.params as { commentId: string }
    const c = await prisma.articleComment.findUnique({ where: { id: commentId } })
    if (!c) return reply.status(404).send({ error: 'Comment not found' })
    return prisma.articleComment.update({
      where: { id: commentId },
      data: { hidden: !c.hidden },
      include: { author: { select: commentAuthorSelect } },
    })
  })

  // AUTH: report a comment
  server.post('/comments/:commentId/report', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { commentId } = req.params as { commentId: string }
    const parsed = reportSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const c = await prisma.articleComment.findUnique({ where: { id: commentId }, select: { userId: true } })
    if (!c) return reply.status(404).send({ error: 'Comment not found' })
    const { userId } = (req as any).user
    return prisma.report.create({
      data: {
        reporterUser: userId,
        reportedUser: c.userId,
        articleCommentId: commentId,
        category: parsed.data.category,
        details: parsed.data.details,
      },
    })
  })
}
