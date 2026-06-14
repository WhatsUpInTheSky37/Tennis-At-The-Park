import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'
import { prisma } from '../lib/prisma'
import { UPLOADS_DIR } from './uploads'
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
  scoring: z.enum(['first_to_3', 'first_to_4', 'first_to_6', 'pro_set_8', 'tb_7', 'tb_10']).default('first_to_4'),
  pointsPerWin: z.number().int().min(1).max(10).default(1),
  affectsElo: z.boolean().default(true),
  maxHillWins: z.number().int().min(1).max(20).nullable().optional(),
  participantIds: z.array(z.string()).default([])
})

const scoreSchema = z.object({
  court: z.number().int(),
  // Single-score entry (the default): one game/point total per side.
  scoreA: z.number().int().min(0).max(99).optional(),
  scoreB: z.number().int().min(0).max(99).optional(),
  // Optional multi-set entry: [{ a, b }, ...] for best-of-N matches with tiebreaks.
  sets: z.array(z.object({ a: z.number().int().min(0).max(99), b: z.number().int().min(0).max(99) })).min(1).max(5).optional()
})

type ScoreInput = { scoreA?: number; scoreB?: number; sets?: { a: number; b: number }[] }
type MatchResult =
  | { ok: true; winnerSide: 'A' | 'B'; scoreJson: number[][]; aGames: number; bGames: number; tileA: number; tileB: number }
  | { ok: false; error: string }

// Resolve a match result from either a single score or a list of sets. `aGames`
// / `bGames` are the totals that feed standings points; `tileA` / `tileB` are
// what the court tile shows (games for a single score, sets won for multi-set).
export function computeMatchResult(input: ScoreInput): MatchResult {
  if (input.sets && input.sets.length) {
    let setsA = 0, setsB = 0, aGames = 0, bGames = 0
    for (const s of input.sets) {
      if (s.a === s.b) return { ok: false, error: 'Each set needs a winner — enter a tiebreak set as 7–6' }
      aGames += s.a; bGames += s.b
      if (s.a > s.b) setsA++; else setsB++
    }
    if (setsA === setsB) return { ok: false, error: 'The match is tied on sets — enter a deciding set' }
    return { ok: true, winnerSide: setsA > setsB ? 'A' : 'B', scoreJson: input.sets.map(s => [s.a, s.b]), aGames, bGames, tileA: setsA, tileB: setsB }
  }
  const { scoreA, scoreB } = input
  if (scoreA === undefined || scoreB === undefined) return { ok: false, error: 'Enter both scores' }
  if (scoreA === scoreB) return { ok: false, error: 'A game cannot end in a tie' }
  return { ok: true, winnerSide: scoreA > scoreB ? 'A' : 'B', scoreJson: [[scoreA, scoreB]], aGames: scoreA, bGames: scoreB, tileA: scoreA, tileB: scoreB }
}

