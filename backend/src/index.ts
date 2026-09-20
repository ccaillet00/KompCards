import { loadConfig } from './config.js';
import { initDb, migrateDb } from './db/client.js';
import { OpenAiCompatibleLlmClient } from './llm/client.js';
import { createApp } from './app.js';
import { AuthService } from './services/authService.js';
import { CompetencyService } from './services/competencyService.js';
import { CurriculumService } from './services/curriculumService.js';
import { logger } from './utils/logger.js';

/**
 * Entry-Point: lädt die Konfiguration, initialisiert DB + LLM-Client,
 * wendet die Drizzle-Migrationen an (Schema nur aus dem Drizzle-Schema),
 * baut die App und startet den Server.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const db = initDb(config);

  // Schema aus dem Drizzle-Schema erzeugen (idempotent — nur wenn es fehlt).
  await migrateDb();
  logger.info('Drizzle-Migrationen angewendet');

  const llm = new OpenAiCompatibleLlmClient(config);

  const services = {
    auth: new AuthService(db, config),
    competency: new CompetencyService(db, llm, config.llmModel),
    curriculum: new CurriculumService(db),
  };

  const app = createApp(config, services);

  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'KompCards Backend gestartet');
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fehler beim Starten des Backends');
  process.exit(1);
});
