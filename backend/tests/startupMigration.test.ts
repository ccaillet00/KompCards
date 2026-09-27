import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('Backend-Start', () => {
  it('führt beim normalen Anwendungsstart keine Drizzle-Migrationen aus', async () => {
    const source = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8');

    expect(source).not.toContain('migrateDb');
  });

  it('trennt Auth-Schema und FK-Cutover in explizite Scripts', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.['db:migrate']).toBeUndefined();
    expect(packageJson.scripts?.['db:migrate:auth-schema'])
      .toBe('bun run src/db/migrate.ts --through=2');
    expect(packageJson.scripts?.['db:migrate:cutover'])
      .toBe('bun run src/db/cutover.ts');
  });
});
