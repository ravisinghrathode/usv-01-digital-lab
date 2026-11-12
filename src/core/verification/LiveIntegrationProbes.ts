/**
 * Live commissioning checks. Only activated with explicitly configured
 * credentials/targets. These prove observed API behavior, NOT independent
 * attestation, service security or engineering certification.
 */
import { createHash, randomBytes } from 'node:crypto';

export interface ProbeResult {
  target: 'AI_STUDIO_DEPLOYMENT' | 'GOOGLE_DRIVE';
  status: 'NOT_CONFIGURED' | 'LIVE_PROBE_PASSED_UNATTESTED' | 'LIVE_PROBE_FAILED';
  observed: string[];
  failure?: string;
  independentlyVerified: false;
}

function isHttpsOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.pathname === '/' && !url.search && !url.hash &&
      url.hostname.includes('.') &&
      !['localhost','127.0.0.1','0.0.0.0'].includes(url.hostname) &&
      !url.hostname.endsWith('.local');
  } catch {
    return false;
  }
}

const commitPattern = /^[a-f0-9]{40}$/;

export async function probeDeployedLab(
  config: { origin?: string; baselineSha: string; sessionToken?: string },
  request: typeof fetch = fetch
): Promise<ProbeResult> {
  const observed: string[] = [];
  const result = (status: ProbeResult['status'], failure?: string): ProbeResult => ({
    target: 'AI_STUDIO_DEPLOYMENT', status, observed, ...(failure ? { failure } : {}),
    independentlyVerified: false
  });
  if (!config.origin || !config.sessionToken) return result('NOT_CONFIGURED', 'Missing deployment origin or authenticated lab session');
  if (!isHttpsOrigin(config.origin) || !commitPattern.test(config.baselineSha)) {
    return result('LIVE_PROBE_FAILED', 'Invalid public HTTPS origin or exact commit SHA');
  }
  const url = new URL('/api/verify/readiness', config.origin).toString();
  try {
    // Reject redirects and assert auth boundary before requesting private data.
    const unauth = await request(url, { redirect: 'error', headers: { accept: 'application/json' } });
    if (unauth.status !== 401) {
      return result('LIVE_PROBE_FAILED', 'Unauthenticated readiness endpoint must reject with HTTP 401');
    }
    observed.push('unauthenticated HTTP 401');
    const auth = await request(url, {
      redirect: 'error',
      headers: { authorization: 'Bearer ' + config.sessionToken, accept: 'application/json' }
    });
    if (!auth.ok) return result('LIVE_PROBE_FAILED', 'Authenticated readiness request failed, status ' + auth.status);
    const data: unknown = await auth.json();
    const snapshot = data && typeof data === 'object' ? data as Record<string, any> : {};
    const actualSha: unknown = snapshot.acceptance?.baselineSha;
    if (actualSha !== config.baselineSha) return result('LIVE_PROBE_FAILED', 'Deployed source SHA does not match the approved baseline');
    observed.push('authenticated readiness response received');
    observed.push('deployed application reports matching source SHA');
    observed.push('transport uses HTTPS');
    return result('LIVE_PROBE_PASSED_UNATTESTED');
  } catch {
    return result('LIVE_PROBE_FAILED', 'Network, TLS or response validation failed');
  }
}

export async function probeGoogleDrive(
  config: { accessToken?: string; folderId?: string; baselineSha: string },
  request: typeof fetch = fetch
): Promise<ProbeResult> {
  const observed: string[] = [];
  const result = (status: ProbeResult['status'], failure?: string): ProbeResult => ({
    target: 'GOOGLE_DRIVE', status, observed, ...(failure ? { failure } : {}),
    independentlyVerified: false
  });
  if (!config.accessToken || !config.folderId) {
    return result('NOT_CONFIGURED', 'No scoped Drive OAuth token and folder configured');
  }
  if (!/^[A-Za-z0-9_-]{10,}$/.test(config.folderId) || !commitPattern.test(config.baselineSha)) {
    return result('LIVE_PROBE_FAILED', 'Invalid Drive folder ID or source commit SHA');
  }
  const base = 'https://www.googleapis.com/drive/v3/files';
  const headers = { authorization: 'Bearer ' + config.accessToken };
  const marker = 'USV01-ACCEPTANCE-' + randomBytes(8).toString('hex');
  const body = 'USV-01 non-sensitive live Drive roundtrip marker: ' + marker + ' baseline=' + config.baselineSha;
  const checksum = createHash('sha256').update(body).digest('hex');
  let createdId: string | undefined;
  let failure: string | undefined;

  const api = async (url: string, init: RequestInit, step: string) => {
    const response = await request(url, { ...init, redirect: 'error' });
    if (!response.ok) throw new Error(step + ' HTTP ' + response.status);
    return response;
  };
  try {
    const created = await api(base + '?fields=id,name,parents', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ name: marker + '.txt', mimeType: 'text/plain', parents: [config.folderId] })
    }, 'create');
    const metadata: unknown = await created.json();
    const file = metadata && typeof metadata === 'object' ? metadata as Record<string, any> : {};
    if (typeof file.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(file.id)) {
      throw new Error('create returned invalid file identifier');
    }
    createdId = file.id;
    observed.push('scoped file created');

    await api('https://www.googleapis.com/upload/drive/v3/files/' + createdId + '?uploadType=media', {
      method: 'PATCH', headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' }, body
    }, 'upload');
    observed.push('file contents uploaded');

    const downloaded = await api(base + '/' + createdId + '?alt=media', { headers }, 'download');
    const actual = await downloaded.text();
    if (createHash('sha256').update(actual).digest('hex') !== checksum) {
      throw new Error('downloaded payload digest differs from uploaded content');
    }
    observed.push('download content digest matches upload');

    const checked = await api(base + '/' + createdId + '?fields=id,parents', { headers }, 'file metadata');
    const checkedBody: unknown = await checked.json();
    const checkedFile = checkedBody && typeof checkedBody === 'object' ? checkedBody as Record<string, any> : {};
    if (!Array.isArray(checkedFile.parents) || !checkedFile.parents.includes(config.folderId)) {
      throw new Error('test file is not in the required project folder');
    }
    observed.push('file belongs to configured USV-01 folder');

    const permissions = await api(base + '/' + config.folderId + '/permissions?fields=permissions(id,type,role)', { headers }, 'permission listing');
    const permissionBody: unknown = await permissions.json();
    const permissionData = permissionBody && typeof permissionBody === 'object' ? permissionBody as Record<string, any> : {};
    if (!Array.isArray(permissionData.permissions) || !permissionData.permissions.length) {
      throw new Error('folder permission listing unavailable');
    }
    observed.push('read-only folder permission listing retrieved');
  } catch (err) {
    failure = err instanceof Error ? err.message : 'Unknown Drive probe failure';
  } finally {
    if (createdId) {
      try {
        await api(base + '/' + createdId + '?fields=id,trashed', {
          method: 'PATCH',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ trashed: true })
        }, 'cleanup');
        observed.push('temporary file trashed');
      } catch {
        failure = (failure ? failure + '; ' : '') + 'temporary test file cleanup failed';
      }
    }
  }
  return failure ? result('LIVE_PROBE_FAILED', failure) : result('LIVE_PROBE_PASSED_UNATTESTED');
}
