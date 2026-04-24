import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function playerRoutes(server: FastifyInstance) {
  server.get('/', async (req) => {
    const q = req.query as any
    const where: any = {}
    if (q.lookingToPlay === 'true') {
      where.lookingToPlay = true
    }
    if (q.skill) {
      where.skillLevel = { gte: Number(q.skill) - 0.5, lte: Number(q.skill) + 0.5 }
    }
    if (q.minSkill) {
      where.skillLevel = { ...where.skillLevel, gte: Number(q.minSkill) }
    }
    if (q.maxSkill) {
      where.skillLevel = { ...where.skillLevel, lte: Number(q.maxSkill) }
    }
    if (q.search) {
      where.displayName = { contains: q.search, mode: 'insensitive' }
    }
    if (q.format) {
      where.preferredFormats = { has: q.format }
    }
    return prisma.profile.findMany({
      where,
      include: { user: { select: { id: true, rating: true } } },
      take: 30
    })
  })
}
