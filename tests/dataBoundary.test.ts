import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'http';
import { app, createSessionToken } from '../server.ts';

describe('Engineering register collection allowlist', () => {
  let server: Server;
  let base: string;
  const directorToken = createSessionToken({
    userId: 'usr-eng-dir-8841',
    userName: 'Chief Naval Architect & Systems Director',
    role: 'ENGINEERING_DIRECTOR'
  });
  beforeAll(async () => {
    server = await new Promise<Server>(resolve => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test port');
    base = 'http://127.0.0.1:' + address.port;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close(error => error ? reject(error) : resolve()));
  });
  const request = (url: string, method = 'GET', body?: unknown) => fetch(base + url, {
    method,
    headers: { authorization: 'Bearer ' + directorToken, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  it('rejects arbitrary data collections and prototype keys', async () => {
    expect((await request('/api/data/__proto__')).status).toBe(400);
    expect((await request('/api/data/unknown', 'POST', { id: 'x' })).status).toBe(400);
  });
  it('refuses direct tampering with audit history', async () => {
    expect((await request('/api/data/activity_log', 'POST', { id: 'forged' })).status).toBe(403);
    expect((await request('/api/data/activity_log/forged', 'DELETE')).status).toBe(403);
  });
});
