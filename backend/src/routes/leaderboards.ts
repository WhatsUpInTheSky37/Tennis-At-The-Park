import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/', async () => {
    const [byElo, byWins, byStreak] = await Promise.all([
      prisma.rating.findMany({
        orderBy: { elo: 'desc' },
        take: 20,
        include: { user: { select: { id: true, profile: { select: { displayName: true, photoUrl: true, skillLevel: true } } } } }
      }),
      prisma.rating.findMany({
        orderBy: { wins: 'desc' },
        take: 20,
        include: { user: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } } }
      }),
      prisma.rating.findMany({
        orderBy: { currentStreak: 'desc' },
        take: 20,
        include: { user: { select: { id: true, profile: { select: { displayName: true, photoUrl: true } } } } }
      })
    ])
    return { byElo, byWins, byStreak }
  })

  server.get('/stats/:userId', async (req) => {
    const { userId } = req.params as { userId: string }
    const rating = await prisma.rating.findUnique({ where: { userId } })
    const recentMatches = await prisma.match.findMany({
      where: {
        status: 'normal',
        teamsJson: { path: ['team1'], array_contains: [userId] }
      },
      orderBy: { playedAt: 'desc' },
      take: 10,
      include: { location: true }
    })
    return { rating, recentMatches }
  })
}
