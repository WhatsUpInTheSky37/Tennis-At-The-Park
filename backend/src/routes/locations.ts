import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function locationRoutes(server: FastifyInstance) {
  server.get('/', async () => {
    return prisma.location.findMany()
  })
}
