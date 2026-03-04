interface Props { lighted: boolean; compact?: boolean }
export default function LocationBadge({ lighted, compact }: Props) {
  return (
    <span className={`badge ${lighted ? 'badge-green' : 'badge-gray'}`} title={lighted ? 'Lighted courts (night play ok)' : 'No lights (daylight only)'}>
      {lighted ? '💡' : '🌙'} {!compact && (lighted ? 'Lighted' : 'No lights')}
    </span>
  )
}