// Editing an existing event. All fields optional (partial update). Structural
// fields (format/mode/rotation) can only change before the event starts — see
// the handler — because rounds/pairs are already built around them once active.
const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  locationId: z.string().optional(),
  date: z.string().datetime().optional(),
  endTime: z.string().datetime().nullable().optional(),
  format: z.enum(['singles', 'doubles']).optional(),
  mode: z.enum(['rotating', 'king_of_hill']).optional(),
  rotation: z.enum(['americano', 'mexicano']).optional(),
  courts: z.number().int().min(1).max(16).optional(),
  scoring: z.enum(['first_to_3', 'first_to_4', 'first_to_6', 'pro_set_8', 'tb_7', 'tb_10']).optional(),
  pointsPerWin: z.number().int().min(1).max(10).optional(),
  affectsElo: z.boolean().optional(),
  maxHillWins: z.number().int().min(1).max(20).nullable().optional()
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

  // Edit event settings (organizer or admin). Useful for fixing details like
  // the number of available courts. Completed events are locked.
  server.put('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const user = (req as any).user
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) {
      return reply.status(403).send({ error: 'Only the organizer can edit this event' })
    }
    if (event.status === 'completed') {
      return reply.status(400).send({ error: 'Completed events cannot be edited' })
    }

    const body = updateSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const d = body.data

    // Everything is editable until the event is completed. Structural changes
    // (format/mode/rotation/courts) on an active event take effect when the next
    // round is generated; the current round keeps its already-built games.
    const data: any = {}
    if (d.name !== undefined) data.name = d.name
    if (d.locationId !== undefined) data.locationId = d.locationId
    if (d.date !== undefined) data.date = new Date(d.date)
    if (d.endTime !== undefined) data.endTime = d.endTime ? new Date(d.endTime) : null
    if (d.format !== undefined) data.format = d.format
    if (d.mode !== undefined) data.mode = d.mode
    if (d.rotation !== undefined) data.rotation = d.rotation
    if (d.courts !== undefined) data.courts = d.courts
    if (d.scoring !== undefined) data.scoring = d.scoring
    if (d.pointsPerWin !== undefined) data.pointsPerWin = d.pointsPerWin
    if (d.affectsElo !== undefined) data.affectsElo = d.affectsElo
    if (d.maxHillWins !== undefined) data.maxHillWins = d.maxHillWins

    const updated = await prisma.challengeEvent.update({ where: { id }, data })
    return updated
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
        finalRank: p.finalRank,
        points: p.points,
        wins: p.wins,
        losses: p.losses,
        gamesWon: p.gamesWon,
        sitCount: p.sitCount,
        elo: p.user.rating?.elo ?? 1200
      }))
      // Points (games won) first, then more match wins, then fewer losses, then
      // name. gamesWon can't be a tiebreak now that points are derived from it.
      .sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses || a.displayName.localeCompare(b.displayName))

    // Full match history (every game played), so completed events show how it went down.
    const matchRows = await prisma.match.findMany({
      where: { eventId: id },
      orderBy: [{ eventRound: 'asc' }, { courtNumber: 'asc' }, { playedAt: 'asc' }]
    })
    const matches = matchRows.map(m => ({
      id: m.id,
      round: m.eventRound,
      court: m.courtNumber,
      teams: m.teamsJson,
      score: m.scoreJson,
      winners: m.winnerUserIdsJson,
      playedAt: m.playedAt
    }))

    return {
      ...event,
      participants: undefined,
      standings,
      playerNames: names,
      currentRound: event.currentRound,
      round: event.currentRoundJson as RoundJson,
      matches
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
      create: { eventId: id, userId, sitCount: await fairSitCount(id, event.status) },
      update: { status: 'active' }
    })
    await syncKothQueueAdd(event, userId)
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
      await syncKothQueueRemove(event, userId)
    }
    return { ok: true }
  })

  // Add a player (organizer) — works during setup AND mid-event
  server.post('/:id/participants', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as { id: string }
    const { userId: addId } = req.body as { userId: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) return reply.status(403).send({ error: 'Organizer only' })
    if (event.status === 'completed') return reply.status(400).send({ error: 'Event is over' })
    if (!addId) return reply.status(400).send({ error: 'userId required' })
    await prisma.challengeParticipant.upsert({
      where: { eventId_userId: { eventId: id, userId: addId } },
      create: { eventId: id, userId: addId, sitCount: await fairSitCount(id, event.status) },
      update: { status: 'active' }
    })
    await syncKothQueueAdd(event, addId)
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
      await syncKothQueueRemove(event, removeId)
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
    const { court } = body.data

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

    const result = computeMatchResult(body.data)
    if (!result.ok) return reply.status(400).send({ error: result.error })
    const { winnerSide, scoreJson, aGames, bGames, tileA, tileB } = result
    const winners = winnerSide === 'A' ? game.teamA : game.teamB
    const losers = winnerSide === 'A' ? game.teamB : game.teamA
    const winnerGames = winnerSide === 'A' ? aGames : bGames
    const loserGames = winnerSide === 'A' ? bGames : aGames

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
        scoreJson,
        winnerUserIdsJson: winners,
        status: 'normal',
        notes: `${event.name} — Round ${event.currentRound}`
      }
    })

    // Update event standings for every player involved. Americano-style scoring:
    // every GAME won is worth points (× pointsPerWin) for both sides — you don't
    // get a single point for the match win, you get a point per game you won.
    await Promise.all([
      ...winners.map(uid => prisma.challengeParticipant.updateMany({
        where: { eventId: id, userId: uid },
        data: { points: { increment: winnerGames * event.pointsPerWin }, wins: { increment: 1 }, gamesWon: { increment: winnerGames } }
      })),
      ...losers.map(uid => prisma.challengeParticipant.updateMany({
        where: { eventId: id, userId: uid },
        data: { points: { increment: loserGames * event.pointsPerWin }, losses: { increment: 1 }, gamesWon: { increment: loserGames } }
      }))
    ])

    // Feed the main Elo system if this event counts.
    if (event.affectsElo) {
      await applyEventElo(winners, losers)
    }

    // Update the round JSON: mark scored, and for KotH spin up the next game on this court.
    const newGames = round.games.map(g => g)
    const gameIdx = newGames.findIndex(g => g.court === court && !g.scored)
    newGames[gameIdx] = { ...game, scored: true, matchId: match.id, scoreA: tileA, scoreB: tileB }

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

    // Award the podium: Gold (1st), Silver (2nd), Bronze (3rd) by points (games
    // won), then more match wins, then fewer losses as tiebreaks. In doubles, a
    // locked pair shares a single place.
    const parts = await prisma.challengeParticipant.findMany({ where: { eventId: id } })
    const ranked = parts
      .filter(p => p.status !== 'withdrawn')
      .sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses)

    const placed = new Set<string>()
    const podium: { rank: number; userIds: string[] }[] = []
    for (const p of ranked) {
      if (placed.has(p.userId)) continue
      const place = podium.length + 1
      if (place > 3) break
      const teamIds = [p.userId]
      if (event.format === 'doubles' && p.partnerId && ranked.some(x => x.userId === p.partnerId)) {
        teamIds.push(p.partnerId)
      }
      for (const uid of teamIds) placed.add(uid)
      podium.push({ rank: place, userIds: teamIds })
    }

    // Reset any prior ranks, then stamp the new podium ranks.
    await prisma.challengeParticipant.updateMany({ where: { eventId: id }, data: { finalRank: null } })
    for (const { rank, userIds } of podium) {
      await prisma.challengeParticipant.updateMany({
        where: { eventId: id, userId: { in: userIds } },
        data: { finalRank: rank }
      })
    }
    const champions = podium[0]?.userIds ?? []

    const updated = await prisma.challengeEvent.update({ where: { id }, data: { status: 'completed' } })
    return { ...updated, champions, podium }
  })

  // A player's challenge podium finishes (for the profile trophy case): gold,
  // silver, and bronze from completed events, newest first.
  server.get('/wins/:userId', async (req) => {
    const { userId } = req.params as { userId: string }
    const finishes = await prisma.challengeParticipant.findMany({
      where: { userId, finalRank: { in: [1, 2, 3] }, event: { status: 'completed' } },
      include: { event: { select: { id: true, name: true, date: true, format: true } } }
    })
    return finishes
      .map(w => ({ eventId: w.event.id, name: w.event.name, date: w.event.date, format: w.event.format, rank: w.finalRank }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  // ── Photo gallery ──────────────────────────────────────────────────────────

  // Gallery index: every event that has photos, with a cover + count.
  server.get('/gallery', async () => {
    const events = await prisma.challengeEvent.findMany({
      where: { photos: { some: {} } },
      orderBy: { date: 'desc' },
      select: {
        id: true, name: true, date: true, format: true,
        location: { select: { name: true } },
        photos: { orderBy: { createdAt: 'asc' }, take: 1, select: { url: true } },
        _count: { select: { photos: true } }
      }
    })
    return events.map(e => ({
      id: e.id, name: e.name, date: e.date, format: e.format,
      location: e.location, cover: e.photos[0]?.url || null, photoCount: e._count.photos
    }))
  })

  // List photos for an event (public, for viewing / slideshows).
  server.get('/:id/photos', async (req) => {
    const { id } = req.params as { id: string }
    const photos = await prisma.eventPhoto.findMany({
      where: { eventId: id },
      orderBy: { createdAt: 'asc' },
      include: { uploader: { select: { id: true, profile: { select: { displayName: true } } } } }
    })
    return photos.map(p => ({
      id: p.id, url: p.url, width: p.width, height: p.height, caption: p.caption,
      createdAt: p.createdAt, uploadedBy: p.uploadedBy,
      uploaderName: p.uploader?.profile?.displayName || 'Player'
    }))
  })

  // Upload a photo to an event (any signed-in player who attended/took photos).
  server.post('/:id/photos', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const user = (req as any).user
    const event = await prisma.challengeEvent.findUnique({ where: { id }, select: { id: true } })
    if (!event) return reply.status(404).send({ error: 'Event not found' })
    if (!await checkEnforcement(user.userId, reply)) return

    const file = await (req as any).file()
    if (!file) return reply.status(400).send({ error: 'No file uploaded' })
    const EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }
    const ext = EXT[file.mimetype]
    if (!ext) return reply.status(400).send({ error: 'Please upload a JPEG, PNG, WebP, or GIF image' })

    const dir = path.join(UPLOADS_DIR, 'events', id)
    fs.mkdirSync(dir, { recursive: true })
    const filename = `${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(8).toString('hex')}${ext}`
    const fullPath = path.join(dir, filename)
    try {
      await pipeline(file.file, fs.createWriteStream(fullPath))
    } catch {
      try { fs.unlinkSync(fullPath) } catch {}
      return reply.status(500).send({ error: 'Upload failed' })
    }
    if ((file.file as any).truncated) {
      try { fs.unlinkSync(fullPath) } catch {}
      return reply.status(413).send({ error: 'Image too large (max 8 MB)' })
    }

    const q = req.query as any
    const width = q.w ? Math.min(Number(q.w) || 0, 100000) || null : null
    const height = q.h ? Math.min(Number(q.h) || 0, 100000) || null : null
    const caption = typeof q.caption === 'string' ? q.caption.slice(0, 300) : null

    const photo = await prisma.eventPhoto.create({
      data: { eventId: id, uploadedBy: user.userId, url: `/uploads/events/${id}/${filename}`, width, height, caption }
    })
    return reply.status(201).send({ id: photo.id, url: photo.url, width: photo.width, height: photo.height, caption: photo.caption })
  })

  // Update a photo's caption (the uploader, or the event organizer / an admin).
  server.patch('/:id/photos/:photoId', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id, photoId } = req.params as { id: string; photoId: string }
    const user = (req as any).user
    const body = z.object({ caption: z.string().max(300).nullable() }).safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const photo = await prisma.eventPhoto.findUnique({ where: { id: photoId }, include: { event: { select: { createdBy: true } } } })
    if (!photo || photo.eventId !== id) return reply.status(404).send({ error: 'Photo not found' })
    if (photo.uploadedBy !== user.userId && !isOrganizer(photo.event, user)) {
      return reply.status(403).send({ error: 'You can only edit captions on your own photos' })
    }
    const caption = body.data.caption?.trim() || null
    await prisma.eventPhoto.update({ where: { id: photoId }, data: { caption } })
    return { ok: true, caption }
  })

  // Delete a photo (the uploader, or the event organizer / an admin).
  server.delete('/:id/photos/:photoId', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const { id, photoId } = req.params as { id: string; photoId: string }
    const user = (req as any).user
    const photo = await prisma.eventPhoto.findUnique({ where: { id: photoId }, include: { event: { select: { createdBy: true } } } })
    if (!photo || photo.eventId !== id) return reply.status(404).send({ error: 'Photo not found' })
    const canDelete = photo.uploadedBy === user.userId || isOrganizer(photo.event, user)
    if (!canDelete) return reply.status(403).send({ error: 'You can only delete photos you uploaded' })

    await prisma.eventPhoto.delete({ where: { id: photoId } })
    // Best-effort remove the file from disk.
    try {
      const rel = photo.url.replace(/^\/uploads\//, '')
      fs.unlinkSync(path.join(UPLOADS_DIR, rel))
    } catch {}
    return { ok: true }
  })

  // Delete the event (organizer)
  server.delete('/:id', { preHandler: [(server as any).authenticate] }, async (req, reply) => {
    const user = (req as any).user
    const { id } = req.params as { id: string }
    const event = await prisma.challengeEvent.findUnique({ where: { id } })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!isOrganizer(event, user)) return reply.status(403).send({ error: 'Organizer only' })
    // Fully remove the event: its games (so nothing lingers in match history),
    // its participants (which clears any champion trophy from profiles), then the event.
    const matchIds = (await prisma.match.findMany({ where: { eventId: id }, select: { id: true } })).map(m => m.id)
    if (matchIds.length) {
      await prisma.dispute.deleteMany({ where: { matchId: { in: matchIds } } })
      await prisma.report.deleteMany({ where: { matchId: { in: matchIds } } })
      await prisma.match.deleteMany({ where: { id: { in: matchIds } } })
    }
    await prisma.challengeParticipant.deleteMany({ where: { eventId: id } })
    await prisma.challengeEvent.delete({ where: { id } })
    return reply.status(204).send()
  })
}

