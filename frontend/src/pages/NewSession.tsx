import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { api } from '../api/client'
import { Button, Input, Select, Textarea, Alert, Card, Toggle } from '../components/ui'
import { PageHeader, PageContainer, PublicCourtDisclaimer } from '../components/layout/Layout'
import { format, addHours } from 'date-fns'

function toLocalDatetimeString(date: Date): string {
  const off = date.getTimezoneOffset()
  const local = new Date(date.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}

export default function NewSessionPage() {
  const { user, locations, afterDarkHour } = useStore()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [afterDarkWarning, setAfterDarkWarning] = useState(false)
  const [afterDarkConfirmed, setAfterDarkConfirmed] = useState(false)

  const now = new Date()
  const defaultStart = addHours(now, 1)
  defaultStart.setMinutes(0, 0, 0)

  const [form, setForm] = useState({
    locationId: locations[0]?.id || '',
    courtNumber: '',
    flexibleCourt: false,
    startTime: toLocalDatetimeString(defaultStart),
    endTime: toLocalDatetimeString(new Date(defaultStart.getTime() + 90 * 60000)),
    format: 'singles',
    stakes: 'casual',
    levelMin: '2.5',
    levelMax: '4.5',
    notes: '',
  })

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const selectedLocation = locations.find((l) => l.id === form.locationId)
  const courtOptions = selectedLocation
    ? [
        { value: '', label: form.flexibleCourt ? 'Flexible — pick on arrival' : 'Select court...' },
        ...Array.from({ length: selectedLocation.courtCount }, (_, i) => ({
          value: String(i + 1),
          label: `Court ${i + 1}`,
        })),
      ]
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    setError('')

    const start = new Date(form.startTime)
    const end = new Date(form.endTime)
    if (end <= start) { setError('End time must be after start time.'); return }

    // Check after-dark
    if (selectedLocation && !selectedLocation.lighted) {
      const isAfterDark = start.getHours() >= afterDarkHour || end.getHours() >= afterDarkHour
      if (isAfterDark && !afterDarkConfirmed) {
        setAfterDarkWarning(true)
        return
      }
    }

    setLoading(true)
    try {
      const data: any = {
        locationId: form.locationId,
        courtNumber: form.flexibleCourt || !form.courtNumber ? null : parseInt(form.courtNumber),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        format: form.format,
        stakes: form.stakes,
        levelMin: parseFloat(form.levelMin),
        levelMax: parseFloat(form.levelMax),
        notes: form.notes,
        afterDarkConfirmed: afterDarkConfirmed || false,
      }

      const session = await api.createSession(data)
      navigate(`/sessions/${session.id}`)
    } catch (err: any) {
      if (err.error === 'AFTER_DARK_WARNING') {
        setAfterDarkWarning(true)
      } else {
        setError(err.error || 'Could not create session. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in">
      <PageHeader title="PLAN A SESSION" subtitle="Coordinate a meetup at a public court" back />
      <PageContainer style={{ paddingBottom: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PublicCourtDisclaimer />

          {afterDarkWarning && (
            <Alert variant="warn">
              <strong>⚠️ After-Dark Warning</strong><br />
              {selectedLocation?.name} is <strong>not lighted</strong>. Planning after {afterDarkHour}:00 may not be practical.
              Please confirm you understand.<br />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Button size="sm" variant="secondary" onClick={() => { setAfterDarkConfirmed(true); setAfterDarkWarning(false) }}>
                  Confirm — I understand
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAfterDarkWarning(false)}>
                  Change time
                </Button>
              </div>
            </Alert>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          <Card>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <Select
                label="Location"
                value={form.locationId}
                onChange={(e) => { update('locationId', e.target.value); update('courtNumber', '') }}
                options={locations.map((l) => ({
                  value: l.id,
                  label: `${l.name} ${l.lighted ? '💡' : '🌑'} (${l.courtCount} courts)`,
                }))}
                required
              />

              {selectedLocation && (
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '14px', color: 'var(--text-dim)' }}>
                  {selectedLocation.lighted ? (
                    <span>💡 <strong>Lighted facility</strong> — night play is fine</span>
                  ) : (
                    <span>🌑 <strong>No lighting</strong> — daytime play recommended. After-{afterDarkHour}:00 sessions will require confirmation.</span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Toggle
                  checked={form.flexibleCourt}
                  onChange={(v) => { update('flexibleCourt', v); update('courtNumber', '') }}
                  label="Flexible court — I'll pick one when I arrive"
                />

                {!form.flexibleCourt && (
                  <Select
                    label="Intended Court"
                    value={form.courtNumber}
                    onChange={(e) => update('courtNumber', e.target.value)}
                    options={courtOptions}
                    required={!form.flexibleCourt}
                  />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Start Time"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                  required
                />
                <Input
                  label="End Time"
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => update('endTime', e.target.value)}
                  required
                />
              </div>

              <Select
                label="Format"
                value={form.format}
                onChange={(e) => update('format', e.target.value)}
                options={[
                  { value: 'singles', label: 'Singles (1v1)' },
                  { value: 'doubles', label: 'Doubles (2v2)' },
                  { value: 'mixed_doubles', label: 'Mixed Doubles' },
                  { value: 'practice', label: 'Practice / Rally' },
                ]}
              />

              <Select
                label="Stakes"
                value={form.stakes}
                onChange={(e) => update('stakes', e.target.value)}
                options={[
                  { value: 'casual', label: 'Casual — just for fun' },
                  { value: 'competitive', label: 'Competitive — serious play' },
                  { value: 'match_play', label: 'Match play — full scoring' },
                ]}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Select
                  label="Min NTRP"
                  value={form.levelMin}
                  onChange={(e) => update('levelMin', e.target.value)}
                  options={['1.5','2.0','2.5','3.0','3.5','4.0','4.5','5.0','5.5','6.0'].map(v => ({ value: v, label: v }))}
                />
                <Select
                  label="Max NTRP"
                  value={form.levelMax}
                  onChange={(e) => update('levelMax', e.target.value)}
                  options={['1.5','2.0','2.5','3.0','3.5','4.0','4.5','5.0','5.5','6.0'].map(v => ({ value: v, label: v }))}
                />
              </div>

              <Textarea
                label="Notes (optional)"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Warmup expectations, special instructions, who to text on arrival..."
                maxLength={1000}
              />

              <Button type="submit" fullWidth loading={loading} size="lg">
                Create Meetup Plan
              </Button>
            </form>
          </Card>

          <Alert variant="info">
            <strong>Confirm like a pro:</strong> Once players join, message them to confirm time, court, format, and warmup expectations. If you need to cancel, do it early — repeated last-minute cancels may affect your standing.
          </Alert>
        </div>
      </PageContainer>
    </div>
  )
}
