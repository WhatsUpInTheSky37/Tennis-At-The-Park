import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { calcElo } from '../lib/elo'
import { checkEnforcement } from '../middleware/auth'

const createSchema = z.object({
  sessionId: z.string().optional().nullable(),
  playedAt: z.string().datetime(),
  locationId: z.string(),
  courtNumber: z.number().int().optional().nullable(),
  format: z.enum(['singles', 'doubles']),
  teamsJson: z.any(),
  scoreJson: z.any(),
  winnerUserIdsJson: z.array(z.string()),
  retiredFlag: z.boolean().default(false),
  timeRanOutFlag: z.boolean().default(false),
  notes: z.string().max(500).default('')
})

async function applyEloUpdates(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match || match.status !== 'normal') return

  const winners = match.winnerUserIdsJson as string[]
  const teams = match.teamsJson as { team1: string[], team2: string[] }
  const losers = (winners[0] === teams.team1[0]) ? teams.team2 : teams.team1

  // For simplicity, handle singles (one winner, one loser)
  if (winners.length === 1 && losers.length === 1) {
    const [wRating, lRating] = await Promise.all([
      prisma.rating.findUnique({ where: { userId: winners[0] } }),
      prisma.rating.findUnique({ where: { userId: losers[0] } })
    ])
    if (!wRating || !lRating) return
    const { newWinnerElo, newLoserElo } = calcElo(wRating.elo, lRating.elo, wRating.matchesPlayed, lRating.matchesPlayed)
    await prisma.rating.update({ where: { userId: winners[0] }, data: { elo: newWinnerElo, matchesPlayed: { increment: 1 }, wins: { increment: 1 }, currentStreak: { increment: 1 } } })
    await prisma.rating.update({ where: { userId: losers[0] }, data: { elo: newLoserElo, matchesPlayed: { increment: 1 }, losses: { increment: 1 }, currentStreak: 0 } })
  }
}

export async function matchRoutes(server: FastifyInstance) {
  server.get('/', async (req) => {
    const query = req.query as any
    const where: any = {}
    if (query.userId) {
      where.teamsJson = { path: '$.team1', array_contains: query.userId }
    }
    const matches = await prisma.match.findMany({
      where,
      include: { location: true },
      orderBy: { playedAt: 'desc' },
      take: 50
    })

    // Resolve player names from teamsJson
    const allPlayerIds = new Set<string>()
    for (const m of matches) {
      const teams = m.teamsJson as { team1: string[], team2: string[] }
      for (const id of [...teams.team1, ...teams.team2]) allPlayerIds.add(id)
    }
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: Array.from(allPlayerIds) } },
      select: { userId: true, displayName: true }
    })
    const nameMap: Record<string, string> = {}
    for (const p of profiles) nameMap[p.userId] = p.displayName

    return matches.map(m => ({ ...m, playerNames: nameMap }))
  })

  server.post('/', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    if (!await checkEnforcement(userId, reply)) return
    const body = createSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const data = body.data

    // Verify current user is one of the players
    const teams = data.teamsJson as { team1: string[], team2: string[] }
    const allPlayers = [...teams.team1, ...teams.team2]
    if (!allPlayers.includes(userId)) return reply.status(403).send({ error: 'You must be in the match' })

    const match = await prisma.match.create({
      data: {
        locationId: data.locationId,
        courtNumber: data.courtNumber ?? null,
        sessionId: data.sessionId ?? null,
        playedAt: new Date(data.playedAt),
        format: data.format,
        teamsJson: data.teamsJson,
        scoreJson: data.scoreJson,
        winnerUserIdsJson: data.winnerUserIdsJson,
        retiredFlag: data.retiredFlag,
        timeRanOutFlag: data.timeRanOutFlag,
        notes: data.notes,
        status: 'pending_confirmation'
      }
    })

    return reply.status(201).send(match)
  })

  server.post('/:id/confirm', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const match = await prisma.match.findUnique({ where: { id } })
    if (!match) return reply.status(404).send({ error: 'Not found' })
    const teams = match.teamsJson as { team1: string[], team2: string[] }
    if (![...teams.team1, ...teams.team2].includes(userId)) return reply.status(403).send({ error: 'Not in match' })
    if (match.status === 'disputed') return reply.status(400).send({ error: 'Match is disputed' })

    await prisma.match.update({ where: { id }, data: { status: 'normal' } })
    await applyEloUpdates(id)
    return { ok: true }
  })

  server.post('/:id/dispute', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const { reason, details } = req.body as { reason: string, details: string }
    const match = await prisma.match.findUnique({ where: { id } })
    if (!match) return reply.status(404).send({ error: 'Not found' })
    const teams = match.teamsJson as { team1: string[], team2: string[] }
    if (![...teams.team1, ...teams.team2].includes(userId)) return reply.status(403).send({ error: 'Not in match' })

    await prisma.match.update({ where: { id }, data: { status: 'disputed' } })
    const dispute = await prisma.dispute.create({ data: { matchId: id, openedBy: userId, reason, details } })
    return reply.status(201).send(dispute)
  })

  server.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const match = await prisma.match.findUnique({ where: { id }, include: { location: true, disputes: true } })
    if (!match) return reply.status(404).send({ error: 'Not found' })
    return match
  })

  // Delete/cancel a match (only by a player in the match, only if pending)
  server.delete('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const match = await prisma.match.findUnique({ where: { id } })
    if (!match) return reply.status(404).send({ error: 'Not found' })

    const teams = match.teamsJson as { team1: string[], team2: string[] }
    if (![...teams.team1, ...teams.team2].includes(userId)) {
      return reply.status(403).send({ error: 'Not in match' })
    }
    if (match.status !== 'pending_confirmation') {
      return reply.status(400).send({ error: 'Only pending matches can be deleted' })
    }

    // Delete related disputes first, then the match
    await prisma.dispute.deleteMany({ where: { matchId: id } })
    await prisma.match.delete({ where: { id } })
    return reply.status(204).send()
  })
}
