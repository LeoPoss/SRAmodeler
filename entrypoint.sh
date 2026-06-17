#!/bin/sh
set -e

cd /usr/src/app

echo "==> Pushing database schema..."
npx drizzle-kit push

echo "==> Checking if seed needed..."
ROW_COUNT=$(node -e "const Database=require('better-sqlite3');const db=new Database('sra.db');console.log(db.prepare('SELECT COUNT(*) as c FROM business_process').get().c)")

if [ "$ROW_COUNT" -eq 0 ]; then
  echo "==> Seeding database..."
  npx tsx src/db/seed.ts
else
  echo "==> Database already seeded, skipping."
fi

echo "==> Starting server..."
exec node .output/server/index.mjs
