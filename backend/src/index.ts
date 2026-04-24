import * as dotenv from 'dotenv'
dotenv.config()

import path from 'path'
import fs from 'fs'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import { authRoutes } from './routes/auth'
import { profileRoutes } from './routes/profiles'
import { locationRoutes } from './routes/locations'
import { sessionRoutes } from './routes/sessions'
import { matchRoutes } from './routes/matches'
import { leaderboardRoutes } from './routes/leaderboards'
import { reportRoutes } from './routes/reports'
import { adminRoutes } from './routes/admin'
import { playerRoutes } from './routes/players'
import { challengeRoutes } from './routes/challenges'
import inviteRoutes from './routes/invites'
import { forumRoutes } from './routes/forum'

const server = Fastify({ logger: true })
const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret-at-least-32-chars!!'

server.register(cors, { origin: process.env.FRONTEND_URL || true, credentials: true })
server.register(jwt, { secret: JWT_SECRET })
server.register(rateLimit, { max: 100, timeWindow: '1 minute' })

server.decorate('authenticate', async function(request: any, reply: any) {
  try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
})

// API routes - served under both /path and /api/path for compatibility
const apiRoutes = [
  { plugin: authRoutes, prefix: '/auth' },
  { plugin: profileRoutes, prefix: '/profiles' },
  { plugin: locationRoutes, prefix: '/locations' },
  { plugin: sessionRoutes, prefix: '/sessions' },
  { plugin: matchRoutes, prefix: '/matches' },
  { plugin: leaderboardRoutes, prefix: '/leaderboards' },
  { plugin: reportRoutes, prefix: '/reports' },
  { plugin: adminRoutes, prefix: '/admin' },
  { plugin: playerRoutes, prefix: '/players' },
  { plugin: challengeRoutes, prefix: '/challenges' },
  { plugin: inviteRoutes, prefix: '/invites' },
  { plugin: forumRoutes, prefix: '/forum' },
]

for (const route of apiRoutes) {
  server.register(route.plugin, { prefix: route.prefix })
  server.register(route.plugin, { prefix: `/api${route.prefix}` })
}

server.get('/health', async () => ({ status: 'ok' }))
server.get('/api/health', async () => ({ status: 'ok' }))

// Serve frontend static files in production (combined deploy)
const frontendDir = path.join(__dirname, '..', 'public')
if (fs.existsSync(frontendDir)) {
  server.register(fastifyStatic, {
    root: frontendDir,
    prefix: '/',
    wildcard: false
  })
  server.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html', frontendDir)
  })
}

const start = async () => {
  try {
    await server.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
    console.log('Tennis at the Park API running on port', process.env.PORT || 3001)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
