import { prisma } from './prisma'
import { calcTeamElo } from './elo'

// Which side won, derived from the stored winner ids.
function sides(teamsJson: any, winnerIds: string[]): { winIds: string[]; loseIds: string[] } | null {
  const teams = teamsJson as { team1: string[]; team2: string[] }
  if (!teams?.team1 || !teams?.team2 || !winnerIds?.length) return null
  const team1Won = teams.team1.includes(winnerIds[0])
  return team1Won
    ? { winIds: teams.team1, loseIds: teams.team2 }
    : { winIds: teams.team2, loseIds: teams.team1 }
}

// Rebuild every player's Elo + W/L/streak by replaying all completed matches in
// chronological order. Deterministic source of truth — safe to run after any
// result edit. calcTeamElo handles singles (1v1) identically to plain Elo.
export async function recomputeRatings() {
  const ratings = await prisma.rating.findMany()
  const state = new Map(ratings.map(r => [r.userId, { elo: 1200, matchesPlayed: 0, wins: 0, losses: 0, currentStreak: 0 }]))

  const matches = await prisma.match.findMany({ where: { status: 'normal' }, orderBy: { playedAt: 'asc' } })
  for (const m of matches) {
    const s = sides(m.teamsJson, m.winnerUserIdsJson as string[])
    if (!s) continue
    if ([...s.winIds, ...s.loseIds].some(id => !state.has(id))) continue
    const winners = s.winIds.map(id => ({ userId: id, elo: state.get(id)!.elo, matchesPlayed: state.get(id)!.matchesPlayed }))
    const losers = s.loseIds.map(id => ({ userId: id, elo: state.get(id)!.elo, matchesPlayed: state.get(id)!.matchesPlayed }))
    const newElos = calcTeamElo(winners, losers)
    for (const id of s.winIds) { const r = state.get(id)!; r.elo = newElos[id]; r.matchesPlayed++; r.wins++; r.currentStreak++ }
    for (const id of s.loseIds) { const r = state.get(id)!; r.elo = newElos[id]; r.matchesPlayed++; r.losses++; r.currentStreak = 0 }
  }

  for (const [userId, r] of state) {
    await prisma.rating.update({
      where: { userId },
      data: { elo: r.elo, matchesPlayed: r.matchesPlayed, wins: r.wins, losses: r.losses, currentStreak: r.currentStreak }
    })
  }
}

// Rebuild a challenge event's standings (points/wins/losses/gamesWon) from its
// match records — every game won is worth pointsPerWin, for both sides.
export async function recomputeEventStandings(eventId: string) {
  const event = await prisma.challengeEvent.findUnique({ where: { id: eventId }, select: { pointsPerWin: true } })
  if (!event) return

  const acc = new Map<string, { points: number; wins: number; losses: number; gamesWon: number }>()
  const at = (id: string) => {
    let a = acc.get(id)
    if (!a) { a = { points: 0, wins: 0, losses: 0, gamesWon: 0 }; acc.set(id, a) }
    return a
  }

  const matches = await prisma.match.findMany({ where: { eventId, status: 'normal' } })
  for (const m of matches) {
    const s = sides(m.teamsJson, m.winnerUserIdsJson as string[])
    if (!s) continue
    const teams = m.teamsJson as { team1: string[]; team2: string[] }
    const setRows = (m.scoreJson as number[][]) || []
    let t1 = 0, t2 = 0
    for (const row of setRows) { t1 += row[0] || 0; t2 += row[1] || 0 }
    const team1Won = teams.team1.includes((m.winnerUserIdsJson as string[])[0])
    const winGames = team1Won ? t1 : t2
    const loseGames = team1Won ? t2 : t1
    for (const id of s.winIds) { const a = at(id); a.points += winGames * event.pointsPerWin; a.wins += 1; a.gamesWon += winGames }
    for (const id of s.loseIds) { const a = at(id); a.points += loseGames * event.pointsPerWin; a.losses += 1; a.gamesWon += loseGames }
  }

  await prisma.challengeParticipant.updateMany({ where: { eventId }, data: { points: 0, wins: 0, losses: 0, gamesWon: 0 } })
  for (const [userId, a] of acc) {
    await prisma.challengeParticipant.updateMany({ where: { eventId, userId }, data: { points: a.points, wins: a.wins, losses: a.losses, gamesWon: a.gamesWon } })
  }
}

// Assign Gold/Silver/Bronze (finalRank 1/2/3) from the current standings.
// Locked doubles pairs share one place. Used on completion and after an edit.
export async function assignEventPodium(eventId: string) {
  const event = await prisma.challengeEvent.findUnique({ where: { id: eventId }, select: { format: true } })
  if (!event) return []
  const parts = await prisma.challengeParticipant.findMany({ where: { eventId } })
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
    if (event.format === 'doubles' && p.partnerId && ranked.some(x => x.userId === p.partnerId)) teamIds.push(p.partnerId)
    for (const uid of teamIds) placed.add(uid)
    podium.push({ rank: place, userIds: teamIds })
  }

  await prisma.challengeParticipant.updateMany({ where: { eventId }, data: { finalRank: null } })
  for (const { rank, userIds } of podium) {
    await prisma.challengeParticipant.updateMany({ where: { eventId, userId: { in: userIds } }, data: { finalRank: rank } })
  }
  return podium
}
