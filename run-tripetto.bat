@echo off
set DATABASE_URL=mysql://root:RAILWAY_PASSWORD_REDACTED@nozomi.proxy.rlwy.net:46413/railway
npx tsx scripts/import-tripetto-inquiries.ts > tripetto-log.txt 2>&1
echo exit=%ERRORLEVEL% >> tripetto-log.txt
