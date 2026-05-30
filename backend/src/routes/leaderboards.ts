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

    // Matches where the player was on either side.
    const recentMatches = await prisma.match.findMany({
      where: {
        status: 'normal',
        OR: [
          { teamsJson: { path: ['team1'], array_contains: [userId] } },
          { teamsJson: { path: ['team2'], array_contains: [userId] } }
        ]
      },
      orderBy: { playedAt: 'desc' },
      take: 10,
      include: { location: true }
    })

    // Community Elo rank among players who have actually played.
    let rank: number | null = null
    let totalRanked = 0
    if (rating && rating.matchesPlayed > 0) {
      totalRanked = await prisma.rating.count({ where: { matchesPlayed: { gt: 0 } } })
      const ahead = await prisma.rating.count({ where: { matchesPlayed: { gt: 0 }, elo: { gt: rating.elo } } })
      rank = ahead + 1
    } else {
      totalRanked = await prisma.rating.count({ where: { matchesPlayed: { gt: 0 } } })
    }

    // Resolve player names for the recent matches.
    const ids = new Set<string>()
    for (const m of recentMatches) {
      const t = m.teamsJson as { team1?: string[]; team2?: string[] }
      for (const uid of [...(t.team1 || []), ...(t.team2 || [])]) ids.add(uid)
    }
    const profs = await prisma.profile.findMany({
      where: { userId: { in: Array.from(ids) } },
      select: { userId: true, displayName: true }
    })
    const playerNames: Record<string, string> = {}
    for (const p of profs) playerNames[p.userId] = p.displayName

    return { rating, recentMatches, rank, totalRanked, playerNames }
  })
}
