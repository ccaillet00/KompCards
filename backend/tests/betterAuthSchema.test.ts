import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import { describe, expect, it } from 'vitest';

import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from '../src/db/authSchema.js';
import { competencyProof } from '../src/db/schema.js';

describe('Better-Auth-Schema', () => {
  it('verwendet die freigegebenen parallelen Tabellennamen', () => {
    expect([
      getTableName(authUser),
      getTableName(authAccount),
      getTableName(authSession),
      getTableName(authVerification),
    ]).toEqual(['auth_user', 'auth_account', 'auth_session', 'auth_verification']);
  });

  it('behält UUID-kompatible Benutzer-IDs und Admin-Felder bei', () => {
    const user = getTableColumns(authUser);
    const account = getTableColumns(authAccount);
    const session = getTableColumns(authSession);

    expect(user.id.getSQLType()).toBe('varchar(36)');
    expect(account.userId.getSQLType()).toBe('varchar(36)');
    expect(session.userId.getSQLType()).toBe('varchar(36)');
    expect(Object.keys(user)).toEqual(expect.arrayContaining([
      'role', 'banned', 'banReason', 'banExpires',
    ]));
    expect(Object.keys(session)).toContain('impersonatedBy');
  });

  it('speichert Credential- und spätere Provider-Konten getrennt vom Benutzer', () => {
    expect(Object.keys(getTableColumns(authAccount))).toEqual(expect.arrayContaining([
      'accountId', 'providerId', 'userId', 'password',
    ]));
  });

  it('verweist Kompetenzkarten ohne Änderung der user_id auf auth_user', () => {
    const userForeignKey = getTableConfig(competencyProof).foreignKeys
      .find(foreignKey => foreignKey.getName().startsWith('competency_proof_user_id'));

    expect(userForeignKey).toBeDefined();
    expect(getTableName(userForeignKey!.reference().foreignTable)).toBe('auth_user');
    expect(userForeignKey!.reference().columns[0]?.name).toBe('user_id');
  });
});