// A walk-in joining mid-event shouldn't be benched first: seed their sit-count to
// the current max among active players so they get into the rotation right away.
async function fairSitCount(eventId: string, status: string): Promise<number> {
  if (status !== 'active') return 0
  const parts = await prisma.challengeParticipant.findMany({
    where: { eventId, status: 'active' }, select: { sitCount: true }
  })
  return parts.reduce((m, p) => Math.max(m, p.sitCount), 0)
}

// King of the hill: keep the live queue in sync when players come and go mid-event.
async function syncKothQueueAdd(event: { id: string; mode: string; status: string; currentRoundJson: any }, userId: string) {
  if (event.mode !== 'king_of_hill' || event.status !== 'active') return
  const round = event.currentRoundJson as RoundPlan | null
  if (!round) return
  const onCourt = round.games.some(g => [...g.teamA, ...g.teamB].includes(userId))
  if (onCourt || round.byes.includes(userId)) return
  round.byes = [...round.byes, userId]
  await prisma.challengeEvent.update({ where: { id: event.id }, data: { currentRoundJson: round as any } })
}

async function syncKothQueueRemove(event: { id: string; mode: string; status: string; currentRoundJson: any }, userId: string) {
  if (event.mode !== 'king_of_hill' || event.status !== 'active') return
  const round = event.currentRoundJson as RoundPlan | null
  if (!round || !round.byes.includes(userId)) return
  round.byes = round.byes.filter(u => u !== userId)
  await prisma.challengeEvent.update({ where: { id: event.id }, data: { currentRoundJson: round as any } })
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
