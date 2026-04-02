@echo off
REM Set your DATABASE_URL before running
set DATABASE_URL=mysql://root:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/railway
echo Starting at %TIME% > last-imports-log.txt
echo === Video Suggestions === >> last-imports-log.txt
npx tsx scripts/import-video-suggestions.ts >> last-imports-log.txt 2>&1
echo EXIT_VS=%ERRORLEVEL% >> last-imports-log.txt
echo === Tripetto Inquiries === >> last-imports-log.txt
npx tsx scripts/import-tripetto-inquiries.ts >> last-imports-log.txt 2>&1
echo EXIT_TI=%ERRORLEVEL% >> last-imports-log.txt
echo Done at %TIME% >> last-imports-log.txt
