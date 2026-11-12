import { describe, expect, it } from 'vitest';
import { probeDeployedLab, probeGoogleDrive } from '../src/core/verification/LiveIntegrationProbes.ts';

const sha = 'a'.repeat(40);
const folder = 'USV01FolderIdentifierA1';

describe('Authenticated live commissioning probes', () => {
  it('requires unauthorized request rejection and an exact deployed SHA', async () => {
    let calls = 0;
    const request = (async (_url: unknown, _init: RequestInit = {}) => {
      calls++;
      return calls <= 4
        ? new Response('', { status: 401 })
        : new Response(JSON.stringify({ acceptance: { baselineSha: sha } }), {
          status: 200, headers: { 'content-type': 'application/json' }
        });
    }) as typeof fetch;
    const result = await probeDeployedLab({
      origin: 'https://usv-lab.example.org', sessionToken: 'test-only-session', baselineSha: sha
    }, request);
    expect(result.status).toBe('LIVE_PROBE_PASSED_UNATTESTED');
    expect(result.independentlyVerified).toBe(false);
    expect(calls).toBe(5);
  });

  it('rejects unauthenticated public readiness endpoints and stale deployments', async () => {
    const exposed = (async () => new Response('{}', { status: 200 })) as typeof fetch;
    const first = await probeDeployedLab({
      origin: 'https://usv-lab.example.org', sessionToken: 'test-only-session', baselineSha: sha
    }, exposed);
    expect(first.status).toBe('LIVE_PROBE_FAILED');

    let i = 0;
    const stale = (async () => {
      i++;
      return i <= 4 ? new Response('', { status: 401 }) :
        new Response(JSON.stringify({ acceptance: { baselineSha: 'b'.repeat(40) } }), { status: 200 });
    }) as typeof fetch;
    const second = await probeDeployedLab({
      origin: 'https://usv-lab.example.org', sessionToken: 'test-only-session', baselineSha: sha
    }, stale);
    expect(second.status).toBe('LIVE_PROBE_FAILED');
  });

  it('refuses insecure and unconfigured origin without making requests', async () => {
    const doNotCall = (async () => { throw new Error('should not call network'); }) as typeof fetch;
    expect((await probeDeployedLab({ baselineSha: sha }, doNotCall)).status).toBe('NOT_CONFIGURED');
    expect((await probeDeployedLab({
      baselineSha: sha, origin: 'http://localhost:3000', sessionToken: 'x'
    }, doNotCall)).status).toBe('LIVE_PROBE_FAILED');
  });

  it('performs a Drive file write/read/digest/permissions/cleanup roundtrip', async () => {
    let uploaded = '';
    let cleanup = false;
    const request = (async (resource: unknown, init: RequestInit = {}) => {
      const url = String(resource);
      const method = init.method || 'GET';
      if (method === 'POST') return Response.json({ id: 'TestProbeFile_20261113' }, { status: 200 });
      if (url.includes('/upload/drive/v3/files/') && method === 'PATCH') {
        uploaded = String(init.body); return Response.json({ id: 'TestProbeFile_20261113' });
      }
      if (url.includes('?alt=media')) return new Response(uploaded);
      if (url.includes('/permissions?')) return Response.json({ permissions: [{ id: 'owner', role: 'owner', type: 'user' }] });
      if (method === 'PATCH' && url.includes('fields=id,trashed')) {
        cleanup = true; return Response.json({ id: 'TestProbeFile_20261113', trashed: true });
      }
      if (url.includes('fields=id,parents')) return Response.json({ id: 'TestProbeFile_20261113', parents: [folder] });
      throw new Error('Unhandled Drive endpoint');
    }) as typeof fetch;
    const r = await probeGoogleDrive({ accessToken: 'test-oauth', folderId: folder, baselineSha: sha }, request);
    expect(r.status).toBe('LIVE_PROBE_PASSED_UNATTESTED');
    expect(cleanup).toBe(true);
    expect(uploaded).toContain(sha);
    expect(r.independentlyVerified).toBe(false);
  });

  it('tries to clean up its created Drive file after content tampering', async () => {
    let cleaned = false;
    const request = (async (resource: unknown, init: RequestInit = {}) => {
      const url = String(resource);
      if (init.method === 'POST') return Response.json({ id: 'TestProbeFile_20261113' });
      if (url.includes('/upload/drive/v3/files/')) return Response.json({});
      if (url.includes('?alt=media')) return new Response('tampered');
      if (init.method === 'PATCH') { cleaned = true; return Response.json({ trashed: true }); }
      throw new Error('Unhandled request');
    }) as typeof fetch;
    const r = await probeGoogleDrive({ accessToken: 'test-oauth', folderId: folder, baselineSha: sha }, request);
    expect(r.status).toBe('LIVE_PROBE_FAILED');
    expect(cleaned).toBe(true);
  });
});
