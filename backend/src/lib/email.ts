import { prisma } from './prisma'

const ADMIN_EMAIL = 'wfarrar@pms-corp.net'
const SITE_URL = process.env.FRONTEND_URL || 'https://salisburytennis.com'

// Returns true when the user has email notifications enabled. In-app
// notifications are always on; this is the only opt-out. Missing preference
// rows default to enabled, so users who never visited settings still get email.
export async function shouldEmailUser(userId: string): Promise<boolean> {
  const prefs = await prisma.notificationPreferences.findUnique({ where: { userId } })
  if (!prefs) return true
  return prefs.emailNotifications
}

async function send(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS || ''
  if (!apiKey) {
    console.log(`[EMAIL SKIPPED - no RESEND_API_KEY] To: ${to} | Subject: ${subject}`)
    return
  }

  const fromEmail = process.env.FROM_EMAIL || 'noreply@salisburytennis.com'
  const fromName = process.env.FROM_NAME || 'Tennis at the Park'

  console.log(`[EMAIL] Sending to ${to} | Subject: ${subject}`)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    })

    const data: any = await res.json()
    if (!res.ok) {
      console.error(`[EMAIL ERROR] ${res.status}:`, JSON.stringify(data))
    } else {
      console.log(`[EMAIL] Sent successfully: ${data.id}`)
    }
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send to ${to}:`, err.message || err)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Admin-composed announcement / direct message. The body is plain text written
// in the admin panel; we escape it and preserve line breaks so admins don't
// need to write HTML. Sent from the same no-reply address as every other email.
export async function sendAdminMessageEmail(email: string, displayName: string, subject: string, message: string) {
  const safeBody = escapeHtml(message).replace(/\r?\n/g, '<br>')
  await send(email, subject, `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #7ffe4a;">${escapeHtml(subject)}</h2>
      <p>Hi ${escapeHtml(displayName)},</p>
      <div style="color: #333; line-height: 1.6;">${safeBody}</div>
      <p style="margin-top: 20px;"><a href="${SITE_URL}/dashboard" style="color: #7ffe4a;">Visit Tennis at the Park</a></p>
      <p style="color: #888; font-size: 12px;">Tennis at the Park — Salisbury, MD. You're receiving this because you have an account on the site.</p>
    </div>
  `)
}

export async function sendWelcomeEmail(email: string, displayName: string) {
  await send(email, 'Welcome to Tennis at the Park!', `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #7ffe4a;">Welcome, ${displayName}!</h2>
      <p>Thanks for joining <strong>Tennis at the Park</strong> — the Salisbury, Maryland tennis community.</p>
      <p>Here's what you can do:</p>
      <ul>
        <li>Find and message other players</li>
        <li>Plan sessions at local courts</li>
        <li>Challenge players to matches</li>
        <li>Join Challenge Events and ladders</li>
        <li>Track your wins and climb the leaderboard</li>
      </ul>
      <p><a href="${SITE_URL}/dashboard" style="color: #7ffe4a;">Go to your dashboard</a></p>
      <p style="color: #888; font-size: 12px;">Tennis at the Park — created by Will Farrar</p>
    </div>
  `)
}

// Sent when an admin creates an account for someone — includes a temporary
// password so they can sign in right away and then change it.
export async function sendInviteEmail(email: string, displayName: string, tempPassword: string) {
  await send(email, "You're invited to Tennis at the Park 🎾", `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #7ffe4a;">You're in, ${escapeHtml(displayName)}!</h2>
      <p>An account has been created for you on <strong>Tennis at the Park</strong> — the Salisbury, Maryland tennis community. You can sign in right now:</p>
      <p style="background: #f4f4f4; border-radius: 8px; padding: 14px 16px; color: #222;">
        <strong>Email:</strong> ${escapeHtml(email)}<br>
        <strong>Temporary password:</strong> ${escapeHtml(tempPassword)}
      </p>
      <p><a href="${SITE_URL}/auth" style="color: #7ffe4a;">Sign in here</a> — then head to your profile to set your own password.</p>
      <p style="color: #888; font-size: 12px;">If you weren't expecting this, you can safely ignore this email. Tennis at the Park — Salisbury, MD.</p>
    </div>
  `)
}

export async function sendAdminNewSignupEmail(displayName: string, email: string) {
  await send(ADMIN_EMAIL, `New signup: ${displayName}`, `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h3>New Player Signed Up</h3>
      <p><strong>${displayName}</strong> (${email}) just created an account on Tennis at the Park.</p>
      <p><a href="${SITE_URL}/admin" style="color: #7ffe4a;">View Admin Panel</a></p>
    </div>
  `)
}

export async function sendNewMessageEmail(recipientEmail: string, recipientName: string, senderName: string, messagePreview: string) {
  await send(recipientEmail, `New message from ${senderName}`, `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h3 style="color: #7ffe4a;">New Message</h3>
      <p>Hey ${recipientName}, <strong>${senderName}</strong> sent you a message:</p>
      <div style="background: #1a1f2e; color: #e6edf3; padding: 14px; border-radius: 8px; margin: 12px 0;">
        ${messagePreview.length > 200 ? messagePreview.slice(0, 200) + '...' : messagePreview}
      </div>
      <p><a href="${SITE_URL}/messages" style="color: #7ffe4a;">View your messages</a></p>
      <p style="color: #888; font-size: 12px;">Tennis at the Park — Salisbury, MD</p>
    </div>
  `)
}

export async function sendChallengeEmail(recipientEmail: string, recipientName: string, challengerName: string, format: string, locationName: string, proposedTime: Date) {
  const dateStr = proposedTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  await send(recipientEmail, `${challengerName} challenged you!`, `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h3 style="color: #7ffe4a;">You've Been Challenged!</h3>
      <p>Hey ${recipientName}, <strong>${challengerName}</strong> wants to play:</p>
      <div style="background: #1a1f2e; color: #e6edf3; padding: 14px; border-radius: 8px; margin: 12px 0;">
        <p style="margin: 4px 0;"><strong>Format:</strong> ${format}</p>
        <p style="margin: 4px 0;"><strong>Where:</strong> ${locationName}</p>
        <p style="margin: 4px 0;"><strong>When:</strong> ${dateStr}</p>
      </div>
      <p><a href="${SITE_URL}/challenges" style="color: #7ffe4a;">Accept or decline</a></p>
      <p style="color: #888; font-size: 12px;">Tennis at the Park — Salisbury, MD</p>
    </div>
  `)
}

export async function sendForumReplyEmail(recipientEmail: string, recipientName: string, fromName: string, postSubject: string, postId: string, bodyPreview: string) {
  const preview = bodyPreview.length > 200 ? bodyPreview.slice(0, 200) + '…' : bodyPreview
  await send(recipientEmail, `${fromName} replied to "${postSubject}"`, `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h3 style="color: #7ffe4a;">New reply on your post</h3>
      <p>Hey ${recipientName}, <strong>${fromName}</strong> replied to <em>${postSubject}</em>:</p>
      <div style="background: #1a1f2e; color: #e6edf3; padding: 14px; border-radius: 8px; margin: 12px 0;">${preview}</div>
      <p><a href="${SITE_URL}/forum/${postId}" style="color: #7ffe4a;">View the thread</a></p>
      <p style="color: #888; font-size: 12px;">Tennis at the Park — Salisbury, MD</p>
    </div>
  `)
}

export async function sendForumMentionEmail(recipientEmail: string, recipientName: string, fromName: string, postSubject: string, postId: string, bodyPreview: string) {
  const preview = bodyPreview.length > 200 ? bodyPreview.slice(0, 200) + '…' : bodyPreview
  await send(recipientEmail, `${fromName} mentioned you in "${postSubject}"`, `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h3 style="color: #7ffe4a;">You were mentioned</h3>
      <p>Hey ${recipientName}, <strong>${fromName}</strong> mentioned you in <em>${postSubject}</em>:</p>
      <div style="background: #1a1f2e; color: #e6edf3; padding: 14px; border-radius: 8px; margin: 12px 0;">${preview}</div>
      <p><a href="${SITE_URL}/forum/${postId}" style="color: #7ffe4a;">View the thread</a></p>
      <p style="color: #888; font-size: 12px;">Tennis at the Park — Salisbury, MD</p>
    </div>
  `)
}

export async function sendSessionInviteEmail(recipientEmail: string, recipientName: string, fromName: string, locationName: string, startTime: Date, sessionId: string) {
  const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  await send(recipientEmail, `${fromName} invited you to a session`, `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h3 style="color: #7ffe4a;">You're invited to play</h3>
      <p>Hey ${recipientName}, <strong>${fromName}</strong> invited you to a session:</p>
      <div style="background: #1a1f2e; color: #e6edf3; padding: 14px; border-radius: 8px; margin: 12px 0;">
        <p style="margin: 4px 0;"><strong>Where:</strong> ${locationName}</p>
        <p style="margin: 4px 0;"><strong>When:</strong> ${dateStr}</p>
      </div>
      <p>You count as "possible" until you respond or the session starts.</p>
      <p><a href="${SITE_URL}/sessions/${sessionId}" style="color: #7ffe4a;">View session</a></p>
      <p style="color: #888; font-size: 12px;">Tennis at the Park — Salisbury, MD</p>
    </div>
  `)
}
