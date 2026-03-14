@echo off
set DATABASE_URL=mysql://root:RAILWAY_PASSWORD_REDACTED@nozomi.proxy.rlwy.net:46413/railway
echo Starting applications import at %TIME% >> app-import-log.txt
npx tsx scripts/import-applications.ts >> app-import-log.txt 2>&1
echo Finished at %TIME% with exit code %ERRORLEVEL% >> app-import-log.txt
