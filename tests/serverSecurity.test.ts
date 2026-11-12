import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'http';
import { app } from '../server.ts';

describe('Server HTTP authentication guard regression', () => {
  let server: Server;
  let base = '';

  beforeAll(async () => {
    server = await new Promise<Server>((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Server did not expose test port');
    base = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  });

  for (const path of [
    '/api/agents/execute',
    '/api/orchestrator/execute-workflow',
    '/api/orchestrator/decide-gate',
    '/api/gemini/generate',
    '/api/gemini/stream',
    '/api/gemini/assist',
    '/api/usv-intel/scrape'
  ]) {
    it(`rejects anonymous POST ${path}`, async () => {
      const response = await fetch(base + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'LEAD-SYS-01', prompt: 'test', tasks: [] })
      });
      expect(response.status).toBe(401);
    });
  }
});
