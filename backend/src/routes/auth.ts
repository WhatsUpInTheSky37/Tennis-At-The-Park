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
