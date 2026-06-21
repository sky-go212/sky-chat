#!/bin/bash
set -e

echo "=== SubServer Chat Deploy Script ==="

# Build frontend
echo "[1/4] Building frontend..."
npm run build

# Deploy Workers backend
echo "[2/4] Deploying Workers backend..."
cd workers
npx wrangler deploy
cd ..

# Deploy frontend ke Cloudflare Pages
echo "[3/4] Deploying frontend to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=sky-chat-frontend

echo "[4/4] Done!"
echo "Backend: https://subserver-chat.workers.dev"
echo "Frontend: https://sky-chat-frontend.pages.dev"
