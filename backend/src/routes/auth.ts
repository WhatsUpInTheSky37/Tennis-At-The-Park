import { FastifyInstance } from 'fastify'
import argon2 from 'argon2'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(50)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

export async function authRoutes(server: FastifyInstance) {
  server.post('/register', async (req, reply) => {
    const body = registerSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const { email, password, displayName } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return reply.status(409).send({ error: 'Email already registered' })

    const passwordHash = await argon2.hash(password)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: { create: { displayName } },
        rating: { create: {} },
        enforcement: { create: {} }
      },
      include: { profile: true }
    })

    const token = server.jwt.sign({ userId: user.id, email: user.email, isAdmin: user.isAdmin })
    return { token, user: { id: user.id, email: user.email, displayName: user.profile?.displayName, isAdmin: user.isAdmin } }
  })

  server.post('/login', async (req, reply) => {
    const body = loginSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const { email, password } = body.data

    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } })
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const token = server.jwt.sign({ userId: user.id, email: user.email, isAdmin: user.isAdmin })
    return { token, user: { id: user.id, email: user.email, displayName: user.profile?.displayName, isAdmin: user.isAdmin } }
  })

  // Change password (logged-in users)
  server.post('/change-password', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8)
    })
    const body = schema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const valid = await argon2.verify(user.passwordHash, body.data.currentPassword)
    if (!valid) return reply.status(401).send({ error: 'Current password is incorrect' })

    const newHash = await argon2.hash(body.data.newPassword)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } })
    return { ok: true }
  })

  // Reset password by email (no auth required)
  server.post('/reset-password', async (req, reply) => {
    const schema = z.object({
      email: z.string().email(),
      newPassword: z.string().min(8)
    })
    const body = schema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (!user) {
      // Don't reveal whether email exists - return success either way
      return { ok: true }
    }

    const newHash = await argon2.hash(body.data.newPassword)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })
    return { ok: true }
  })

  server.get('/me', { preHandler: [(server as any).authenticate] }, async (req) => {
    const { userId } = (req as any).user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, rating: true, enforcement: true }
    })
    if (!user) throw new Error('User not found')
    return {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      profile: user.profile,
      rating: user.rating,
      enforcement: user.enforcement
    }
  })
}
