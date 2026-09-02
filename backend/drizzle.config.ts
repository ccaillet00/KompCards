import { defineConfig } from 'drizzle-kit';

// Das Drizzle-Schema in `src/db/schema.ts` ist die Single Source of Truth.
// Migrationen (out: ./drizzle) werden beim Backend-Start angewendet (migrateDb),
// sofern sie noch nicht existieren.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'mysql://kompcards:kompcards@localhost:3306/kompcards_db',
  },
});
