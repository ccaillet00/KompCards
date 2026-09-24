import { describe, expect, it } from 'vitest';

import { planAuthUserMigration } from '../src/auth/migrateUsers.js';

const sourceUser = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ada Lovelace',
  email: 'ada@example.ch',
  passwordHash: `$2a$10$${'x'.repeat(53)}`,
  createdAt: new Date('2026-01-01T10:00:00Z'),
};

describe('MVP-Benutzerübernahme', () => {
  it('übernimmt ID, Passwort-Hash und explizite Admin-Rolle unverändert', () => {
    const plan = planAuthUserMigration({
      sourceUsers: [sourceUser],
      targetUsers: [],
      targetAccounts: [],
      adminUserIds: [sourceUser.id],
      createId: () => '22222222-2222-4222-8222-222222222222',
    });

    expect(plan.usersToInsert[0]).toMatchObject({
      id: sourceUser.id,
      email: sourceUser.email,
      role: 'admin',
      emailVerified: false,
    });
    expect(plan.accountsToInsert[0]).toMatchObject({
      userId: sourceUser.id,
      accountId: sourceUser.id,
      providerId: 'credential',
      password: sourceUser.passwordHash,
    });
  });

  it('ändert keine bereits identisch übernommenen Benutzer', () => {
    const plan = planAuthUserMigration({
      sourceUsers: [sourceUser],
      targetUsers: [{
        id: sourceUser.id,
        name: sourceUser.name,
        email: sourceUser.email,
        role: 'user',
      }],
      targetAccounts: [{
        id: 'account-1',
        userId: sourceUser.id,
        accountId: sourceUser.id,
        providerId: 'credential',
        password: sourceUser.passwordHash,
      }],
      adminUserIds: [],
      createId: () => 'unused',
    });

    expect(plan).toEqual({ usersToInsert: [], accountsToInsert: [] });
  });

  it('bricht bei abweichenden Zielidentitäten statt stiller Bereinigung ab', () => {
    expect(() => planAuthUserMigration({
      sourceUsers: [sourceUser],
      targetUsers: [{
        id: sourceUser.id,
        name: sourceUser.name,
        email: 'other@example.ch',
        role: 'user',
      }],
      targetAccounts: [],
      adminUserIds: [],
      createId: () => 'unused',
    })).toThrow(/abweichende Zielidentität/i);
  });

  it('bricht bei nicht existierenden Admin-IDs ab', () => {
    expect(() => planAuthUserMigration({
      sourceUsers: [sourceUser],
      targetUsers: [],
      targetAccounts: [],
      adminUserIds: ['unknown-user'],
      createId: () => 'unused',
    })).toThrow(/Admin-ID/i);
  });

  it('bricht bei einer bereits anderweitig belegten Ziel-E-Mail ab', () => {
    expect(() => planAuthUserMigration({
      sourceUsers: [sourceUser],
      targetUsers: [{ id: 'other-user', name: 'Other', email: sourceUser.email, role: 'user' }],
      targetAccounts: [],
      adminUserIds: [],
      createId: () => 'unused',
    })).toThrow(/Ziel-E-Mail/i);
  });

  it('bricht bei einer bereits anderweitig belegten Credential-Identität ab', () => {
    expect(() => planAuthUserMigration({
      sourceUsers: [sourceUser],
      targetUsers: [],
      targetAccounts: [{
        id: 'account-1',
        userId: 'other-user',
        accountId: sourceUser.id,
        providerId: 'credential',
        password: '$2a$10$other',
      }],
      adminUserIds: [],
      createId: () => 'unused',
    })).toThrow(/Credential-Identität/i);
  });

  it('bricht bei nicht kompatiblen Namen oder Passwort-Hashes vor dem Schreiben ab', () => {
    const run = (overrides: Partial<typeof sourceUser>) => planAuthUserMigration({
      sourceUsers: [{ ...sourceUser, ...overrides }],
      targetUsers: [],
      targetAccounts: [],
      adminUserIds: [],
      createId: () => 'unused',
    });

    expect(() => run({ name: 'x'.repeat(256) })).toThrow(/Name/i);
    expect(() => run({ passwordHash: '$2a$12$invalid' })).toThrow(/bcrypt/i);
  });
});
