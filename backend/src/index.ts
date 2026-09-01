import { loadConfig } from './config.js';
import { initDb } from './db/client.js';
import { OpenAiCompatibleLlmClient } from './llm/client.js';
import { createApp } from './app.js';
import { AuthService } from './services/authService.js';
import { CompetencyService } from './services/competencyService.js';
import { logger } from './utils/logger.js';

/**
 * Entry-Point: lädt die Konfiguration, initialisiert DB + LLM-Client,
 * baut die App und startet den Server.
 */
function main(): void {
  const config = loadConfig();
  const db = initDb(config);

  const llm = new OpenAiCompatibleLlmClient(config);

  const services = {
    auth: new AuthService(db, config),
    competency: new CompetencyService(db, llm, config.llmModel),
  };

  const app = createApp(config, services);

  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'KompCards Backend gestartet');
  });
}

main();
