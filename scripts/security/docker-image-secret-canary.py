#!/usr/bin/env python3
"""Fail-closed Docker image-layer canary for local development secret exclusions.

Creates synthetic credentials in a checkout, builds BOTH stages of Dockerfile,
exports their layers and scans all image archive bytes. Never uses real secrets
or claims that a passing canary proves a production credential inventory.
"""
from __future__ import annotations

import os
import json
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tarfile
import tempfile


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = (
    ".env",
    ".secrets/ci-test/credential.txt",
    ".ssh/id_ed25519",
    ".aws/credentials",
    ".config/gcloud/application_default_credentials.json",
    ".npmrc",
    "subdir/service-account-ci-canary.json",
    "data/ci-canary.json",
)
IMAGES = ("usv01-build-secret-canary:ci", "usv01-runtime-secret-canary:ci")


def run(*args: str, timeout: int = 900) -> None:
    subprocess.run(args, check=True, cwd=ROOT, timeout=timeout)


def contains_token(stream, token: bytes) -> bool:
    overlap = b""
    while True:
        chunk = stream.read(1024 * 1024)
        if not chunk:
            return False
        window = overlap + chunk
        if token in window:
            return True
        overlap = window[-(len(token) - 1):]


def inspect_image_archive(archive: Path, token: bytes) -> int:
    scanned_layers = 0
    with tarfile.open(archive, "r:*") as outer:
        members = outer.getmembers()
        manifest_member = next((item for item in members if item.name == "manifest.json"), None)
        if manifest_member is None:
            raise RuntimeError("Docker save archive missing manifest")
        manifest_file = outer.extractfile(manifest_member)
        if manifest_file is None:
            raise RuntimeError("Docker save archive manifest unreadable")
        manifest = json.load(manifest_file)
        if not isinstance(manifest, list) or not manifest:
            raise RuntimeError("Docker save manifest has no image records")
        layers: set[str] = set()
        image_tags: set[str] = set()
        for record in manifest:
            if not isinstance(record, dict) or not isinstance(record.get("Layers"), list):
                raise RuntimeError("Malformed Docker save manifest")
            layers.update(str(name).removeprefix("./") for name in record["Layers"])
            image_tags.update(record.get("RepoTags") or [])
        if not set(IMAGES).issubset(image_tags):
            raise RuntimeError("Docker save archive omitted a required build stage image")
        if not layers:
            raise RuntimeError("Docker save archive contains no referenced layers")
        for member in members:
            if not member.isfile():
                continue
            data = outer.extractfile(member)
            if data is None:
                raise RuntimeError("Unable to read image member")
            if member.name.removeprefix("./") in layers:
                scanned_layers += 1
                with tarfile.open(fileobj=data, mode="r|*") as layer:
                    for entry in layer:
                        # Docker layers may leak credential bytes through tar
                        # member names, symlink targets or PAX metadata even
                        # when no regular-file payload contains the marker.
                        header_values = [entry.name, entry.linkname]
                        header_values.extend(
                            str(key) + "=" + str(value)
                            for key, value in entry.pax_headers.items()
                        )
                        if any(token in value.encode("utf-8", "surrogateescape")
                               for value in header_values):
                            raise RuntimeError("Synthetic secret found in Docker layer header: " + entry.name)
                        if not entry.isfile():
                            continue
                        payload = layer.extractfile(entry)
                        if payload is None:
                            raise RuntimeError("Unable to read image layer entry")
                        if contains_token(payload, token):
                            raise RuntimeError("Synthetic secret found in Docker layer: " + entry.name)
            elif contains_token(data, token):
                raise RuntimeError("Synthetic secret found in Docker image metadata")
    if scanned_layers != len(layers):
        raise RuntimeError("Docker archive omitted referenced layers; refusing a false pass")
    return scanned_layers


def main() -> int:
    if not shutil.which("docker"):
        print("FAIL: Docker must be installed to verify image layers", file=sys.stderr)
        return 2
    if not (ROOT / "Dockerfile").is_file() or not (ROOT / ".dockerignore").is_file():
        print("FAIL: Run against a repository with Dockerfile and .dockerignore", file=sys.stderr)
        return 2
    token = ("USV01_SYNTHETIC_SECRET_CANARY_" + secrets.token_hex(48)).encode("ascii")
    paths = [ROOT / relative for relative in FIXTURES]
    preexisting = [p for p in paths if p.exists() or p.is_symlink()]
    if preexisting:
        print("FAIL: Synthetic fixtures collide with local files; refusing to overwrite anything", file=sys.stderr)
        return 2
    created_dirs: list[Path] = []
    created_paths: list[Path] = []
    try:
        for file in paths:
            missing = []
            parent = file.parent
            while not parent.exists() and parent != ROOT:
                missing.append(parent)
                parent = parent.parent
            for directory in reversed(missing):
                directory.mkdir(mode=0o700)
                created_dirs.append(directory)
            with file.open("xb") as out:
                out.write(token + b"\n")
            os.chmod(file, 0o600)
            created_paths.append(file)
        with tempfile.TemporaryDirectory(prefix="usv01-image-canary-") as temp:
            archive = Path(temp) / "docker-images.tar"
            run("docker", "build", "--target", "build", "--tag", IMAGES[0], ".", timeout=1200)
            run("docker", "build", "--target", "runtime", "--tag", IMAGES[1], ".", timeout=1200)
            run("docker", "save", "--output", str(archive), *IMAGES, timeout=600)
            number = inspect_image_archive(archive, token)
        print(f"PASS: Scanned {number} exported layers across Docker build and runtime images; synthetic secret bytes absent")
        print("NOTE: Independent production credential and backup acceptance is still required")
        return 0
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError,
            subprocess.TimeoutExpired, tarfile.TarError) as error:
        print(f"FAIL: Docker synthetic secret image canary did not pass: {type(error).__name__}: {error}", file=sys.stderr)
        return 1
    finally:
        for file in reversed(created_paths):
            file.unlink(missing_ok=True)
        for directory in reversed(created_dirs):
            try:
                directory.rmdir()
            except OSError:
                pass


if __name__ == "__main__":
    sys.exit(main())
