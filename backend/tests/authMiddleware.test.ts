import type { NextFunction, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import {
  requireAdmin,
  requireAuth,
  type AuthRequest,
  type SessionReader,
} from '../src/auth/middleware.js';
import { ForbiddenError, UnauthorizedError } from '../src/utils/errors.js';

function request(): AuthRequest {
  return { headers: { cookie: 'better-auth.session_token=test' } } as AuthRequest;
}

describe('Better-Auth-Middleware', () => {
  it('meldet eine fehlende oder ungültige Session als 401', async () => {
    const auth: SessionReader = { getSession: vi.fn().mockResolvedValue(null) };
    const next = vi.fn();

    await requireAuth(auth)(request(), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('setzt die stabile Better-Auth-Benutzer-ID auf den Request', async () => {
    const auth: SessionReader = {
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'legacy-uuid', name: 'Ada', email: 'ada@example.ch', role: 'user' },
        session: { id: 'session-1' },
      }),
    };
    const req = request();
    const next = vi.fn();

    await requireAuth(auth)(req, {} as Response, next);

    expect(req.user?.id).toBe('legacy-uuid');
    expect(next).toHaveBeenCalledWith();
  });

  it('beschränkt Admin-Endpunkte auf die explizite Admin-Rolle', () => {
    const next = vi.fn();
    const req = request();
    req.user = { id: 'user-1', name: 'Ada', email: 'ada@example.ch', role: 'user' };

    requireAdmin(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('akzeptiert die Admin-Rolle auch in einer Rollenliste', () => {
    const next = vi.fn();
    const req = request();
    req.user = { id: 'admin-1', name: 'Admin', email: 'admin@example.ch', role: 'user,admin' };

    requireAdmin(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });
});
