import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../src/db/client.js';
import { createBetterAuth } from '../src/auth/betterAuth.js';
import { loadConfig } from '../src/config.js';

// Exercise the real Better Auth HTTP handler and GitHub provider. Only storage
// and outgoing GitHub HTTP requests are replaced; no credentials/network needed.
const store = vi.hoisted(() => ({
  auth_user: [] as Record<string, unknown>[],
  auth_account: [] as Record<string, unknown>[],
  auth_session: [] as Record<string, unknown>[],
  auth_verification: [] as Record<string, unknown>[],
}));
vi.mock('@better-auth/drizzle-adapter', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  return { drizzleAdapter: () => memoryAdapter(store) };
});

const origin = 'http://localhost:3000';
const config = loadConfig({
  DATABASE_URL: 'mysql://unused',
  BETTER_AUTH_SECRET: 'test-github-secret-at-least-32-characters',
  BETTER_AUTH_URL: origin,
  LLM_BASE_URL: 'http://unused', LLM_API_KEY: 'unused', LLM_MODEL: 'unused',
  GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-secret', NODE_ENV: 'test',
});
const cookie = (response: Response) => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
let auth: ReturnType<typeof createBetterAuth>;
let verified = true;
let email: string | null = 'ada@example.ch';
let emailsAvailable = true;
let tokenFails = false;
let githubId = 42;
const githubFetch = vi.fn(async (input: string | URL | Request) => {
  const url = String(input);
  if (url === 'https://github.com/login/oauth/access_token') {
    return Response.json(tokenFails ? { error: 'bad_verification_code' } : {
      access_token: 'github-token-never-public', token_type: 'bearer', scope: 'read:user,user:email',
    });
  }
  if (url === 'https://api.github.com/user') {
    return Response.json({ id: githubId, login: 'ada', name: 'Ada', email, avatar_url: null });
  }
  if (url === 'https://api.github.com/user/emails') {
    return Response.json(emailsAvailable ? [{ email: email ?? 'ada@example.ch', primary: true, verified }] : []);
  }
  throw new Error(`Unexpected HTTP request: ${url}`);
});

