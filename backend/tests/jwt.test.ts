import { describe, expect, it } from 'vitest';

import { hashToken, signToken, verifyToken } from '../src/auth/jwt.js';

const config = { jwtSecret: 'test-secret', jwtTtlSeconds: 3600 };
const user = { id: '11111111-1111-1111-1111-111111111111', email: 'a@b.c' };

describe('signToken / verifyToken', () => {
  it('erzeugt ein Token, das sich verifizieren lässt', () => {
    const token = signToken(config, user);
    const payload = verifyToken(config, token);
    expect(payload.sub).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('verwirft ein Token mit falschem Secret', () => {
    const token = signToken(config, user);
    expect(() => verifyToken({ jwtSecret: 'other' }, token)).toThrow();
  });

  it('verwirft ein abgelaufenes Token', () => {
    const token = signToken({ jwtSecret: 's', jwtTtlSeconds: -10 }, user);
    expect(() => verifyToken({ jwtSecret: 's' }, token)).toThrow();
  });
});

describe('hashToken', () => {
  it('ist deterministisch und unterscheidet sich pro Token', () => {
    const a = hashToken('token-a');
    expect(a).toBe(hashToken('token-a'));
    expect(a).not.toBe(hashToken('token-b'));
    // SHA-256 hex = 64 Zeichen
    expect(a).toHaveLength(64);
  });
});
