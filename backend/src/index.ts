import * as dotenv from 'dotenv'
dotenv.config()

import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './routes/auth'
import { profileRoutes } from './routes/profiles'
import { locationRoutes } from './routes/locations'
import { sessionRoutes } from './routes/sessions'
import { matchRoutes } from './routes/matches'
import { leaderboardRoutes } from './routes/leaderboards'
import { reportRoutes } from './routes/reports'
import { adminRoutes } from './routes/admin'
import { playerRoutes } from './routes/players'

const server = Fastify({ logger: true })
const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret-at-least-32-chars!!'

server.register(cors, { origin: process.env.FRONTEND_URL || true, credentials: true })
server.register(jwt, { secret: JWT_SECRET })
server.register(rateLimit, { max: 100, timeWindow: '1 minute' })

server.decorate('authenticate', async function(request: any, reply: any) {
  try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
})

server.register(authRoutes, { prefix: '/auth' })
server.register(profileRoutes, { prefix: '/profiles' })
server.register(locationRoutes, { prefix: '/locations' })
server.register(sessionRoutes, { prefix: '/sessions' })
server.register(matchRoutes, { prefix: '/matches' })
server.register(leaderboardRoutes, { prefix: '/leaderboards' })
server.register(reportRoutes, { prefix: '/reports' })
server.register(adminRoutes, { prefix: '/admin' })
server.register(playerRoutes, { prefix: '/players' })

server.get('/health', async () => ({ status: 'ok' }))

const start = async () => {
  try {
    await server.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
    console.log('Ultimate Tennis API running on port', process.env.PORT || 3001)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
