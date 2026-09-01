import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

const baseEnv: NodeJS.ProcessEnv = {
  DATABASE_URL: 'mysql://user:pass@db:3306/kompcards_db',
  JWT_SECRET: 'secret',
  LLM_BASE_URL: 'http://llm:8000/v1',
  LLM_API_KEY: 'key',
  LLM_MODEL: 'model-x',
};

describe('loadConfig', () => {
  it('liest Pflichtvariablen aus der Env', () => {
    const config = loadConfig({ ...baseEnv });
    expect(config.databaseUrl).toBe(baseEnv.DATABASE_URL);
    expect(config.jwtSecret).toBe('secret');
    expect(config.llmBaseUrl).toBe('http://llm:8000/v1');
    expect(config.llmApiKey).toBe('key');
    expect(config.llmModel).toBe('model-x');
  });

  it('setzt Defaults für Port, TTL und NODE_ENV', () => {
    const config = loadConfig({ ...baseEnv });
    expect(config.port).toBe(4000);
    expect(config.jwtTtlSeconds).toBe(43200);
    expect(config.nodeEnv).toBe('development');
  });

  it('liest Port und TTL aus der Env', () => {
    const config = loadConfig({ ...baseEnv, PORT: '5000', JWT_TTL_SECONDS: '60' });
    expect(config.port).toBe(5000);
    expect(config.jwtTtlSeconds).toBe(60);
  });

  it('wirft bei fehlender Pflichtvariable', () => {
    const { JWT_SECRET: _jwt, ...rest } = baseEnv;
    expect(() => loadConfig(rest)).toThrow(/JWT_SECRET/);
  });
});
