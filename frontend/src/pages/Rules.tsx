export default function Rules() {
  const rules = [
    {
      num: 1, title: 'Be a Good Sport', icon: '🤝',
      text: 'Respectful communication on and off the court. No harassment, discrimination, or trash talk. De-escalate; report, don\'t retaliate.'
    },
    {
      num: 2, title: 'Honest Profiles Only', icon: '👤',
      text: 'Real display names encouraged. No impersonation. Truthful skill level, availability, and area. Don\'t share others\' personal info without permission.'
    },
    {
      num: 3, title: 'Clear & Accurate Posts', icon: '📋',
      text: 'Include: time window, location, format, approx level, stakes. No bait-and-switch on format or level.'
    },
    {
      num: 4, title: 'Confirm Like a Pro', icon: '✅',
      text: 'Confirm time/court/format/warmup expectations. Running late? Message ETA ASAP. Cancel early — repeated late cancels are not ok.'
    },
    {
      num: 5, title: 'Court Etiquette is Non-Negotiable', icon: '🎾',
      text: 'Respect posted rules and rotation guidelines. Keep noise reasonable. Return balls safely to adjacent courts.'
    },
    {
      num: 6, title: 'Warmups Are Warmups', icon: '🔄',
      text: 'Start with cooperative rallying, then volleys/serves if time allows. Warmup is for both players, not for practicing your serve.'
    },
    {
      num: 7, title: 'Fair Calls & Disputes', icon: '⚖️',
      text: 'Make calls on your own side; when in doubt ball is in. Replay quick disputes. No gamesmanship or deliberate line-call abuse.'
    },
    {
      num: 8, title: 'Honest Scoring', icon: '📊',
      text: 'Report results honestly within 24 hours. Record retirements and time-outs accurately. Don\'t pressure score agreement — use the dispute process.'
    },
    {
      num: 9, title: 'Disputes: Civil and Factual', icon: '🗣️',
      text: 'Resolve politely first. If needed, file a dispute with specifics. No retaliation. Disputes are reviewed by admins.'
    },
    {
      num: 10, title: 'Safety First', icon: '🛡️',
      text: 'Always meet at public courts. Tell a friend when meeting new people. If uncomfortable, you can leave anytime. Credible threats, stalking, or coercion result in immediate suspension.'
    },
    {
      num: 11, title: 'No Spam, Scams, or Solicitation', icon: '🚫',
      text: 'No advertising, selling, recruiting, or phishing. Keep it about tennis.'
    },
    {
      num: 12, title: 'Respect the Community', icon: '🌟',
      text: 'No sandbagging or level-hunting. Be welcoming to new players. Repeated poor behavior results in warnings, cooldown, or suspension.'
    }
  ]

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1 className="page-title">COMMUNITY RULES</h1>
        <p className="page-subtitle">Everyone who plays here agrees to these standards</p>
      </div>

      <div className="alert alert-info mb-6">
        🎾 <strong>Our goal:</strong> A welcoming, honest, and fun tennis community. These rules protect everyone — including you.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rules.map(r => (
          <div key={r.num} className="card">
            <div className="flex gap-3 items-start">
              <span style={{ fontSize: 28 }}>{r.icon}</span>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 1, marginBottom: 6 }}>
                  {r.num}. {r.title.toUpperCase()}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text2)', lineHeight: 1.6 }}>{r.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="disclaimer mt-6">
        <strong>Enforcement:</strong> Violations may result in warnings, account cooldown, or suspension. Serious violations (threats, stalking, harassment) result in immediate suspension. Use the ⚠️ Report button on any session, match, or message to flag issues.
      </div>
    </div>
  )
}
