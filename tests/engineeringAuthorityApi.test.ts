import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { app, createSessionToken } from '../server.ts';

describe('generic CRUD is never an engineering approval endpoint', () => {
  let server: Server;
  let base = '';
  const token = createSessionToken({
    userId: 'usr-eng-dir-8841',
    userName: 'Chief Naval Architect & Systems Director',
    role: 'ENGINEERING_DIRECTOR'
  });
  beforeAll(async () => {
    server = await new Promise<Server>(resolve => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('Test server unavailable');
    base = 'http://127.0.0.1:' + address.port;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });

  async function request(route: string, method: string, payload?: unknown) {
    return fetch(base + route, {
      method,
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
    });
  }

  it('rejects direct approval and fabricated evidence through authenticated API requests', async () => {
    for (const payload of [
      { title: 'Forged', status: 'Approved' },
      { title: 'Forged', approvalState: 'Approved' },
      { title: 'Forged', reviewer: 'Unreviewed peer' },
      { title: 'Forged', evidenceVerified: true },
      { title: 'Forged', metadata: { verificationStatus: 'VERIFIED' } }
    ]) {
      const response = await request('/api/data/requirements', 'POST', payload);
      expect(response.status).toBe(409);
    }
  });

  it('preserves unverified draft state and resists approval updates', async () => {
    const create = await request('/api/data/requirements', 'POST', {
      id: 'SPOOFED-ID', title: 'Validation-only draft', status: 'In Review'
    });
    expect(create.status).toBe(201);
    const created = await create.json() as { item: { id: string; status: string } };
    const id = created.item.id;
    expect(id).not.toBe('SPOOFED-ID');
    expect(created.item.status).toBe('Draft');
    try {
      const update = await request('/api/data/requirements/' + id, 'PUT', { status: 'Approved' });
      expect(update.status).toBe(409);
      const fetched = await request('/api/data/requirements', 'GET');
      const json = await fetched.json() as { data: Array<{ id: string; status: string }> };
      expect(json.data.find(row => row.id === id)?.status).toBe('Draft');
    } finally {
      const removed = await request('/api/data/requirements/' + id, 'DELETE');
      expect(removed.status).toBe(200);
    }
  });

  it('refuses ungoverned baseline re-import even by Director', async () => {
    const response = await request('/api/import', 'POST', {
      requirements: [{ id: 'REQ-FORGERY', status: 'Approved' }]
    });
    expect(response.status).toBe(403);
  });
});
