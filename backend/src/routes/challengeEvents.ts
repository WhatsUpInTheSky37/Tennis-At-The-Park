import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { calcTeamElo } from '../lib/elo'
import { checkEnforcement } from '../middleware/auth'
import {
  generateRotatingRound,
  generateKothInitial,
  advanceKoth,
  type Game,
  type RoundPlan,
  type Format,
  type Rotation
} from '../lib/challengeEngine'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  locationId: z.string(),
  date: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  format: z.enum(['singles', 'doubles']),
  mode: z.enum(['rotating', 'king_of_hill']).default('rotating'),
  rotation: z.enum(['americano', 'mexicano']).default('americano'),
  courts: z.number().int().min(1).max(16).default(2),
  scoring: z.enum(['first_to_4', 'pro_set_8', 'tb_7', 'tb_10']).default('first_to_4'),
  pointsPerWin: z.number().int().min(1).max(10).default(1),
  affectsElo: z.boolean().default(true),
  maxHillWins: z.number().int().min(1).max(20).nullable().optional(),
  participantIds: z.array(z.string()).default([])
})

const scoreSchema = z.object({
  court: z.number().int(),
  scoreA: z.number().int().min(0).max(99),
  scoreB: z.number().int().min(0).max(99)
})

type RoundJson = RoundPlan | null

function isOrganizer(event: { createdBy: string }, user: any): boolean {
  return event.createdBy === user.userId || !!user.isAdmin
}

// Resolve display names for a set of user ids.
async function nameMap(userIds: string[]): Promise<Record<string, string>> {
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, displayName: true }
  })
  const map: Record<string, string> = {}
  for (const p of profiles) map[p.userId] = p.displayName
  return map
}

