# 🎾 Ultimate Tennis

A production-grade, browser-first community tennis app for public court players.

**Features:** Match finder · Session planner · Match recorder · Elo ratings · Leaderboards · Player profiles · Invites · Session messaging · Reporting & disputes

---

## ⚠️ Public Courts Disclaimer

This app coordinates meetups only. It does **not** reserve courts.
Public courts are first-come/rotation-based per their posted rules.

**Locations:**
- **City Park Courts** — 4 courts (Court 1–4) · 💡 Lighted (night play ok)
- **Winterplace Park Courts** — 2 courts (Court 1–2) · 🌙 Not lighted (daylight only)

---

## 🛠 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone & Install

```bash
git clone https://github.com/yourorg/ultimate-tennis
cd ultimate-tennis

# Backend
cd backend
npm install
npx prisma generate

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

**backend/.env**
```
DATABASE_URL="postgresql://user:password@localhost:5432/ultimatetennis"
JWT_SECRET="your-secret-at-least-32-chars-long!!"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

**frontend/.env**
```
VITE_API_URL=/api
```

### 3. Database Setup

```bash
cd backend

# Run migrations
npx prisma migrate dev --name init

# Seed locations + admin user
npm run db:seed
# Admin credentials: admin@ultimatetennis.app / admin1234
```

### 4. Start Dev Servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

---

## 🚀 Production Deployment

### Option A: Railway (Recommended — easiest)

1. Create project on [Railway](https://railway.app)
2. Add PostgreSQL service
3. Deploy backend from `/backend` folder — set env vars:
   - `DATABASE_URL` (auto-populated from Postgres service)
   - `JWT_SECRET`
   - `FRONTEND_URL` (your frontend domain)
4. Deploy frontend from `/frontend` folder — set:
   - `VITE_API_URL=/api`
   - In `vite.config.ts`, update proxy target to your backend URL

### Option B: Render

1. Create Web Service for backend (Node, `npm run build && node dist/index.js`)
2. Create Static Site for frontend (`npm run build`, publish `dist/`)
3. Add Render PostgreSQL database
4. Set environment variables in Render dashboard

### Option C: VPS (e.g., DigitalOcean/Hetzner)

```bash
# Install Node, PostgreSQL, Nginx, PM2

# Backend
cd backend
npm ci
npm run build
DATABASE_URL="..." JWT_SECRET="..." pm2 start dist/index.js --name tennis-api

# Frontend
cd frontend
npm ci
npm run build
# Serve dist/ via Nginx

# Nginx config example
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:3001/;
    }

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### Run Migrations in Production

```bash
cd backend
DATABASE_URL="..." npx prisma migrate deploy
DATABASE_URL="..." npm run db:seed
```

---

## 🔑 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Backend |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) | ✅ Backend |
| `PORT` | Backend port (default: 3001) | Optional |
| `FRONTEND_URL` | Frontend URL for CORS | Backend |
| `VITE_API_URL` | Backend API base URL | Frontend |

---

## 📚 How to Use — End User Guide

### Getting Started
1. **Open in your browser** — No install needed. Visit the app URL on any phone or desktop.
2. **Create your profile** — Enter your email, password, and display name. Add your NTRP skill level, handedness, and bio.
3. **Enable "Looking to Play"** — Toggle this on your profile/dashboard so others can find you.

### Planning a Session
1. Click **+ Plan Session** from the Dashboard or Schedule page.
2. Choose your **Intended Court Location** and **Court number** (or Flexible).
3. Set your **date/time range**, **format** (singles/doubles), **level range**, and **stakes**.
4. Add notes (warmup expectations, equipment, etc.).
5. **Share** the session link or copy a summary to text/email your group.
6. **Download .ics** to add to your calendar.

> ⚠️ **Remember:** Public courts are first-come. Arrive early and follow posted rotation rules if courts are occupied.

### Finding Players
- Go to **Find Players** and filter by skill level.
- Players who have "Looking to Play" enabled appear here.
- Click a player to view their profile, then invite them to a session.

### Recording a Match
1. Click **Record Match** from any page.
2. Select location, court, format, and opponent.
3. Enter set scores and click the winner.
4. Submit — the match is **pending confirmation** until your opponent confirms.
5. **Elo ratings update** only after confirmation.

### Elo Rating System
- Start: 1200
- K-factor: 40 (first 10 matches), 24 (10–30), 16 (30+)
- View leaderboards by Elo, total wins, or win streak.

### Disputes
- If a match result is incorrect, click **Dispute** on the match.
- Elo updates are paused while disputes are open.
- Disputes are reviewed by admins. Be civil and factual.

### Reporting
- Use the **⚠️ Report** button on sessions, matches, or messages.
- Categories: harassment, sandbagging, no-show, dishonest score, spam, safety, other.
- Admins review all reports. Violations result in warnings, cooldowns, or suspension.

### Community Rules
See the full rules at **/rules**. Key highlights:
- Be respectful. No trash talk.
- Report scores honestly within 24 hours.
- Confirm sessions early. Cancel early if needed.
- Meet at public courts. Tell a friend.

---

## 🗂 Project Structure

```
ultimate-tennis/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── src/
│       ├── index.ts             # Fastify server
│       ├── lib/
│       │   ├── prisma.ts        # DB client
│       │   └── elo.ts           # Elo calculation
│       ├── middleware/
│       │   └── auth.ts          # Enforcement checks
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── sessions.ts
│       │   ├── matches.ts
│       │   ├── profiles.ts
│       │   ├── players.ts
│       │   ├── leaderboards.ts
│       │   ├── reports.ts
│       │   └── admin.ts
│       └── seed.ts
└── frontend/
    └── src/
        ├── App.tsx
        ├── styles.css
        ├── lib/
        │   ├── api.ts           # API client
        │   └── utils.ts         # Helpers
        ├── store/
        │   └── auth.ts          # Zustand auth store
        ├── components/
        │   ├── TopNav.tsx
        │   ├── BottomNav.tsx
        │   ├── SessionCard.tsx
        │   ├── LocationBadge.tsx
        │   ├── SkillDisplay.tsx
        │   ├── DisclaimerBox.tsx
        │   └── OfflineBanner.tsx
        └── pages/
            ├── Landing.tsx
            ├── Auth.tsx
            ├── Dashboard.tsx
            ├── Sessions.tsx
            ├── CreateSession.tsx
            ├── SessionDetail.tsx
            ├── Matches.tsx
            ├── RecordMatch.tsx
            ├── Leaderboards.tsx
            ├── Profile.tsx
            ├── FindPlayers.tsx
            ├── Rules.tsx
            └── Admin.tsx
```

---

## 🔒 Security Notes

- Passwords hashed with **argon2**
- Auth via **JWT** (Bearer token)
- Input validated with **Zod** on all endpoints
- Email never exposed in public API responses
- Enforcement model blocks suspended/cooldown users from creating sessions/messages
- Admin endpoints require `isAdmin` flag on JWT
- Rate limiting: 100 req/min global (configure message routes tighter in production)

