import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';
import type { BetterAuthInstance } from '../src/auth/betterAuth.js';

describe('GET /api/auth-config', () => {
  it.each([false, true])('reports GitHub availability (%s) without leaking credentials', async (enabled) => {
    const config = { github: enabled ? { clientId: 'private-id', clientSecret: 'private-secret' } : undefined } as AppConfig;
    const app = createApp(config, { api: {} } as BetterAuthInstance, {} as Parameters<typeof createApp>[2]);
    // Dispatch through Express without opening a TCP port.
    const request = new IncomingMessage(new Socket());
    Object.defineProperty(request, 'headers', { value: {}, configurable: true });
    request.method = 'GET';
    request.url = '/api/auth-config';
    const response = new ServerResponse(request);
    const body = await new Promise<string>((resolve) => {
      vi.spyOn(response, 'end').mockImplementation(((value: string) => {
        resolve(value);
        return response;
      }) as typeof response.end);
      app(request, response);
    });
    expect(response.statusCode, body).toBe(200);
    expect(JSON.parse(body)).toEqual({ github: enabled });
    expect(response.getHeader('cache-control')).toBe('no-store');
  });
});
