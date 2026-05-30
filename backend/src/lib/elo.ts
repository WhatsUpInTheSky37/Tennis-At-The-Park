export function getKFactor(matchesPlayed: number): number {
  if (matchesPlayed < 10) return 40
  if (matchesPlayed <= 30) return 24
  return 16
}

export function calcElo(winnerElo: number, loserElo: number, winnerMatches: number, loserMatches: number) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))
  const expectedLoser = 1 - expectedWinner
  const kWinner = getKFactor(winnerMatches)
  const kLoser = getKFactor(loserMatches)
  return {
    newWinnerElo: winnerElo + kWinner * (1 - expectedWinner),
    newLoserElo: loserElo + kLoser * (0 - expectedLoser)
  }
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

type EloPlayer = { userId: string; elo: number; matchesPlayed: number }

// Team Elo for singles or doubles: each side's strength is the average of its
// players' ratings; the result is applied to every player using their own K-factor.
// Returns the new Elo for each player keyed by userId.
export function calcTeamElo(winners: EloPlayer[], losers: EloPlayer[]): Record<string, number> {
  const avg = (ps: EloPlayer[]) => ps.reduce((s, p) => s + p.elo, 0) / ps.length
  const avgWinner = avg(winners)
  const avgLoser = avg(losers)
  const expWinner = expectedScore(avgWinner, avgLoser)
  const expLoser = 1 - expWinner

  const out: Record<string, number> = {}
  for (const p of winners) out[p.userId] = p.elo + getKFactor(p.matchesPlayed) * (1 - expWinner)
  for (const p of losers) out[p.userId] = p.elo + getKFactor(p.matchesPlayed) * (0 - expLoser)
  return out
}
