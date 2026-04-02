@echo off
REM Set your DATABASE_URL before running
set DATABASE_URL=mysql://root:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/railway
set DRY_RUN=false
npx tsx scripts/cleanup-test-applications.ts
