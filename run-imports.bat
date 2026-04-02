@echo off
REM Set your DATABASE_URL before running
set DATABASE_URL=mysql://root:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/railway
echo === Importing users ===
npx tsx scripts/import-users.ts
echo === Importing applications ===
npx tsx scripts/import-applications.ts
echo === Importing general inquiries ===
npx tsx scripts/import-general-inquiries.ts
echo === Importing video suggestions ===
npx tsx scripts/import-video-suggestions.ts
echo === Importing tripetto inquiries ===
npx tsx scripts/import-tripetto-inquiries.ts
echo === All imports done ===
