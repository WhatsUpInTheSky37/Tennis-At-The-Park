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
