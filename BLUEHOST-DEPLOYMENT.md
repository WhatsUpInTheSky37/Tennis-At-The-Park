# Deploying Tennis at the Park on Bluehost

This guide covers deploying the app at **https://www.willfarrar.net/tennis**
using Bluehost with MySQL.

---

## Hosting Plan Requirements

**Bluehost VPS or Dedicated** is recommended because the backend runs Node.js,
which is not supported on Bluehost's basic shared hosting plans.

| Plan Type | Node.js Support | MySQL | Recommended |
|-----------|----------------|-------|-------------|
| Basic Shared | No (PHP only) | Yes | No |
| VPS | Yes (full root) | Yes | Yes |
| Dedicated | Yes (full root) | Yes | Yes |

If you are on **shared hosting only**, see the "Shared Hosting Alternative"
section at the bottom.

---

## Step 1: Create the MySQL Database

1. Log into **Bluehost cPanel** (bluehost.com/my-account)
2. Go to **Databases > MySQL Databases**
3. Create a new database: `ultimatetennis`
   - Bluehost will prefix it with your cPanel username, e.g. `willfarr_ultimatetennis`
4. Create a database user with a strong password
5. Add the user to the database with **ALL PRIVILEGES**
6. Note your credentials:
   ```
   Host:     localhost
   Database: willfarr_ultimatetennis
   User:     willfarr_tennisuser
   Password: (your password)
   ```

---

## Step 2: Configure Environment Variables

Create a `.env` file in the `backend/` directory on the server:

```env
DATABASE_URL="mysql://willfarr_tennisuser:YOUR_PASSWORD@localhost:3306/willfarr_ultimatetennis"
JWT_SECRET="generate-a-random-64-char-string-here"
PORT=3001
FRONTEND_URL="https://www.willfarrar.net"
```

To generate a secure JWT secret:
```bash
openssl rand -base64 48
```

---

## Step 3: Deploy Backend (VPS/Dedicated)

SSH into your Bluehost VPS:

```bash
ssh root@your-server-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager to keep the app running)
npm install -g pm2

# Clone the repo
cd /var/www
git clone https://github.com/YOUR_USERNAME/Tennis-At-The-Park.git
cd Tennis-At-The-Park/backend

# Install dependencies
npm install

# Copy your .env file (see Step 2)
nano .env

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Seed the database
npm run db:seed

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/index.js --name tennis-api
pm2 save
pm2 startup
```

---

## Step 4: Deploy Frontend

The frontend is configured to serve from the `/tennis` subpath.

```bash
cd /var/www/Tennis-At-The-Park/frontend

# Create production env
echo 'VITE_API_URL=/tennis/api' > .env

# Install and build
npm install
npm run build

# Create the /tennis directory and copy built files
mkdir -p /var/www/willfarrar.net/public_html/tennis
cp -r dist/* /var/www/willfarrar.net/public_html/tennis/
```

---

## Step 5: Configure Nginx (Reverse Proxy)

Create `/etc/nginx/sites-available/willfarrar.net`:

```nginx
server {
    listen 80;
    server_name willfarrar.net www.willfarrar.net;

    root /var/www/willfarrar.net/public_html;
    index index.html;

    # Main site root (if you have other content at willfarrar.net/)
    location / {
        try_files $uri $uri/ =404;
    }

    # Tennis app — frontend (static files with SPA routing)
    location /tennis {
        alias /var/www/willfarrar.net/public_html/tennis;
        try_files $uri $uri/ /tennis/index.html;
    }

    # Tennis app — API reverse proxy
    location /tennis/api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and add SSL:

```bash
ln -s /etc/nginx/sites-available/willfarrar.net /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Add free SSL with Let's Encrypt
apt install certbot python3-certbot-nginx
certbot --nginx -d willfarrar.net -d www.willfarrar.net
```

---

## Step 6: Point Your Domain

In Bluehost DNS settings (or your domain registrar):

| Type | Name | Value |
|------|------|-------|
| A | @ | Your VPS IP address |
| A | www | Your VPS IP address |

---

## Step 7: Verify Everything Works

```bash
# Check API health
curl https://www.willfarrar.net/tennis/api/health
# Should return: {"status":"ok"}

# Check frontend
open https://www.willfarrar.net/tennis
# Should show the Tennis at the Park landing page

# Check PM2 status
pm2 status
```

The app will be live at: **https://www.willfarrar.net/tennis**

All routes will work under that path:
- `https://www.willfarrar.net/tennis/` — Landing page
- `https://www.willfarrar.net/tennis/dashboard` — Dashboard
- `https://www.willfarrar.net/tennis/sessions` — Sessions
- `https://www.willfarrar.net/tennis/leaderboards` — Leaderboards
- etc.

---

## Updating the App

```bash
cd /var/www/Tennis-At-The-Park
git pull

# Backend
cd backend
npm install
npx prisma migrate deploy
npm run build
pm2 restart tennis-api

# Frontend
cd ../frontend
npm install
npm run build
cp -r dist/* /var/www/willfarrar.net/public_html/tennis/
```

---

## Shared Hosting Alternative

If you only have Bluehost **shared hosting** (no VPS), Node.js cannot run
directly. You have two options:

### Option A: Split Architecture (Recommended)
- **Frontend** on Bluehost shared hosting (it's just static HTML/JS/CSS)
- **Backend API** on a free/cheap Node.js host:
  - [Railway](https://railway.app) — free tier available
  - [Render](https://render.com) — free tier available
  - [Fly.io](https://fly.io) — free tier available

For the split setup, update `VITE_API_URL` before building:
```bash
echo 'VITE_API_URL=https://your-api.railway.app' > .env
npm run build
```

Then upload the `dist/` folder contents to `public_html/tennis/` on Bluehost
via cPanel File Manager.

### Option B: Upgrade Bluehost Plan
Upgrade to Bluehost VPS ($29.99/mo) which gives you full root SSH access
and the ability to run Node.js, PM2, and Nginx as described above.

---

## MySQL Tips for Bluehost

- Bluehost MySQL version is typically 8.0+, which works great with Prisma
- Database host is `localhost` (not a remote IP)
- cPanel prefixes database and user names with your account username
- Use phpMyAdmin (available in cPanel) to inspect your database visually
- MySQL connection limit on shared hosting is typically 25 concurrent connections
  (more than enough for this app)
