#!/usr/bin/env bash
# Run on the production server (e.g. /var/www/eatix-backend) after git pull.
# Adds POST /v1/users/social-login and signup without email OTP.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Installing dependencies..."
npm install

echo "==> Prisma generate + migrate..."
npx prisma generate
npx prisma migrate deploy

echo "==> Building NestJS..."
npm run build

echo "==> Restarting PM2..."
if pm2 describe eatix-backend >/dev/null 2>&1; then
  pm2 restart eatix-backend
elif pm2 describe eatix-api >/dev/null 2>&1; then
  pm2 restart eatix-api
else
  pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js
fi
pm2 save

echo "==> Smoke test social-login route..."
HTTP_CODE=$(curl -s -o /tmp/social-test.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:9001/v1/users/social-login" \
  -H "Content-Type: application/json" \
  -d '{"provider":"google","idToken":"invalid"}' || echo "000")

if [ "$HTTP_CODE" = "404" ]; then
  echo "FAIL: social-login still 404 on localhost:9001. Check PM2 app path and build output."
  cat /tmp/social-test.json 2>/dev/null || true
  exit 1
fi

echo "OK: social-login responded HTTP $HTTP_CODE (400 expected for invalid token)."
echo "Also set GOOGLE_CLIENT_ID in .env to Firebase Web client:"
echo "  236298500212-810ubvv2taqs55m35pgvg0h795so6u68.apps.googleusercontent.com"
echo "Then: pm2 restart eatix-backend --update-env"
