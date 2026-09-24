import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

const baseEnv: NodeJS.ProcessEnv = {
  DATABASE_URL: 'mysql://user:pass@db:3306/kompcards_db',
  BETTER_AUTH_SECRET: 'better-auth-secret-at-least-32-characters',
  BETTER_AUTH_URL: 'https://service.example.test',
  LLM_BASE_URL: 'http://llm:8000/v1',
  LLM_API_KEY: 'key',
  LLM_MODEL: 'model-x',
};

describe('loadConfig', () => {
  it('liest Pflichtvariablen aus der Env', () => {
    const config = loadConfig({ ...baseEnv });
    expect(config.databaseUrl).toBe(baseEnv.DATABASE_URL);
    expect(config.betterAuthSecret).toBe(baseEnv.BETTER_AUTH_SECRET);
    expect(config.betterAuthUrl).toBe(baseEnv.BETTER_AUTH_URL);
    expect(config.llmBaseUrl).toBe('http://llm:8000/v1');
    expect(config.llmApiKey).toBe('key');
    expect(config.llmModel).toBe('model-x');
  });

  it('setzt Defaults für Port und NODE_ENV', () => {
    const config = loadConfig({ ...baseEnv });
    expect(config.port).toBe(4000);
    expect(config.nodeEnv).toBe('development');
  });

  it('liest den Port aus der Env', () => {
    const config = loadConfig({ ...baseEnv, PORT: '5000' });
    expect(config.port).toBe(5000);
  });

  it('wirft bei fehlender Pflichtvariable', () => {
    const { BETTER_AUTH_SECRET: _secret, ...rest } = baseEnv;
    expect(() => loadConfig(rest)).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('verweigert ein zu kurzes Better-Auth-Secret', () => {
    expect(() => loadConfig({ ...baseEnv, BETTER_AUTH_SECRET: 'too-short' }))
      .toThrow(/mindestens 32/i);
  });
});
