import { format, formatDistanceToNow, isAfter } from 'date-fns'

export function formatTime(d: string | Date) {
  return format(new Date(d), 'h:mm a')
}

export function formatDate(d: string | Date) {
  return format(new Date(d), 'EEE, MMM d')
}

export function formatDateTime(d: string | Date) {
  return format(new Date(d), 'EEE, MMM d · h:mm a')
}

export function formatRelative(d: string | Date) {
  return formatDistanceToNow(new Date(d), { addSuffix: true })
}

// Profile cover-banner gradient presets, shared by Profile + Find Players.
export const BANNER_PRESETS: Record<string, string> = {
  court: 'linear-gradient(135deg, #0b3d2e 0%, #0a0c0f 100%)',
  night: 'linear-gradient(135deg, #0c1a3a 0%, #05060a 100%)',
  sunset: 'linear-gradient(135deg, #ff7e3f 0%, #7a1f4b 100%)',
  clay: 'linear-gradient(135deg, #c1572e 0%, #2a1611 100%)',
  grass: 'linear-gradient(135deg, #2f7d32 0%, #0c2a14 100%)',
  hardcourt: 'linear-gradient(135deg, #1d6fb8 0%, #0a1a2a 100%)',
}
export const DEFAULT_BANNER = 'court'
export function bannerStyle(key?: string | null): string {
  return BANNER_PRESETS[key || DEFAULT_BANNER] || BANNER_PRESETS[DEFAULT_BANNER]
}

// A player is "online" if active within the last 5 minutes.
export function isOnline(lastActive?: string | Date | null): boolean {
  if (!lastActive) return false
  return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000
}

export function isAfterDark(d: string | Date, afterDarkHour = 20): boolean {
  const dt = new Date(d)
  return dt.getHours() >= afterDarkHour
}

export function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export function formatSkill(level: number) {
  const labels: Record<number, string> = {
    1: '1.0', 2: '2.0', 3: '3.0', 4: '3.5', 5: '4.0', 6: '4.5', 7: '5.0+'
  }
  return labels[Math.round(level)] || level.toFixed(1)
}

export function skillLabel(level: number): string {
  if (level <= 1.5) return 'Beginner'
  if (level <= 2.5) return 'Intermediate'
  if (level <= 3.5) return 'Advanced Intermediate'
  if (level <= 4.5) return 'Advanced'
  return 'Expert'
}

export function copyText(text: string) {
  return navigator.clipboard.writeText(text)
}

export function generateSessionSummary(session: any, location: any): string {
  const lines = [
    '🎾 TENNIS MEETUP PLAN',
    `📍 ${location?.name || 'TBD'}`,
    `🏟  ${session.flexibleCourt ? 'Flexible court (pick on arrival)' : `Court ${session.courtNumber}`}`,
    `📅 ${formatDateTime(session.startTime)} – ${formatTime(session.endTime)}`,
    `🎮 Format: ${session.format}`,
    `💰 Stakes: ${session.stakes}`,
    `📊 Level: ${formatSkill(session.levelMin)}–${formatSkill(session.levelMax)} NTRP`,
    session.notes ? `📝 Notes: ${session.notes}` : '',
    '',
    '⚠️  Public courts are first-come/rotation-based. This is a coordination tool, not a reservation.',
    `🔗 ${window.location.origin}/sessions/${session.id}`
  ].filter(Boolean)
  return lines.join('\n')
}

export function generateICS(session: any, location: any): string {
  const start = new Date(session.startTime)
  const end = new Date(session.endTime)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tennis at the Park//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Tennis @ ${location?.name}`,
    `DESCRIPTION:${session.format} · ${session.stakes} · Court ${session.courtNumber || 'flexible'}\\n\\nPublic courts are first-come. This is a coordination only.`,
    `LOCATION:${location?.name}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
}
