import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const script = fs.readFileSync(path.join(root, 'scripts/security/docker-image-secret-canary.py'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/docker-secret-image-canary.yml'), 'utf8');

describe('Docker build and runtime secret-leak regression workflow', () => {
  it('scans both separately built Docker image stages, not just .dockerignore text', () => {
    expect(script).toContain('"--target", "build"');
    expect(script).toContain('"--target", "runtime"');
    expect(script).toContain('run("docker", "save"');
    expect(script).toContain('inspect_image_archive(archive, token)');
    expect(script).toContain('raise RuntimeError("Synthetic secret found in Docker layer: "');
  });
  it('fails without Docker and refuses to replace actual local credentials', () => {
    expect(script).toContain('if not shutil.which("docker")');
    expect(script).toContain('preexisting = [p for p in paths if p.exists() or p.is_symlink()]');
    expect(script).toContain('if preexisting:');
    expect(script).toContain('finally:');
    expect(script).toContain('file.unlink(missing_ok=True)');
  });
  it('rejects synthetic secret leakage in archive names, symlink targets and extended tar metadata', () => {
    expect(script).toContain('Synthetic secret found in Docker archive member metadata');
    expect(script).toContain('Synthetic secret found in Docker layer entry metadata');
    expect(script).toContain('Synthetic secret found in Docker layer extended metadata');
    expect(script).toContain('entry.pax_headers.values()');
    expect(script).toContain('entry.linkname.encode');
  });
  it('runs a dedicated GitHub Actions workflow with synthetic fixtures', () => {
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('docker info >/dev/null');
    expect(workflow).toContain('python3 scripts/security/docker-image-secret-canary.py');
    expect(workflow).toContain('docker compose config --quiet');
  });
});
