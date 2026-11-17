import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dockerignore = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8');
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');

describe('container credential boundaries', () => {
  it('excludes developer secrets and signing keys from build contexts', () => {
    for (const pattern of [
      '**/.secrets', '**/.secrets/**', '**/.ssh', '**/.ssh/**',
      '**/.npmrc', '**/.netrc', '**/*.pem', '**/*.key',
      '**/*.p12', '**/*.pfx', '**/*credentials*.json'
    ]) expect(dockerignore.split(/\r?\n/)).toContain(pattern);
  });

  it('keeps credentials in a separately persisted writable path', () => {
    expect(dockerfile).toContain('STAFF_CREDENTIAL_STORE=/app/.secrets/staff-credentials.json');
    expect(dockerfile).toContain('chown -R node:node /app/data /app/.secrets');
    expect(compose).toContain('usv_lab_staff_credentials:/app/.secrets');
    expect(compose).toContain('read_only: true');
  });

  it('does not bake bootstrap tokens into the runtime image or compose file', () => {
    expect(dockerfile).not.toMatch(/^(?:ARG|ENV)\s+(?:INITIAL_PROVISION_SECRET|ADMIN_SETUP_TOKEN)=/m);
    expect(compose).not.toMatch(/INITIAL_PROVISION_SECRET\s*:\s*[\w-]{32,}/);
  });
});
