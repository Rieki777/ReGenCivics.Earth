@echo off
REM Set your DATABASE_URL before running
set DATABASE_URL=mysql://root:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/railway
echo Starting at %TIME% >> remaining-imports-log.txt
echo === General Inquiries === >> remaining-imports-log.txt
npx tsx scripts/import-general-inquiries.ts >> remaining-imports-log.txt 2>&1
echo === Video Suggestions === >> remaining-imports-log.txt
npx tsx scripts/import-video-suggestions.ts >> remaining-imports-log.txt 2>&1
echo === Tripetto Inquiries === >> remaining-imports-log.txt
npx tsx scripts/import-tripetto-inquiries.ts >> remaining-imports-log.txt 2>&1
echo Finished at %TIME% >> remaining-imports-log.txt
