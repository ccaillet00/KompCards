import type { Database } from '../src/db/client.js';
import { createBetterAuth } from '../src/auth/betterAuth.js';
import { loadConfig } from '../src/config.js';
import { describe, expect, it, vi } from 'vitest';

const config = loadConfig({
  DATABASE_URL: 'mysql://unused',
  BETTER_AUTH_SECRET: 'better-auth-test-secret-at-least-32-characters',
  BETTER_AUTH_URL: 'https://service.example.test',
  LLM_BASE_URL: 'http://unused',
  LLM_API_KEY: 'unused',
  LLM_MODEL: 'unused',
  NODE_ENV: 'test',
});

describe('Better Auth', () => {
  it('deaktiviert Linking und schützt OAuth-Tokens ohne den Credential-Login zu ändern', () => {
    const auth = createBetterAuth({} as Database, config);
    expect(auth.options.account).toMatchObject({
      accountLinking: { enabled: false }, encryptOAuthTokens: true,
    });
    expect(auth.options.socialProviders?.github).toBeUndefined();
    expect(auth.options.disabledPaths).toEqual(expect.arrayContaining(['/link-social', '/unlink-account']));
  });

  it('konfiguriert feste 12-Stunden-DB-Sessions ohne Cookie-Cache', () => {
    const auth = createBetterAuth({} as Database, config);

    expect(auth.options.session).toMatchObject({
      expiresIn: 43_200,
      disableSessionRefresh: true,
    });
    expect(auth.options.session).not.toHaveProperty('cookieCache');
  });

  it('verwendet parallele Tabellen, UUIDs, E-Mail/Passwort und das Admin-Plugin', () => {
    const auth = createBetterAuth({} as Database, config);

    expect(auth.options.user?.modelName).toBe('auth_user');
    expect(auth.options.account?.modelName).toBe('auth_account');
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.emailAndPassword?.autoSignIn).toBe(false);
    expect(auth.options.plugins?.map(plugin => plugin.id)).toContain('admin');
    expect(auth.options.disabledPaths).toEqual(expect.arrayContaining([
      '/admin/remove-user',
      '/admin/impersonate-user',
      '/admin/stop-impersonating-user',
    ]));
  });

  it('aktiviert den Passwort-Reset erst mit einem injizierten Mailversand', async () => {
    const authWithoutMailer = createBetterAuth({} as Database, config);
    expect(authWithoutMailer.options.emailAndPassword?.sendResetPassword).toBeUndefined();

    const sendPasswordReset = vi.fn().mockResolvedValue(undefined);
    const authWithMailer = createBetterAuth({} as Database, config, { sendPasswordReset });
    const callback = authWithMailer.options.emailAndPassword?.sendResetPassword;
    expect(callback).toBeTypeOf('function');

    await callback?.({
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch' },
      url: 'https://service.example.test/reset-password/token',
      token: 'token',
    });

    expect(sendPasswordReset).toHaveBeenCalledWith({
      recipient: { id: 'user-1', name: 'Ada', email: 'ada@example.ch' },
      resetUrl: 'https://service.example.test/reset-password/token',
    });
    expect(authWithMailer.options.emailAndPassword?.revokeSessionsOnPasswordReset).toBe(true);
  });
});
