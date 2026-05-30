// Pure pairing logic for Challenge Events.
// Two modes:
//   - "rotating": every round, active players are paired into games (Americano = random,
//     Mexicano = paired by current standings). Extra players sit out fairly.
//   - "king_of_hill": winners stay on each court, losers go to the back of a shared queue.
//
// Stored shape (ChallengeEvent.currentRoundJson):
//   { round: number, games: Game[], byes: string[] }
// where `byes` is the sit-out group (rotating) or the waiting queue (king_of_hill).

export type Game = {
  court: number
  teamA: string[]
  teamB: string[]
  matchId?: string
  scoreA?: number
  scoreB?: number
  scored?: boolean
  // king_of_hill only: consecutive wins by whichever side is the current "king"
  holdStreak?: number
  holderTeam?: 'A' | 'B'
}

export type RoundPlan = { round: number; games: Game[]; byes: string[] }

export type Format = 'singles' | 'doubles'
export type Mode = 'rotating' | 'king_of_hill'
export type Rotation = 'americano' | 'mexicano'

export function playersPerGame(format: Format): number {
  return format === 'singles' ? 2 : 4
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Build games from an ordered list of playing ids. For singles each game is 1v1,
// for doubles the group of four is split (0,1) vs (2,3).
function buildGames(playing: string[], format: Format, startCourt = 1): Game[] {
  const per = playersPerGame(format)
  const groups = chunk(playing, per)
  return groups.map((g, i) => {
    if (format === 'singles') {
      return { court: startCourt + i, teamA: [g[0]], teamB: [g[1]], scored: false }
    }
    return { court: startCourt + i, teamA: [g[0], g[1]], teamB: [g[2], g[3]], scored: false }
  })
}

// Decide which players sit out this round so that everyone sits roughly equally.
// Players who have sat out the FEWEST times so far are benched first.
function pickByes(
  activeIds: string[],
  format: Format,
  courts: number,
  sitCount: Record<string, number>
): { playing: string[]; byes: string[] } {
  const per = playersPerGame(format)
  const capacity = courts * per
  const maxPlaying = Math.floor(Math.min(activeIds.length, capacity) / per) * per
  const byesCount = activeIds.length - maxPlaying
  if (byesCount <= 0) return { playing: shuffle(activeIds), byes: [] }

  // Lowest sit-count first (their turn to sit), random tiebreak.
  const ordered = shuffle(activeIds).sort(
    (a, b) => (sitCount[a] || 0) - (sitCount[b] || 0)
  )
  const byes = ordered.slice(0, byesCount)
  const byeSet = new Set(byes)
  const playing = activeIds.filter(id => !byeSet.has(id))
  return { playing: shuffle(playing), byes }
}

export function generateRotatingRound(
  activeIds: string[],
  format: Format,
  courts: number,
  rotation: Rotation,
  roundNum: number,
  points: Record<string, number>,
  sitCount: Record<string, number>,
  pairs: Record<string, string> = {}
): RoundPlan {
  if (format === 'doubles') {
    return generateDoublesRound(activeIds, courts, rotation, roundNum, points, sitCount, pairs)
  }

  // ── Singles ──
  const { playing, byes } = pickByes(activeIds, format, courts, sitCount)
  let ordered: string[]
  if (rotation === 'mexicano' && roundNum > 1) {
    // Adjacent ranks play (0v1, 2v3, ...) to keep games close.
    ordered = [...playing].sort((a, b) => {
      const d = (points[b] || 0) - (points[a] || 0)
      return d !== 0 ? d : Math.random() - 0.5
    })
    return { round: roundNum, games: buildGames(ordered, format), byes }
  }
  ordered = shuffle(playing)
  return { round: roundNum, games: buildGames(ordered, format), byes }
}

type Team = [string, string]

// Pair up the free agents (everyone not in a locked team) into ad-hoc teams.
function pairFreePlayers(
  freeIds: string[], rotation: Rotation, roundNum: number, points: Record<string, number>
): { teams: Team[]; leftover: string[] } {
  const order = (rotation === 'mexicano' && roundNum > 1)
    ? [...freeIds].sort((a, b) => (points[b] || 0) - (points[a] || 0) || Math.random() - 0.5)
    : shuffle(freeIds)
  const teams: Team[] = []
  let i = 0
  for (; i + 2 <= order.length; i += 2) teams.push([order[i], order[i + 1]])
  return { teams, leftover: order.slice(i) }
}

// Doubles round generation. Locked partners stay together as an atomic team;
// free agents are paired up fresh each round. Teams (locked or free) are then
// matched against each other, two per court, with fair sit-outs.
function generateDoublesRound(
  activeIds: string[],
  courts: number,
  rotation: Rotation,
  roundNum: number,
  points: Record<string, number>,
  sitCount: Record<string, number>,
  pairs: Record<string, string>
): RoundPlan {
  // 1. Locked teams (mutual partners who are both active).
  const processed = new Set<string>()
  const fixedTeams: Team[] = []
  for (const id of activeIds) {
    if (processed.has(id)) continue
    const partner = pairs[id]
    if (partner && activeIds.includes(partner) && !processed.has(partner)) {
      fixedTeams.push([id, partner])
      processed.add(id); processed.add(partner)
    }
  }

  // 2. Free agents → ad-hoc teams (odd one out sits this round).
  const freeIds = activeIds.filter(id => !processed.has(id))
  const { teams: freeTeams, leftover } = pairFreePlayers(freeIds, rotation, roundNum, points)

  let allTeams: Team[] = [...fixedTeams, ...freeTeams]
  const byes: string[] = [...leftover]

  // 3. Fit to courts (2 teams per court); bench whole teams that have sat least.
  const maxTeams = Math.floor(Math.min(allTeams.length, courts * 2) / 2) * 2
  if (allTeams.length > maxTeams) {
    const teamSit = (t: Team) => (sitCount[t[0]] || 0) + (sitCount[t[1]] || 0)
    allTeams = shuffle(allTeams).sort((a, b) => teamSit(a) - teamSit(b))
    for (const t of allTeams.slice(0, allTeams.length - maxTeams)) byes.push(...t)
    allTeams = allTeams.slice(allTeams.length - maxTeams)
  }

  // 4. Order teams (random, or by standings for Mexicano) and pair into games.
  const playTeams = (rotation === 'mexicano' && roundNum > 1)
    ? [...allTeams].sort((a, b) =>
        ((points[b[0]] || 0) + (points[b[1]] || 0)) - ((points[a[0]] || 0) + (points[a[1]] || 0)) || Math.random() - 0.5)
    : shuffle(allTeams)

  const games: Game[] = []
  for (let c = 0; c * 2 + 1 < playTeams.length; c++) {
    games.push({ court: c + 1, teamA: playTeams[c * 2], teamB: playTeams[c * 2 + 1], scored: false })
  }
  return { round: roundNum, games, byes }
}

// King of the hill: seed each court with a game, the rest wait in `byes` (the queue).
export function generateKothInitial(
  activeIds: string[],
  format: Format,
  courts: number
): RoundPlan {
  const per = playersPerGame(format)
  const pool = shuffle(activeIds)
  const games: Game[] = []
  let idx = 0
  for (let c = 0; c < courts && idx + per <= pool.length; c++) {
    const slice = pool.slice(idx, idx + per)
    idx += per
    if (format === 'singles') {
      games.push({ court: c + 1, teamA: [slice[0]], teamB: [slice[1]], scored: false, holdStreak: 0 })
    } else {
      games.push({ court: c + 1, teamA: [slice[0], slice[1]], teamB: [slice[2], slice[3]], scored: false, holdStreak: 0 })
    }
  }
  const byes = pool.slice(idx)
  return { round: 1, games, byes }
}

// Advance one court after a king-of-hill game is decided.
// Winners stay (subject to maxHillWins); losers go to the back of the queue; the
// next waiting player(s) come on. Returns the replacement game + updated queue.
export function advanceKoth(
  game: Game,
  queue: string[],
  format: Format,
  winnerTeam: 'A' | 'B',
  maxHillWins?: number | null
): { game: Game; queue: string[] } {
  const teamSize = format === 'singles' ? 1 : 2
  const winners = winnerTeam === 'A' ? game.teamA : game.teamB
  const losers = winnerTeam === 'A' ? game.teamB : game.teamA
  const q = [...queue]

  // Track the king's win streak.
  const prevHolder = game.holderTeam
  const prevStreak = game.holdStreak || 0
  const kingStillStreaking = prevHolder && winners.every((w, i) => {
    const held = prevHolder === 'A' ? game.teamA : game.teamB
    return held.includes(w)
  })
  let streak = kingStillStreaking ? prevStreak + 1 : 1

  // Losers always rotate to the back of the queue.
  q.push(...losers)

  // If the winners hit the cap, they rotate off too and a fresh challenger faces the queue.
  let stayers = winners
  if (maxHillWins && streak >= maxHillWins) {
    q.push(...winners)
    stayers = q.splice(0, teamSize)
    streak = 0
  }

  const challengers = q.splice(0, teamSize)
  // If not enough players to field a challenger, the court idles until the queue refills.
  if (challengers.length < teamSize) {
    return {
      game: { ...game, teamA: stayers, teamB: challengers, scored: false, matchId: undefined, scoreA: undefined, scoreB: undefined, holdStreak: streak, holderTeam: 'A' },
      queue: q
    }
  }

  return {
    game: {
      court: game.court,
      teamA: stayers,
      teamB: challengers,
      scored: false,
      holdStreak: streak,
      holderTeam: 'A'
    },
    queue: q
  }
}