function post(path: string, body: unknown, cookies = '') {
  return auth.handler(new Request(`${origin}/api/auth${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookies },
    body: JSON.stringify(body),
  }));
}
async function start(requestSignUp = true) {
  const response = await post('/sign-in/social', {
    provider: 'github', callbackURL: '/dashboard', errorCallbackURL: '/login', requestSignUp,
  });
  expect(response.status).toBe(200);
  const data = await response.json() as { url: string };
  const url = new URL(data.url);
  expect(url.origin).toBe('https://github.com');
  expect(url.searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/callback/github`);
  expect(url.searchParams.get('scope')?.split(' ').sort()).toEqual(['read:user', 'user:email']);
  return { state: url.searchParams.get('state')!, cookies: cookie(response) };
}
function callback(flow: { state: string; cookies: string }, query = 'code=test-code') {
  return auth.handler(new Request(`${origin}/api/auth/callback/github?state=${flow.state}&${query}`, {
    headers: { Cookie: flow.cookies },
  }));
}
function errorCode(response: Response) {
  return new URL(response.headers.get('location')!, origin).searchParams.get('error');
}

beforeEach(() => {
  for (const rows of Object.values(store)) rows.length = 0;
  verified = true; email = 'ada@example.ch'; emailsAvailable = true; tokenFails = false; githubId = 42;
  githubFetch.mockClear();
  vi.stubGlobal('fetch', githubFetch);
  auth = createBetterAuth({} as Database, config);
});
afterEach(() => vi.unstubAllGlobals());

describe('GitHub OAuth without account linking', () => {
  it('creates a passwordless user and signs back into the same UUID with fixed DB sessions', async () => {
    const first = await callback(await start());
    expect(first.status).toBe(302);
    expect(first.headers.get('location')).toBe('/dashboard');
    expect(first.headers.get('set-cookie')).toContain('HttpOnly');
    expect(store.auth_user).toHaveLength(1);
    expect(store.auth_user[0]!).toMatchObject({ role: 'user', emailVerified: true });
    const id = store.auth_user[0]!.id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(store.auth_account).toHaveLength(1);
    expect(store.auth_account[0]!).toMatchObject({ providerId: 'github', accountId: '42', userId: id });
    expect(store.auth_account[0]!.password).toBeFalsy();
    expect(store.auth_account[0]!.accessToken).not.toBe('github-token-never-public');
    expect(store.auth_session[0]!.userId).toBe(id);
    const session = store.auth_session[0]!;
    expect(new Date(session.expiresAt as string).getTime() - new Date(session.createdAt as string).getTime()).toBe(43_200_000);
    const sessionResponse = await auth.handler(new Request(`${origin}/api/auth/get-session`, { headers: { Cookie: cookie(first) } }));
    expect((await sessionResponse.json() as { user: { id: string } }).user.id).toBe(id);
    const second = await callback(await start(false));
    expect(second.headers.get('location')).toBe('/dashboard');
    expect(store.auth_user).toHaveLength(1);
    expect(store.auth_account).toHaveLength(1);
    expect(store.auth_session.every(row => row.userId === id)).toBe(true);
    expect((await post('/sign-out', {}, cookie(first))).status).toBe(200);
    const loggedOut = await auth.handler(new Request(`${origin}/api/auth/get-session`, { headers: { Cookie: cookie(first) } }));
    expect(await loggedOut.json()).toBeNull();
  });

  it('requires an explicit registration for unknown GitHub users', async () => {
    expect(errorCode(await callback(await start(false)))).toBe('signup_disabled');
    expect(store.auth_user).toHaveLength(0);
  });

  it('rejects email collisions even with a verified existing credential user and preserves password login', async () => {
    expect((await post('/sign-up/email', { name: 'Ada', email, password: 'secure-password' })).status).toBe(200);
    store.auth_user[0]!.emailVerified = true;
    const original = structuredClone(store.auth_account);
    expect(errorCode(await callback(await start()))).toBe('account_not_linked');
    expect(store.auth_account).toEqual(original);
    expect(store.auth_user).toHaveLength(1);
    expect(store.auth_session).toHaveLength(0);
    const login = await post('/sign-in/email', { email, password: 'secure-password' });
    expect(login.status).toBe(200);
    expect((await login.json() as { user: { id: string } }).user.id).toBe(store.auth_user[0]!.id);
    for (const path of ['/link-social', '/unlink-account']) {
      expect((await post(path, { provider: 'github', providerId: 'github' }, cookie(login))).status).toBe(404);
    }
  });

  it('does not merge a different GitHub identity with the same email', async () => {
    await callback(await start());
    githubId = 99;
    expect(errorCode(await callback(await start()))).toBe('account_not_linked');
    expect(store.auth_account).toHaveLength(1);
  });

  it('supports a private verified email from the GitHub emails endpoint', async () => {
    email = null;
    expect((await callback(await start())).headers.get('location')).toBe('/dashboard');
    expect(store.auth_user[0]!.email).toBe('ada@example.ch');
  });

  it('rejects an unverified email before creating any user or account', async () => {
    verified = false;
    expect(errorCode(await callback(await start()))).toBe('github_email_not_verified');
    expect(store.auth_user).toHaveLength(0);
    expect(store.auth_account).toHaveLength(0);
  });

  it('rejects missing email addresses', async () => {
    email = null; emailsAvailable = false;
    expect(errorCode(await callback(await start()))).toBe('email_not_found');
    expect(store.auth_user).toHaveLength(0);
  });

  it('retains the admin plugin ban check for returning GitHub users', async () => {
    await callback(await start());
    store.auth_user[0]!.banned = true;
    store.auth_session.length = 0;
    const response = await callback(await start(false));
    expect(response.headers.get('location')).not.toBe('/dashboard');
    expect(store.auth_session).toHaveLength(0);
  });

  it('handles cancellation and token exchange failure without creating users', async () => {
    expect(errorCode(await callback(await start(), 'error=access_denied'))).toBe('access_denied');
    tokenFails = true;
    expect(errorCode(await callback(await start()))).toBeTruthy();
    expect(store.auth_user).toHaveLength(0);
  });

  it('rejects tampered, missing-cookie and replayed state before calling GitHub', async () => {
    const flow = await start();
    expect(errorCode(await callback({ ...flow, state: 'tampered' }))).toBe('state_mismatch');
    expect(errorCode(await callback({ ...flow, cookies: '' }))).toBe('state_mismatch');
    expect(githubFetch).not.toHaveBeenCalled();
    await callback(flow);
    githubFetch.mockClear();
    expect(errorCode(await callback(flow))).toBe('state_mismatch');
    expect(githubFetch).not.toHaveBeenCalled();
  });

  it('rejects external success and error redirects', async () => {
    for (const field of ['callbackURL', 'errorCallbackURL']) {
      const response = await post('/sign-in/social', { provider: 'github', [field]: 'https://evil.example/' });
      expect(response.status).toBe(403);
    }
    expect(githubFetch).not.toHaveBeenCalled();
  });
});
