import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/mysql-core';

import { selectMigrationEntries } from '../src/db/migrationPhases.js';
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from '../src/db/authSchema.js';
import { competencyProof, userSession, userTable } from '../src/db/schema.js';

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

  it('definiert das Better-Auth-Schema parallel zu den Legacy-Tabellen', () => {
    expect([
      getTableName(authUser),
      getTableName(authAccount),
      getTableName(authSession),
      getTableName(authVerification),
    ]).toEqual(['auth_user', 'auth_account', 'auth_session', 'auth_verification']);
    expect([getTableName(userTable), getTableName(userSession)])
      .toEqual(['userTable', 'userSession']);
  });

  it('verknüpft Kompetenzkarten mit auth_user und erhält die user_id-Spalte', () => {
    const config = getTableConfig(competencyProof);
    const userForeignKey = config.foreignKeys.find(foreignKey =>
      foreignKey.getName().startsWith('competency_proof_user_id'),
    );

    expect(userForeignKey).toBeDefined();
    expect(getTableName(userForeignKey!.reference().foreignTable)).toBe('auth_user');
    expect(userForeignKey!.reference().columns[0]?.name).toBe('user_id');
    expect(config.columns.map(column => column.name)).toContain('user_id');
  });
});
