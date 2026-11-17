import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'http';
import { app, createSessionToken } from '../server.ts';

describe('Server-owned audit attribution', () => {
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
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Test port unavailable');
    base = 'http://127.0.0.1:' + addr.port;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });
  const send = (path: string, method = 'GET', body?: unknown) => fetch(base + path, {
    method,
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  it('does not use caller-supplied reviewer in an audit entry', async () => {
    const id = 'AUDIT-IDENTITY-CHECK-' + Date.now().toString();
    const create = await send('/api/data/knowledge_notes', 'POST', {
      id, name: 'Temporary audit identity test', owner: 'Forged Administrator'
    });
    expect(create.status).toBe(200);
    const created = await create.json() as { item: { id: string; createdBy: string; recordStatus: string } };
    const assignedId = created.item.id;
    expect(assignedId).not.toBe(id); // The caller cannot choose authoritative identifiers.
    expect(created.item.createdBy).toBe('usr-eng-dir-8841');
    expect(created.item.recordStatus).toBe('DRAFT_UNVERIFIED');
    const log = await send('/api/data/activity_log');
    expect(log.status).toBe(200);
    const body = await log.json() as { data: Array<{ recordId: string, userId: string, userName: string, action: string }> };
    const event = body.data.find(e => e.recordId === assignedId && e.action === 'CREATE');
    expect(event).toBeDefined();
    expect(event?.userId).toBe('usr-eng-dir-8841');
    expect(event?.userName).not.toBe('Forged Administrator');
    await send('/api/data/knowledge_notes/' + assignedId, 'DELETE');
  });
});
