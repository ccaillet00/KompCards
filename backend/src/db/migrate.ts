import { loadConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { initDb, migrateDb, resetDb } from './client.js';

async function main(): Promise<void> {
  const throughArgument = process.argv.find(argument => argument.startsWith('--through='));
  const throughIndex = Number.parseInt(throughArgument?.split('=')[1] ?? '', 10);
  if (!Number.isInteger(throughIndex) || throughIndex < 0) {
    throw new Error('Eine explizite Migrationsgrenze ist erforderlich, z. B. --through=2');
  }

  const config = loadConfig();
  initDb(config);

  await migrateDb(throughIndex);
  logger.info({ throughIndex }, 'Drizzle-Migrationen explizit angewendet');
  resetDb();
}

main().catch((err) => {
  logger.error({ err }, 'Explizite Drizzle-Migration fehlgeschlagen');
  resetDb();
  process.exit(1);
});
