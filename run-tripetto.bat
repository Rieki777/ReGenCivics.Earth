@echo off
REM Set your DATABASE_URL before running
set DATABASE_URL=mysql://root:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/railway
npx tsx scripts/import-tripetto-inquiries.ts > tripetto-log.txt 2>&1
echo exit=%ERRORLEVEL% >> tripetto-log.txt
