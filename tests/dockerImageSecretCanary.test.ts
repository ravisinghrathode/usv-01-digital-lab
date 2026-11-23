import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
  it('rejects synthetic credentials in Docker layer symlink names and targets', () => {
    const python = `
import importlib.util, io, json, pathlib, tarfile, tempfile
script = pathlib.Path("scripts/security/docker-image-secret-canary.py").resolve()
spec = importlib.util.spec_from_file_location("docker_canary", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
token = b"USV01_SYNTHETIC_SECRET_CANARY_TEST"
for location in ("name", "linkname", "pax"):
    with tempfile.TemporaryDirectory() as tmp:
        archive = pathlib.Path(tmp) / "image.tar"
        layer_bytes = io.BytesIO()
        with tarfile.open(fileobj=layer_bytes, mode="w") as layer:
            entry = tarfile.TarInfo("safe")
            entry.type = tarfile.SYMTYPE
            entry.linkname = "safe"
            if location == "name":
                entry.name = token.decode()
            elif location == "linkname":
                entry.linkname = token.decode()
            else:
                entry.pax_headers = {"comment": token.decode()}
            layer.addfile(entry)
        manifest = [{"RepoTags": list(module.IMAGES), "Layers": ["layer.tar"]}]
        with tarfile.open(archive, mode="w") as outer:
            for name, data in (
                ("manifest.json", json.dumps(manifest).encode()),
                ("layer.tar", layer_bytes.getvalue()),
            ):
                entry = tarfile.TarInfo(name)
                entry.size = len(data)
                outer.addfile(entry, io.BytesIO(data))
        try:
            module.inspect_image_archive(archive, token)
        except RuntimeError as error:
            assert "Docker layer header" in str(error), (location, error)
        else:
            raise AssertionError("Undetected credential in " + location)
`;
    const result = spawnSync('python3', ['-c', python], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });

  it('rejects synthetic credentials in outer Docker save archive headers', () => {
    const python = `
import importlib.util, io, json, pathlib, tarfile, tempfile
script = pathlib.Path("scripts/security/docker-image-secret-canary.py").resolve()
spec = importlib.util.spec_from_file_location("docker_canary", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
token = b"USV01_SYNTHETIC_SECRET_CANARY_TEST"
for location in ("name", "linkname", "pax"):
    with tempfile.TemporaryDirectory() as tmp:
        archive = pathlib.Path(tmp) / "image.tar"
        layer_bytes = io.BytesIO()
        with tarfile.open(fileobj=layer_bytes, mode="w") as layer:
            entry = tarfile.TarInfo("safe.txt")
            entry.size = 4
            layer.addfile(entry, io.BytesIO(b"safe"))
        manifest = [{"RepoTags": list(module.IMAGES), "Layers": ["layer.tar"]}]
        with tarfile.open(archive, mode="w") as outer:
            for name, data in (
                ("manifest.json", json.dumps(manifest).encode()),
                ("layer.tar", layer_bytes.getvalue()),
            ):
                entry = tarfile.TarInfo(name)
                entry.size = len(data)
                outer.addfile(entry, io.BytesIO(data))
            entry = tarfile.TarInfo("outer-metadata")
            entry.type = tarfile.SYMTYPE
            entry.linkname = "safe"
            if location == "name":
                entry.name = token.decode()
            elif location == "linkname":
                entry.linkname = token.decode()
            else:
                entry.pax_headers = {"comment": token.decode()}
            outer.addfile(entry)
        try:
            module.inspect_image_archive(archive, token)
        except RuntimeError as error:
            assert "Docker archive header" in str(error), (location, error)
        else:
            raise AssertionError("Undetected outer archive credential in " + location)
`;
    const result = spawnSync('python3', ['-c', python], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });

  it('fails closed on malformed Docker-save manifest tags and layer names', () => {
    const python = `
import importlib.util, io, json, pathlib, tarfile, tempfile
script = pathlib.Path("scripts/security/docker-image-secret-canary.py").resolve()
spec = importlib.util.spec_from_file_location("docker_canary", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
token = b"USV01_SYNTHETIC_SECRET_CANARY_TEST"
invalid = [
    {"RepoTags": "not-a-list", "Layers": ["layer.tar"]},
    {"RepoTags": [None], "Layers": ["layer.tar"]},
    {"RepoTags": list(module.IMAGES), "Layers": [None]},
    {"RepoTags": list(module.IMAGES), "Layers": []},
]
for record in invalid:
    with tempfile.TemporaryDirectory() as tmp:
        archive = pathlib.Path(tmp) / "image.tar"
        with tarfile.open(archive, mode="w") as outer:
            data = json.dumps([record]).encode()
            entry = tarfile.TarInfo("manifest.json")
            entry.size = len(data)
            outer.addfile(entry, io.BytesIO(data))
        try:
            module.inspect_image_archive(archive, token)
        except RuntimeError as error:
            assert "manifest" in str(error).lower(), (record, error)
        else:
            raise AssertionError("Accepted malformed manifest: " + repr(record))
`;
    const result = spawnSync('python3', ['-c', python], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });

  it('rejects non-regular Docker manifest and referenced layer members', () => {
    const python = `
import importlib.util, io, json, pathlib, tarfile, tempfile
spec = importlib.util.spec_from_file_location("docker_canary", pathlib.Path("scripts/security/docker-image-secret-canary.py").resolve())
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
token = b"USV01_SYNTHETIC_SECRET_CANARY_TEST"
for invalid_member in ("manifest.json", "layer.tar"):
    with tempfile.TemporaryDirectory() as tmp:
        archive = pathlib.Path(tmp) / "image.tar"
        manifest = json.dumps([{"RepoTags": list(module.IMAGES), "Layers": ["layer.tar"]}]).encode()
        with tarfile.open(archive, "w") as outer:
            for name in ("manifest.json", "layer.tar"):
                entry = tarfile.TarInfo(name)
                if name == invalid_member:
                    entry.type = tarfile.SYMTYPE
                    entry.linkname = "other"
                    outer.addfile(entry)
                else:
                    data = manifest if name == "manifest.json" else b""
                    entry.size = len(data)
                    outer.addfile(entry, io.BytesIO(data))
        try:
            module.inspect_image_archive(archive, token)
        except RuntimeError as error:
            assert "regular file" in str(error), (invalid_member, error)
        else:
            raise AssertionError("Accepted non-regular archive member " + invalid_member)
`;
    const result = spawnSync('python3', ['-c', python], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });

  it('rejects duplicate Docker-save archive paths before selecting manifest or layers', () => {
    const python = `
import importlib.util, io, json, pathlib, tarfile, tempfile
spec = importlib.util.spec_from_file_location("docker_canary", pathlib.Path("scripts/security/docker-image-secret-canary.py").resolve())
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
manifest = json.dumps([{"RepoTags": list(module.IMAGES), "Layers": ["layer.tar"]}]).encode()
for duplicate in ("manifest.json", "layer.tar"):
    with tempfile.TemporaryDirectory() as tmp:
        archive = pathlib.Path(tmp) / "image.tar"
        with tarfile.open(archive, "w") as outer:
            for name, data in (("manifest.json", manifest), ("layer.tar", b""), (duplicate, b"")):
                entry = tarfile.TarInfo(name)
                entry.size = len(data)
                outer.addfile(entry, io.BytesIO(data))
        try:
            module.inspect_image_archive(archive, b"SYNTHETIC_TEST_TOKEN")
        except RuntimeError as error:
            assert "duplicate member paths" in str(error), (duplicate, error)
        else:
            raise AssertionError("Accepted duplicate archive path " + duplicate)
`;
    const result = spawnSync('python3', ['-c', python], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });


  it('rejects unsafe Docker-save layer references before scanning', () => {
    const python = `
import importlib.util, io, json, pathlib, tarfile, tempfile
spec = importlib.util.spec_from_file_location("docker_canary", pathlib.Path("scripts/security/docker-image-secret-canary.py").resolve())
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
for bad in ("../layer.tar", "/layer.tar", "./layer.tar", "dir//layer.tar", "dir/./layer.tar", "dir/../layer.tar", "dir\\\\layer.tar"):
    with tempfile.TemporaryDirectory() as tmp:
        archive = pathlib.Path(tmp) / "image.tar"
        manifest = json.dumps([{"RepoTags": list(module.IMAGES), "Layers": [bad]}]).encode()
        with tarfile.open(archive, "w") as outer:
            entry = tarfile.TarInfo("manifest.json")
            entry.size = len(manifest)
            outer.addfile(entry, io.BytesIO(manifest))
        try:
            module.inspect_image_archive(archive, b"SYNTHETIC_TEST_TOKEN")
        except RuntimeError as error:
            assert "unsafe layer path" in str(error), (bad, error)
        else:
            raise AssertionError("Accepted unsafe layer path " + bad)
`;
    const result = spawnSync('python3', ['-c', python], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });

  it('rejects synthetic credentials hidden after the tar end marker', () => {
    const python = `
import importlib.util, io, json, pathlib, tarfile, tempfile
spec = importlib.util.spec_from_file_location("docker_canary", pathlib.Path("scripts/security/docker-image-secret-canary.py").resolve())
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
token = b"USV01_SYNTHETIC_SECRET_CANARY_TRAILING"
with tempfile.TemporaryDirectory() as tmp:
    archive = pathlib.Path(tmp) / "image.tar"
    layer_bytes = io.BytesIO()
    with tarfile.open(fileobj=layer_bytes, mode="w") as layer:
        entry = tarfile.TarInfo("safe.txt")
        entry.size = 4
        layer.addfile(entry, io.BytesIO(b"safe"))
    manifest = json.dumps([{"RepoTags": list(module.IMAGES), "Layers": ["layer.tar"]}]).encode()
    with tarfile.open(archive, "w") as outer:
        for name, data in (("manifest.json", manifest), ("layer.tar", layer_bytes.getvalue())):
            entry = tarfile.TarInfo(name)
            entry.size = len(data)
            outer.addfile(entry, io.BytesIO(data))
    with archive.open("ab") as out:
        out.write(token)
    try:
        module.inspect_image_archive(archive, token)
    except RuntimeError as error:
        assert "raw Docker archive bytes" in str(error), error
    else:
        raise AssertionError("Accepted credential after tar end marker")
`;
    const result = spawnSync('python3', ['-c', python], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });

  it('runs a dedicated GitHub Actions workflow with synthetic fixtures', () => {
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('docker info >/dev/null');
    expect(workflow).toContain('python3 scripts/security/docker-image-secret-canary.py');
    expect(workflow).toContain('docker compose config --quiet');
  });
});
