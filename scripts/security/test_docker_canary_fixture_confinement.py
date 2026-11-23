#!/usr/bin/env python3
"""Regression tests: synthetic image canary must not write through symlink parents."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

MODULE_PATH = Path(__file__).with_name("docker-image-secret-canary.py")
spec = importlib.util.spec_from_file_location("docker_image_secret_canary", MODULE_PATH)
canary = importlib.util.module_from_spec(spec)
spec.loader.exec_module(canary)


class FixtureParentConfinementTests(unittest.TestCase):
    def test_symlinked_ancestor_rejected_even_when_destination_missing(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "checkout"
            outside = Path(temp) / "outside"
            root.mkdir()
            outside.mkdir()
            (root / ".config").symlink_to(outside, target_is_directory=True)
            destination = root / ".config" / "gcloud" / "application_default_credentials.json"
            with self.assertRaisesRegex(RuntimeError, "symbolic link"):
                canary.validate_fixture_paths(root, [destination])
            self.assertFalse((outside / "gcloud").exists())

    def test_non_directory_ancestor_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / ".config").write_text("not a directory")
            with self.assertRaisesRegex(RuntimeError, "not a directory"):
                canary.validate_fixture_paths(root, [root / ".config" / "gcloud" / "token"])

    def test_normal_missing_ancestors_are_allowed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            canary.validate_fixture_paths(root, [root / ".config" / "gcloud" / "token"])
            self.assertFalse((root / ".config").exists())

    def test_path_outside_checkout_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "checkout"
            root.mkdir()
            with self.assertRaisesRegex(RuntimeError, "escapes checkout"):
                canary.validate_fixture_paths(root, [Path(temp) / "outside" / "token"])


if __name__ == "__main__":
    unittest.main()
