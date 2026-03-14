@echo off
set DATABASE_URL=mysql://root:RAILWAY_PASSWORD_REDACTED@nozomi.proxy.rlwy.net:46413/railway
echo Starting at %TIME% > last-imports-log.txt
echo === Video Suggestions === >> last-imports-log.txt
npx tsx scripts/import-video-suggestions.ts >> last-imports-log.txt 2>&1
echo EXIT_VS=%ERRORLEVEL% >> last-imports-log.txt
echo === Tripetto Inquiries === >> last-imports-log.txt
npx tsx scripts/import-tripetto-inquiries.ts >> last-imports-log.txt 2>&1
echo EXIT_TI=%ERRORLEVEL% >> last-imports-log.txt
echo Done at %TIME% >> last-imports-log.txt
