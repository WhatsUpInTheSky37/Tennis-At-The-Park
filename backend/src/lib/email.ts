import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@salisburytennis.com'
const FROM_NAME = process.env.FROM_NAME || 'Tennis at the Park'
const ADMIN_EMAIL = 'wfarrar@pms-corp.net'
const SITE_URL = process.env.FRONTEND_URL || 'https://salisburytennis.com'

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null

async function send(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[EMAIL SKIPPED - no SMTP configured] To: ${to} | Subject: ${subject}`)
    return
  }
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('[EMAIL ERROR]', err)
  }
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
        <li>Track your wins and climb the leaderboard</li>
      </ul>
      <p><a href="${SITE_URL}/dashboard" style="color: #7ffe4a;">Go to your dashboard</a></p>
      <p style="color: #888; font-size: 12px;">Tennis at the Park — created by Will Farrar</p>
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
