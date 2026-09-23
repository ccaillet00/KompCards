import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { requireAuth, type AuthRequest } from '../src/auth/middleware.js';
import { signToken } from '../src/auth/jwt.js';
import { loadConfig } from '../src/config.js';
import { UnauthorizedError } from '../src/utils/errors.js';

const config = loadConfig({
  DATABASE_URL: 'mysql://unused', JWT_SECRET: 'test-secret',
  LLM_BASE_URL: 'http://unused', LLM_API_KEY: 'unused', LLM_MODEL: 'unused',
});

describe('requireAuth', () => {
  it.each(['invalid', signToken({ ...config, jwtTtlSeconds: -10 }, { id: 'user', email: 'a@b.ch' })])(
    'meldet ungültige oder abgelaufene Tokens als 401', async (token) => {
      const next = vi.fn();
      await requireAuth(config)(
        { headers: {}, cookies: { access_token: token } } as unknown as AuthRequest,
        {} as Response, next,
      );
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    },
  );
});
