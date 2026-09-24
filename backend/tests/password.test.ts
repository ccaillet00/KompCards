import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../src/auth/password.js';

describe('Better-Auth-Passwortadapter', () => {
  it('verifiziert bestehende bcryptjs-Hashes mit Kostenfaktor 10', async () => {
    const legacyHash = await bcrypt.hash('bestehendes-passwort', 10);

    await expect(verifyPassword({
      hash: legacyHash,
      password: 'bestehendes-passwort',
    })).resolves.toBe(true);
  });

  it('erzeugt weiterhin bcryptjs-Hashes mit Kostenfaktor 10', async () => {
    const hash = await hashPassword('neues-passwort');

    expect(bcrypt.getRounds(hash)).toBe(10);
    await expect(bcrypt.compare('neues-passwort', hash)).resolves.toBe(true);
  });
});