export async function challengeEventRoutes(server: FastifyInstance) {
  // List events
  server.get('/', async (req) => {
    const query = req.query as any
    const where: any = {}
    if (query.status) where.status = query.status
    const events = await prisma.challengeEvent.findMany({
      where,
      include: {
        location: true,
        _count: { select: { participants: true } }
      },
      orderBy: { date: 'desc' },
      take: 50
    })
    return events
  })

  // Create event (admins only)
  server.post('/', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId, isAdmin } = (req as any).user
    if (!isAdmin) return reply.status(403).send({ error: 'Only admins can create challenge events' })
    if (!await checkEnforcement(userId, reply)) return
    const body = createSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const data = body.data

    // Creator is always a participant; merge in any explicitly-added players.
    const participantIds = Array.from(new Set([userId, ...data.participantIds]))

    const event = await prisma.challengeEvent.create({
      data: {
        name: data.name,
        createdBy: userId,
        locationId: data.locationId,
        date: new Date(data.date),
        endTime: data.endTime ? new Date(data.endTime) : null,
        format: data.format,
        mode: data.mode,
        rotation: data.rotation,
        courts: data.courts,
        scoring: data.scoring,
        pointsPerWin: data.pointsPerWin,
        affectsElo: data.affectsElo,
        maxHillWins: data.maxHillWins ?? null,
        participants: {
          create: participantIds.map(uid => ({ userId: uid }))
        }
      }
    })
    return reply.status(201).send(event)
  })

  // Event detail with standings + current round
  server.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const event = await prisma.challengeEvent.findUnique({
      where: { id },
      include: {
        location: true,
        participants: { include: { user: { include: { rating: true } } } }
      }
    })
    if (!event) return reply.status(404).send({ error: 'Not found' })

    const names = await nameMap(event.participants.map(p => p.userId))
    const standings = event.participants
      .map(p => ({
        userId: p.userId,
        displayName: names[p.userId] || 'Unknown',
        status: p.status,
        partnerId: p.partnerId,
        points: p.points,
        wins: p.wins,
        losses: p.losses,
        gamesWon: p.gamesWon,
        sitCount: p.sitCount,
        elo: p.user.rating?.elo ?? 1200
      }))
      .sort((a, b) => b.points - a.points || b.gamesWon - a.gamesWon || a.displayName.localeCompare(b.displayName))

    return {
      ...event,
      participants: undefined,
      standings,
      playerNames: names,
      currentRound: event.currentRound,
      round: event.currentRoundJson as RoundJson
    }
  })

  // Join (self)
  server.post('/:id/join', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (event.status === 'completed') return reply.status(400).send({ error: 'Event is over' })
    await prisma.challengeParticipant.upsert({
      where: { eventId_userId: { eventId: id, userId } },
      create: { eventId: id, userId },
      update: { status: 'active' }
    })
    return { ok: true }
  })

  // Leave / withdraw (self)
  server.post('/:id/leave', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { userId } = (req as any).user
    const { id } = req.params as { id: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (event.status === 'setup') {
      await prisma.challengeParticipant.deleteMany({ where: { eventId: id, userId } })
    } else {
      // Mid-event: mark withdrawn so they're excluded from future rounds but keep their record.
      await prisma.challengeParticipant.updateMany({ where: { eventId: id, userId }, data: { status: 'withdrawn' } })
    }
    return { ok: true }
  })

  // Add a player (organizer)
  server.post('/:id/participants', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as { id: string }
    const { userId: addId } = req.body as { userId: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) return reply.status(403).send({ error: 'Organizer only' })
    if (!addId) return reply.status(400).send({ error: 'userId required' })
    await prisma.challengeParticipant.upsert({
      where: { eventId_userId: { eventId: id, userId: addId } },
      create: { eventId: id, userId: addId },
      update: { status: 'active' }
    })
    return { ok: true }
  })

  // Remove a player (organizer, or self)
  server.delete('/:id/participants/:userId', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id, userId: removeId } = req.params as { id: string; userId: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user) && user.userId !== removeId) return reply.status(403).send({ error: 'Not allowed' })
    if (event.status === 'setup') {
      await prisma.challengeParticipant.deleteMany({ where: { eventId: id, userId: removeId } })
    } else {
      await prisma.challengeParticipant.updateMany({ where: { eventId: id, userId: removeId }, data: { status: 'withdrawn' } })
    }
    return { ok: true }
  })

  // Lock two players as a fixed doubles team (organizer)
  server.post('/:id/pairs', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as { id: string }
    const { userIdA, userIdB } = req.body as { userIdA: string; userIdB: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) return reply.status(403).send({ error: 'Organizer only' })
    if (event.format !== 'doubles') return reply.status(400).send({ error: 'Fixed teams are for doubles events' })
    if (!userIdA || !userIdB || userIdA === userIdB) return reply.status(400).send({ error: 'Pick two different players' })

    const both = await prisma.challengeParticipant.findMany({ where: { eventId: id, userId: { in: [userIdA, userIdB] } } })
    if (both.length !== 2) return reply.status(400).send({ error: 'Both players must be in the event' })

    // Break any existing partnerships for these two (and their old partners), then link them.
    const oldPartners = both.map(p => p.partnerId).filter(Boolean) as string[]
    await prisma.challengeParticipant.updateMany({
      where: { eventId: id, userId: { in: [userIdA, userIdB, ...oldPartners] } },
      data: { partnerId: null }
    })
    await prisma.challengeParticipant.update({ where: { eventId_userId: { eventId: id, userId: userIdA } }, data: { partnerId: userIdB } })
    await prisma.challengeParticipant.update({ where: { eventId_userId: { eventId: id, userId: userIdB } }, data: { partnerId: userIdA } })
    return { ok: true }
  })

  // Unlock a fixed team (organizer)
  server.delete('/:id/pairs/:userId', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id, userId: uid } = req.params as { id: string; userId: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) return reply.status(403).send({ error: 'Organizer only' })
    const me = await prisma.challengeParticipant.findUnique({ where: { eventId_userId: { eventId: id, userId: uid } } })
    const ids = [uid, ...(me?.partnerId ? [me.partnerId] : [])]
    await prisma.challengeParticipant.updateMany({ where: { eventId: id, userId: { in: ids } }, data: { partnerId: null } })
    return { ok: true }
  })

  // Start the event / generate round 1 (organizer)
  server.post('/:id/start', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as { id: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id }, include: { participants: true } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) return reply.status(403).send({ error: 'Organizer only' })

    const active = event.participants.filter(p => p.status === 'active').map(p => p.userId)
    const per = event.format === 'singles' ? 2 : 4
    if (active.length < per) return reply.status(400).send({ error: `Need at least ${per} players to start` })

    const pairs = buildPairs(event.participants)
    const round = event.mode === 'king_of_hill'
      ? generateKothInitial(active, event.format as Format, event.courts, pairs)
      : generateRotatingRound(active, event.format as Format, event.courts, event.rotation as Rotation, 1, {}, {}, pairs)

    await applySitOuts(id, round.byes, event.mode)
    const updated = await prisma.challengeEvent.update({
      where: { id },
      data: { status: 'active', currentRound: 1, currentRoundJson: round as any }
    })
    return updated
  })

  // Record a game result on a court
  server.post('/:id/games/score', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as { id: string }
    const body = scoreSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const { court, scoreA, scoreB } = body.data
    if (scoreA === scoreB) return reply.status(400).send({ error: 'A game cannot end in a tie' })

    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (event.status !== 'active') return reply.status(400).send({ error: 'Event is not active' })

    // Only the organizer or a player on that court can enter the score.
    const round = event.currentRoundJson as RoundPlan | null
    if (!round) return reply.status(400).send({ error: 'No active round' })
    const game = round.games.find(g => g.court === court && !g.scored)
    if (!game) return reply.status(404).send({ error: 'No open game on that court' })
    const onCourt = [...game.teamA, ...game.teamB]
    if (!isOrganizer(event, user) && !onCourt.includes(user.userId)) {
      return reply.status(403).send({ error: 'Only a player on this court or the organizer can score' })
    }

    const winnerSide: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'
    const winners = winnerSide === 'A' ? game.teamA : game.teamB
    const losers = winnerSide === 'A' ? game.teamB : game.teamA
    const winnerGames = Math.max(scoreA, scoreB)
    const loserGames = Math.min(scoreA, scoreB)

    // Persist the game as a real Match so it flows into history.
    const match = await prisma.match.create({
      data: {
        eventId: id,
        eventRound: event.currentRound,
        playedAt: new Date(),
        locationId: event.locationId,
        courtNumber: court,
        format: event.format,
        teamsJson: { team1: game.teamA, team2: game.teamB },
        scoreJson: [[scoreA, scoreB]],
        winnerUserIdsJson: winners,
        status: 'normal',
        notes: `${event.name} — Round ${event.currentRound}`
      }
    })

    // Update event standings for every player involved.
    await Promise.all([
      ...winners.map(uid => prisma.challengeParticipant.updateMany({
        where: { eventId: id, userId: uid },
        data: { points: { increment: event.pointsPerWin }, wins: { increment: 1 }, gamesWon: { increment: winnerGames } }
      })),
      ...losers.map(uid => prisma.challengeParticipant.updateMany({
        where: { eventId: id, userId: uid },
        data: { losses: { increment: 1 }, gamesWon: { increment: loserGames } }
      }))
    ])

    // Feed the main Elo system if this event counts.
    if (event.affectsElo) {
      await applyEventElo(winners, losers)
    }

    // Update the round JSON: mark scored, and for KotH spin up the next game on this court.
    const newGames = round.games.map(g => g)
    const gameIdx = newGames.findIndex(g => g.court === court && !g.scored)
    newGames[gameIdx] = { ...game, scored: true, matchId: match.id, scoreA, scoreB }

    let byes = round.byes
    if (event.mode === 'king_of_hill') {
      const parts = await prisma.challengeParticipant.findMany({
        where: { eventId: id }, select: { userId: true, partnerId: true, status: true }
      })
      const { game: nextGame, queue } = advanceKoth(
        newGames[gameIdx], byes, event.format as Format, winnerSide, event.maxHillWins, buildPairs(parts)
      )
      newGames[gameIdx] = nextGame
      byes = queue
    }

    await prisma.challengeEvent.update({
      where: { id },
      data: { currentRoundJson: { ...round, games: newGames, byes } as any }
    })

    return { ok: true, matchId: match.id }
  })

  // Generate the next round (rotating mode, organizer)
  server.post('/:id/next-round', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as { id: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id }, include: { participants: true } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) return reply.status(403).send({ error: 'Organizer only' })
    if (event.status !== 'active') return reply.status(400).send({ error: 'Event is not active' })
    if (event.mode === 'king_of_hill') return reply.status(400).send({ error: 'King of the hill advances automatically' })

    const current = event.currentRoundJson as RoundPlan | null
    const force = (req.body as any)?.force === true
    if (current && !force && current.games.some(g => !g.scored)) {
      return reply.status(400).send({ error: 'Some games on this round have not been scored yet' })
    }

    const active = event.participants.filter(p => p.status === 'active').map(p => p.userId)
    const per = event.format === 'singles' ? 2 : 4
    if (active.length < per) return reply.status(400).send({ error: `Need at least ${per} active players` })

    const points: Record<string, number> = {}
    const sitCount: Record<string, number> = {}
    for (const p of event.participants) { points[p.userId] = p.points; sitCount[p.userId] = p.sitCount }

    const nextRoundNum = event.currentRound + 1
    const round = generateRotatingRound(
      active, event.format as Format, event.courts, event.rotation as Rotation, nextRoundNum, points, sitCount, buildPairs(event.participants)
    )

    await applySitOuts(id, round.byes, event.mode)
    const updated = await prisma.challengeEvent.update({
      where: { id },
      data: { currentRound: nextRoundNum, currentRoundJson: round as any }
    })
    return updated
  })

  // Complete the event (organizer)
  server.post('/:id/complete', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as { id: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) return reply.status(403).send({ error: 'Organizer only' })
    const updated = await prisma.challengeEvent.update({ where: { id }, data: { status: 'completed' } })
    return updated
  })

  // Delete the event (organizer)
  server.delete('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as { id: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) return reply.status(403).send({ error: 'Organizer only' })
    // Detach any recorded matches, then remove participants + the event.
    await prisma.match.updateMany({ where: { eventId: id }, data: { eventId: null } })
    await prisma.challengeParticipant.deleteMany({ where: { eventId: id } })
    await prisma.challengeEvent.delete({ where: { id } })
    return reply.status(204).send()
  })
}

