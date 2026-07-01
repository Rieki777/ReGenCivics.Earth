// NOTE: drizzle-kit is NOT the migration system for this project. Migrations are
// hand-written drizzle/NNNN_*.sql applied by scripts/run-migration.ts (see
// drizzle/README.md). This config exists only for read-only tooling such as
// `drizzle-kit studio`. Do NOT run `drizzle-kit generate` / `migrate` / `push`:
// the journal is frozen at 0047 and generating would try to recreate existing
// tables. schema.ts is the runtime type source of truth, not a migration driver.
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
