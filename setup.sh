#!/bin/bash

echo ""
echo "================================================"
echo "   🎾 Tennis at the Park — Setup Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()  { echo -e "${GREEN}✓ $1${NC}"; }
warn(){ echo -e "${YELLOW}⚠ $1${NC}"; }
fail(){ echo -e "${RED}✗ $1${NC}"; exit 1; }

# Get Mac username
MACUSER=$(whoami)
echo "Mac username: $MACUSER"
echo ""

# Check Homebrew
echo "Checking Homebrew..."
if ! command -v brew &>/dev/null; then
  warn "Homebrew not found. Installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  ok "Homebrew installed"
fi

# Check Node
echo "Checking Node.js..."
if ! command -v node &>/dev/null; then
  warn "Node.js not found. Installing..."
  brew install node
else
  ok "Node.js installed ($(node -v))"
fi

# Check PostgreSQL
echo "Checking PostgreSQL..."
if ! command -v psql &>/dev/null; then
  warn "PostgreSQL not found. Installing..."
  brew install postgresql@16
  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
  echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
else
  ok "PostgreSQL installed"
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null
sleep 2
ok "PostgreSQL running"

# Create database
echo "Creating database..."
createdb ultimatetennis 2>/dev/null && ok "Database created" || warn "Database already exists (that's fine)"

# Get script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ---- BACKEND ----
echo ""
echo "Setting up backend..."
cd "$DIR/backend"

# Create .env
cat > .env << EOF
DATABASE_URL=postgresql://${MACUSER}@localhost:5432/ultimatetennis
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
echo -e "${GREEN}  ✅ Setup complete!${NC}"
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
