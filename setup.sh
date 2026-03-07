#!/bin/bash

echo ""
echo "================================================"
echo "   Tennis at the Park — Setup Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()  { echo -e "${GREEN}> $1${NC}"; }
warn(){ echo -e "${YELLOW}! $1${NC}"; }
fail(){ echo -e "${RED}x $1${NC}"; exit 1; }

# Get username
SYSUSER=$(whoami)
echo "System user: $SYSUSER"
echo ""

# Check Node
echo "Checking Node.js..."
if ! command -v node &>/dev/null; then
  warn "Node.js not found. Please install Node.js 20+ from https://nodejs.org"
  exit 1
else
  ok "Node.js installed ($(node -v))"
fi

# Check MySQL
echo "Checking MySQL..."
if ! command -v mysql &>/dev/null; then
  warn "MySQL not found."
  if command -v brew &>/dev/null; then
    echo "Installing MySQL via Homebrew..."
    brew install mysql
    brew services start mysql
    sleep 2
  else
    echo "Please install MySQL:"
    echo "  macOS:   brew install mysql"
    echo "  Ubuntu:  sudo apt install mysql-server"
    echo "  Windows: https://dev.mysql.com/downloads/"
    exit 1
  fi
else
  ok "MySQL installed"
fi

# Start MySQL if not running
if command -v brew &>/dev/null; then
  brew services start mysql 2>/dev/null
elif command -v systemctl &>/dev/null; then
  sudo systemctl start mysql 2>/dev/null
fi
sleep 1
ok "MySQL running"

# Create database
echo "Creating database..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS ultimatetennis;" 2>/dev/null \
  && ok "Database 'ultimatetennis' ready" \
  || warn "Could not create database (you may need to set a root password — see .env.example)"

# Get script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ---- BACKEND ----
echo ""
echo "Setting up backend..."
cd "$DIR/backend"

# Create .env
cat > .env << EOF
DATABASE_URL=mysql://root:@localhost:3306/ultimatetennis
JWT_SECRET=superSecretKey_changeThis_32charsMin!!
PORT=3001
FRONTEND_URL=http://localhost:5173
EOF
ok ".env created"

# Install backend deps
echo "Installing backend dependencies..."
npm install --silent && ok "Backend dependencies installed" || fail "npm install failed"

# Prisma
echo "Running database migrations..."
npx prisma generate --silent && ok "Prisma client generated"
npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
ok "Database migrated"

echo "Seeding database..."
npm run db:seed && ok "Database seeded"

# ---- FRONTEND ----
echo ""
echo "Setting up frontend..."
cd "$DIR/frontend"

npm install --silent && ok "Frontend dependencies installed" || fail "npm install failed"

# Copy logo if present
if [ -f "$DIR/tennis-at-the-park.png" ]; then
  cp "$DIR/tennis-at-the-park.png" "$DIR/frontend/public/tennis-at-the-park.png"
  ok "Logo copied to frontend/public"
fi

echo ""
echo "================================================"
echo -e "${GREEN}  Setup complete!${NC}"
echo "================================================"
echo ""
echo "To start the app, run:"
echo ""
echo "   ./start.sh"
echo ""
echo "Or manually:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo "Admin login: admin@ultimatetennis.app / admin1234"
echo ""
