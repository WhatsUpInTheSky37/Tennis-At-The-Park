import { FastifyInstance } from 'fastify'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/gif':  '.gif',
  'image/webp': '.webp',
}

async function requireAdmin(req: any, reply: any) {
  if (!req.user?.isAdmin) return reply.status(403).send({ error: 'Admin only' })
}

export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads')

export async function uploadRoutes(server: FastifyInstance) {
  // Ensure target directory exists
  const articlesDir = path.join(UPLOADS_DIR, 'articles')
  fs.mkdirSync(articlesDir, { recursive: true })

  server.post('/articles/image', { preHandler: [(server as any).authenticate, requireAdmin] }, async (req, reply) => {
    const file = await (req as any).file()
    if (!file) return reply.status(400).send({ error: 'No file uploaded' })

    if (!ALLOWED_MIME.has(file.mimetype)) {
      return reply.status(400).send({ error: 'Only JPEG, PNG, GIF, or WebP images are allowed' })
    }

    const ext = EXT_FOR_MIME[file.mimetype]
    const id = crypto.randomBytes(8).toString('hex')
    const date = new Date().toISOString().slice(0, 10)
    const filename = `${date}-${id}${ext}`
    const fullPath = path.join(articlesDir, filename)

    try {
      await pipeline(file.file, fs.createWriteStream(fullPath))
    } catch (err: any) {
      try { fs.unlinkSync(fullPath) } catch {}
      return reply.status(500).send({ error: 'Upload failed' })
    }

    if ((file.file as any).truncated) {
      try { fs.unlinkSync(fullPath) } catch {}
      return reply.status(413).send({ error: 'File too large (max 8 MB)' })
    }

    return { url: `/uploads/articles/${filename}`, filename }
  })
}
