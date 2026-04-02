@echo off
REM Set your DATABASE_URL before running
set DATABASE_URL=mysql://root:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/railway
echo === Importing applications ===
npx tsx scripts/import-applications.ts
echo APPS_DONE
echo === Importing general inquiries ===
npx tsx scripts/import-general-inquiries.ts
echo GI_DONE
echo === Importing video suggestions ===
npx tsx scripts/import-video-suggestions.ts
echo VS_DONE
echo === Importing tripetto inquiries ===
npx tsx scripts/import-tripetto-inquiries.ts
echo TI_DONE
echo === All done ===