// Build a map of locked doubles partners from active participants.
function buildPairs(participants: { userId: string; partnerId: string | null; status: string }[]): Record<string, string> {
  const pairs: Record<string, string> = {}
  for (const p of participants) {
    if (p.partnerId && p.status === 'active') pairs[p.userId] = p.partnerId
  }
  return pairs
}

// Increment sit-count for players who sat out this round (fair bye rotation).
async function applySitOuts(eventId: string, byes: string[], mode: string) {
  // In king-of-hill the "byes" array is the rolling queue, not a one-off sit-out, so skip.
  if (mode === 'king_of_hill' || byes.length === 0) return
  await prisma.challengeParticipant.updateMany({
    where: { eventId, userId: { in: byes } },
    data: { sitCount: { increment: 1 } }
  })
}

// Apply team Elo to all players in an event game and update their rating records.
async function applyEventElo(winnerIds: string[], loserIds: string[]) {
  const ids = [...winnerIds, ...loserIds]
  const ratings = await prisma.rating.findMany({ where: { userId: { in: ids } } })
  const byId = new Map(ratings.map(r => [r.userId, r]))
  // Every involved player must have a rating row to score fairly.
  if (winnerIds.some(id => !byId.has(id)) || loserIds.some(id => !byId.has(id))) return

  const winners = winnerIds.map(id => byId.get(id)!).map(r => ({ userId: r.userId, elo: r.elo, matchesPlayed: r.matchesPlayed }))
  const losers = loserIds.map(id => byId.get(id)!).map(r => ({ userId: r.userId, elo: r.elo, matchesPlayed: r.matchesPlayed }))
  const newElos = calcTeamElo(winners, losers)

  await Promise.all([
    ...winnerIds.map(uid => prisma.rating.update({
      where: { userId: uid },
      data: { elo: newElos[uid], matchesPlayed: { increment: 1 }, wins: { increment: 1 }, currentStreak: { increment: 1 } }
    })),
    ...loserIds.map(uid => prisma.rating.update({
      where: { userId: uid },
      data: { elo: newElos[uid], matchesPlayed: { increment: 1 }, losses: { increment: 1 }, currentStreak: 0 }
    }))
  ])
}
