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

    // Total points earned across all challenge events.
    const eventPointsAgg = await prisma.challengeParticipant.aggregate({
      where: { userId },
      _sum: { points: true }
    })

    return { rating, recentMatches, rank, totalRanked, playerNames, eventPoints: eventPointsAgg._sum.points || 0 }
  })

  // Public Event Points leaderboard: total points earned across challenge events.
  server.get('/event-points', async (req) => {
    const limit = Math.min(Number((req.query as any)?.limit) || 20, 50)
    const rows = await prisma.challengeParticipant.groupBy({
      by: ['userId'],
      where: { points: { gt: 0 } },
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
      take: limit
    })
    const ids = rows.map(r => r.userId)
    const profs = await prisma.profile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, displayName: true, photoUrl: true }
    })
    const pmap = new Map(profs.map(p => [p.userId, p]))
    return rows.map(r => ({
      userId: r.userId,
      displayName: pmap.get(r.userId)?.displayName || 'Player',
      photoUrl: pmap.get(r.userId)?.photoUrl || null,
      eventPoints: r._sum.points || 0
    }))
  })
}
