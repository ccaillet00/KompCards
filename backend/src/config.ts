/**
 * Zentrale Konfiguration — ausschließlich via Env (siehe docs/TECH_STACK.md).
 * Kein Hardcoding von DB-, JWT- oder LLM-Werten.
 */

export interface AppConfig {
  /** Port, auf dem Express lauscht (intern; Traefik ist die Kante). */
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  /** MySQL-Verbindungsstring, z. B. `mysql://user:pass@db:3306/kompcards_db`. */
  databaseUrl: string;
  /** Secret für die JWT-Signatur. */
  jwtSecret: string;
  /** Gültigkeitsdauer eines JWT in Sekunden (serverseitige Session). */
  jwtTtlSeconds: number;
  /** Basis-URL des externen LLM (OpenAI-kompatible API). */
  llmBaseUrl: string;
  /** API-Key des externen LLM. */
  llmApiKey: string;
  /** Verwendetes LLM-Modell (wird in `competency_llm_output.llm_model` gespeichert). */
  llmModel: string;
}

/**
 * Liest und validiert die Umgebungsvariablen.
 * Wirft, wenn eine Pflichtvariable fehlt — Fail-Fast beim Start.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const required: Record<string, string | undefined> = {
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
    LLM_BASE_URL: env.LLM_BASE_URL,
    LLM_API_KEY: env.LLM_API_KEY,
    LLM_MODEL: env.LLM_MODEL,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => value === undefined || value === '')
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Fehlende Umgebungsvariablen: ${missing.join(', ')}`);
  }

  const nodeEnvRaw = env.NODE_ENV ?? 'development';
  const nodeEnv =
    nodeEnvRaw === 'production' || nodeEnvRaw === 'test' ? nodeEnvRaw : 'development';

  return {
    port: env.PORT ? Number.parseInt(env.PORT, 10) : 4000,
    nodeEnv,
    databaseUrl: required.DATABASE_URL as string,
    jwtSecret: required.JWT_SECRET as string,
    jwtTtlSeconds: env.JWT_TTL_SECONDS
      ? Number.parseInt(env.JWT_TTL_SECONDS, 10)
      : 43200,
    llmBaseUrl: required.LLM_BASE_URL as string,
    llmApiKey: required.LLM_API_KEY as string,
    llmModel: required.LLM_MODEL as string,
  };
}
