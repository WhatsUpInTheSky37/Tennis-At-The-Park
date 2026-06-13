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
    const profiles = await prisma.profile.findMany({
      where,
      include: { user: { select: { id: true, lastActive: true, rating: true } } },
      take: 30
    })

    // Attach challenge podium medals (gold/silver/bronze) from completed events.
    const userIds = profiles.map(p => p.userId)
    const medalRows = userIds.length
      ? await prisma.challengeParticipant.findMany({
          where: { userId: { in: userIds }, finalRank: { in: [1, 2, 3] }, event: { status: 'completed' } },
          select: { userId: true, finalRank: true }
        })
      : []
    const medalMap: Record<string, { gold: number; silver: number; bronze: number }> = {}
    for (const m of medalRows) {
      const e = (medalMap[m.userId] ||= { gold: 0, silver: 0, bronze: 0 })
      if (m.finalRank === 1) e.gold++
      else if (m.finalRank === 2) e.silver++
      else if (m.finalRank === 3) e.bronze++
    }

    // Total event points earned across challenge events.
    const pointRows = userIds.length
      ? await prisma.challengeParticipant.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds }, points: { gt: 0 } },
          _sum: { points: true }
        })
      : []
    const pointMap = new Map(pointRows.map(r => [r.userId, r._sum.points || 0]))

    return profiles.map(p => ({
      ...p,
      medals: medalMap[p.userId] || { gold: 0, silver: 0, bronze: 0 },
      eventPoints: pointMap.get(p.userId) || 0
    }))
  })
}
