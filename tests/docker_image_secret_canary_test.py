#!/usr/bin/env python3
"""Executable malformed Docker archive regression tests; no daemon required."""
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/security/docker-image-secret-canary.py"
spec = importlib.util.spec_from_file_location("docker_canary", SCRIPT)
canary = importlib.util.module_from_spec(spec)
spec.loader.exec_module(canary)


def archive_with_manifest(path, manifest, duplicate=False, symlink=False):
    with tarfile.open(path, "w") as archive:
        payload = json.dumps(manifest).encode()
        for _ in range(2 if duplicate else 1):
            info = tarfile.TarInfo("manifest.json")
            if symlink:
                info.type = tarfile.SYMTYPE
                info.linkname = "other.json"
                archive.addfile(info)
            else:
                info.size = len(payload)
                archive.addfile(info, io.BytesIO(payload))


class DockerCanaryManifestTests(unittest.TestCase):
    def assert_rejected(self, manifest, *, duplicate=False, symlink=False):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "image.tar"
            archive_with_manifest(path, manifest, duplicate, symlink)
            with self.assertRaises(RuntimeError):
                canary.inspect_image_archive(path, b"SYNTHETIC_SECRET")

    def test_duplicate_manifest_rejected(self):
        self.assert_rejected([], duplicate=True)

    def test_symlink_manifest_rejected(self):
        self.assert_rejected([], symlink=True)

    def test_non_string_layer_rejected(self):
        self.assert_rejected([{"Layers": [42], "RepoTags": list(canary.IMAGES)}])

    def test_traversal_layer_rejected(self):
        self.assert_rejected([{"Layers": ["../secret/layer.tar"], "RepoTags": list(canary.IMAGES)}])

    def test_non_list_tags_rejected(self):
        self.assert_rejected([{"Layers": ["layer.tar"], "RepoTags": "not-a-list"}])

    def test_non_string_tag_rejected(self):
        self.assert_rejected([{"Layers": ["layer.tar"], "RepoTags": [42]}])


class DockerCanaryFixtureSafetyTests(unittest.TestCase):
    def test_symlinked_parent_is_rejected_without_writing_outside_checkout(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "checkout"
            outside = Path(directory) / "outside"
            root.mkdir()
            outside.mkdir()
            (root / ".secrets").symlink_to(outside, target_is_directory=True)
            target = root / ".secrets" / "ci-test" / "credential.txt"
            with self.assertRaisesRegex(RuntimeError, "symlink"):
                canary.assert_safe_fixture_parents(root, [target])
            self.assertFalse((outside / "ci-test").exists())

    def test_regular_nested_fixture_parent_is_allowed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "checkout"
            (root / ".secrets").mkdir(parents=True)
            canary.assert_safe_fixture_parents(root, [root / ".secrets" / "ci-test" / "credential.txt"])

    def test_file_as_parent_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "checkout"
            root.mkdir()
            (root / ".secrets").write_text("existing")
            with self.assertRaisesRegex(RuntimeError, "not a directory"):
                canary.assert_safe_fixture_parents(root, [root / ".secrets" / "ci-test" / "credential.txt"])


if __name__ == "__main__":
    unittest.main()
