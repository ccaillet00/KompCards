import { defineConfig } from 'drizzle-kit';

// Das SQL in `SQL/create_tables.sql` ist die Single Source of Truth.
// Dieses Config dient nur für Drizzle-Tooling (generate/push/studio).
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'mysql://kompcards:kompcards@localhost:3306/kompcards_db',
  },
});
