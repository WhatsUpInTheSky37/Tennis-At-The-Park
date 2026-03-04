import { formatSkill, skillLabel } from '../lib/utils'

interface Props { level: number; showLabel?: boolean }
export default function SkillDisplay({ level, showLabel }: Props) {
  const pips = Math.round(level)
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="skill-bar">
        {[1,2,3,4,5,6,7].map(i => (
          <span key={i} className={`skill-pip ${i <= pips ? 'filled' : ''}`} />
        ))}
      </span>
      <span className="font-bold text-accent">{formatSkill(level)}</span>
      {showLabel && <span className="text-muted">{skillLabel(level)}</span>}
    </span>
  )
}
