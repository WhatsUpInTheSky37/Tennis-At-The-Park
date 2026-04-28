import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const articleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).optional(),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(1),
  coverImage: z.string().url().nullable().optional(),
  published: z.boolean().optional(),
})

const reactionSchema = z.object({
  emoji: z.string().min(1).max(8),
})

const ALLOWED_REACTIONS = ['👍', '🔥', '😂', '🎾', '👏', '💯']

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
          publishedAt: true, createdAt: true,
          author: { select: authorSelect },
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
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    })
  })

  // PUBLIC: detail by slug
  server.get('/by-slug/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string }
    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: authorSelect },
        reactions: { select: { emoji: true, userId: true } },
      },
    })
    if (!article || !article.published) return reply.status(404).send({ error: 'Not found' })
    return article
  })

  // PUBLIC (auth-required): toggle a reaction on an article
  server.post('/:id/reactions', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = reactionSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!ALLOWED_REACTIONS.includes(parsed.data.emoji)) {
      return reply.status(400).send({ error: 'Invalid reaction' })
    }
    const article = await prisma.article.findUnique({ where: { id }, select: { id: true, published: true } })
    if (!article || !article.published) return reply.status(404).send({ error: 'Not found' })
    const { userId } = (req as any).user
    const existing = await prisma.articleReaction.findFirst({
      where: { userId, articleId: id, emoji: parsed.data.emoji },
    })
    if (existing) {
      await prisma.articleReaction.delete({ where: { id: existing.id } })
      return { toggled: 'off', emoji: parsed.data.emoji }
    }
    await prisma.articleReaction.create({
      data: { userId, articleId: id, emoji: parsed.data.emoji },
    })
    return { toggled: 'on', emoji: parsed.data.emoji }
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
    await prisma.article.delete({ where: { id } })
    return { ok: true }
  })
}
