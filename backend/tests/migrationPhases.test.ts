import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

import { selectMigrationEntries } from '../src/db/migrationPhases.js';

const journal = {
  version: '7',
  dialect: 'mysql',
  entries: [
    { idx: 0, tag: '0000_initial', when: 1, version: '5', breakpoints: true },
    { idx: 1, tag: '0001_quality', when: 2, version: '5', breakpoints: true },
    { idx: 2, tag: '0002_auth_schema', when: 3, version: '5', breakpoints: true },
    { idx: 3, tag: '0003_auth_cutover', when: 4, version: '5', breakpoints: true },
  ],
};

describe('phasenweise Drizzle-Migration', () => {
  it('schliesst den FK-Cutover bei der Schema-Phase aus', () => {
    expect(selectMigrationEntries(journal, 2).entries.map(entry => entry.tag))
      .toEqual(['0000_initial', '0001_quality', '0002_auth_schema']);
  });

  it('nimmt den FK-Cutover erst in der Cutover-Phase auf', () => {
    expect(selectMigrationEntries(journal, 3).entries.map(entry => entry.tag))
      .toEqual(['0000_initial', '0001_quality', '0002_auth_schema', '0003_auth_cutover']);
  });

  it('legt das Better-Auth-Schema parallel an, ohne Legacy-Tabellen zu löschen', async () => {
    const sql = await readFile(
      new URL('../drizzle/0002_vengeful_shooting_star.sql', import.meta.url),
      'utf8',
    );

    expect(sql).toContain('CREATE TABLE `auth_user`');
    expect(sql).toContain('CREATE TABLE `auth_account`');
    expect(sql).toContain('CREATE TABLE `auth_session`');
    expect(sql).toContain('CREATE TABLE `auth_verification`');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toContain('`userTable`');
    expect(sql).not.toContain('`userSession`');
  });

  it('ändert beim Cutover nur den FK und keine competency_proof-Daten', async () => {
    const sql = await readFile(
      new URL('../drizzle/0003_solid_jubilee.sql', import.meta.url),
      'utf8',
    );

    expect(sql).toContain('DROP FOREIGN KEY `competency_proof_user_id_userTable_id_fk`');
    expect(sql).toContain('REFERENCES `auth_user`(`id`) ON DELETE cascade');
    expect(sql).not.toMatch(/UPDATE\s+`?competency_proof/i);
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
    expect(sql).not.toMatch(/DROP TABLE/i);
  });
});
