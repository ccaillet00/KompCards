import { loadConfig } from './config.js';
import { initDb } from './db/client.js';
import { OpenAiCompatibleLlmClient } from './llm/client.js';
import { createApp } from './app.js';
import { createBetterAuth } from './auth/betterAuth.js';
import { CompetencyService } from './services/competencyService.js';
import { CurriculumService } from './services/curriculumService.js';
import { logger } from './utils/logger.js';

/**
 * Entry-Point: lädt die Konfiguration, initialisiert DB + LLM-Client,
 * baut die App und startet den Server.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const db = initDb(config);

  const llm = new OpenAiCompatibleLlmClient(config);
  const auth = createBetterAuth(db, config);

  const services = {
    competency: new CompetencyService(db, llm, config.llmModel),
    curriculum: new CurriculumService(db),
  };

  const app = createApp(config, auth, services);

  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'KompCards Backend gestartet');
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fehler beim Starten des Backends');
  process.exit(1);
});
