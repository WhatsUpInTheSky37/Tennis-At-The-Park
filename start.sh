#!/bin/bash

echo ""
echo "================================================"
echo "   🎾 Tennis at the Park — Starting App"
echo "================================================"
echo ""

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Make sure MySQL is running
if command -v brew &>/dev/null; then
  brew services start mysql 2>/dev/null
elif command -v systemctl &>/dev/null; then
  sudo systemctl start mysql 2>/dev/null
fi

# Start backend in background
echo "Starting backend..."
cd "$DIR/backend"
npm run dev &
BACKEND_PID=$!

sleep 3

# Start frontend
echo "Starting frontend..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

sleep 2

echo ""
echo "================================================"
echo "  ✅ App is running!"
echo "  Open: http://localhost:5173"
echo "  Press Ctrl+C to stop both servers"
echo "================================================"
echo ""

# Wait and clean up on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'; exit" INT
wait
