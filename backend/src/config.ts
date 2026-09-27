/**
 * Zentrale Konfiguration — ausschließlich via Env (siehe docs/TECH_STACK.md).
 * Kein Hardcoding von DB-, Auth- oder LLM-Werten.
 */

export interface AppConfig {
  /** Port, auf dem Express lauscht (intern; Traefik ist die Kante). */
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  /** MySQL-Verbindungsstring, z. B. `mysql://user:pass@db:3306/kompcards_db`. */
  databaseUrl: string;
  /** Signatur-Secret für Better Auth. */
  betterAuthSecret: string;
  /** Öffentliche Origin des SaaS-Frontends, z. B. https://service.example.ch. */
  betterAuthUrl: string;
  /** Optionaler GitHub OAuth Provider; beide Werte müssen gemeinsam gesetzt sein. */
  github?: { clientId: string; clientSecret: string };
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
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL,
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

  if ((required.BETTER_AUTH_SECRET as string).length < 32) {
    throw new Error('BETTER_AUTH_SECRET muss mindestens 32 Zeichen lang sein');
  }

  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error('GITHUB_CLIENT_ID und GITHUB_CLIENT_SECRET müssen gemeinsam gesetzt sein');
  }

  const nodeEnvRaw = env.NODE_ENV ?? 'development';
  const nodeEnv =
    nodeEnvRaw === 'production' || nodeEnvRaw === 'test' ? nodeEnvRaw : 'development';

  return {
    ...(clientId && clientSecret ? { github: { clientId, clientSecret } } : {}),
    port: env.PORT ? Number.parseInt(env.PORT, 10) : 4000,
    nodeEnv,
    databaseUrl: required.DATABASE_URL as string,
    betterAuthSecret: required.BETTER_AUTH_SECRET as string,
    betterAuthUrl: required.BETTER_AUTH_URL as string,
    llmBaseUrl: required.LLM_BASE_URL as string,
    llmApiKey: required.LLM_API_KEY as string,
    llmModel: required.LLM_MODEL as string,
  };
}
