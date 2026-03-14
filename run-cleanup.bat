@echo off
set DATABASE_URL=mysql://root:RAILWAY_PASSWORD_REDACTED@nozomi.proxy.rlwy.net:46413/railway
set DRY_RUN=false
npx tsx scripts/cleanup-test-applications.ts
