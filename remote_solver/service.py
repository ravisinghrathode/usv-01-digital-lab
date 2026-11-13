"""Authenticated loopback HTTP bridge for the restricted staged solver worker.

MUST sit behind administrator-managed TLS and network isolation. Do not bind a
public interface. A shared token is read from the host process environment.
Only operator-approved staged input hashes are executed, one at a time.
"""
from __future__ import annotations

import hmac
import json
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from worker import run_staged_case, validate_request

MAX_JSON = 32 * 1024
IDS = re.compile(r"^[A-Za-z0-9_-]{3,64}$")
TOKEN = os.environ.get("USV_SOLVER_SERVICE_TOKEN", "")
STAGE = Path(os.environ.get("USV_SOLVER_STAGING_DIR", "/var/lib/usv-solver/staged"))
WORK = Path(os.environ.get("USV_SOLVER_WORK_DIR", "/var/lib/usv-solver/work"))
APPROVED = set(filter(None, os.environ.get("USV_SOLVER_APPROVED_ARTIFACT_DIGESTS", "").split(",")))
POOL = ThreadPoolExecutor(max_workers=1)
STATE: dict[str, dict] = {}
LOCK = threading.Lock()


def _run(manifest: dict, ref: str) -> None:
    with LOCK:
        STATE[ref]["state"] = "RUNNING"
    try:
        receipt = run_staged_case(manifest, STAGE, WORK, APPROVED)
        with LOCK:
            STATE[ref] = {
                **receipt,
                # An actual subprocess completion does not establish GCI or
                # a remotely accessible validated result archive.
                "state": "COMPUTE_DONE_EVIDENCE_PENDING",
            }
    except Exception as e:
        # Avoid leaking shell stdout or private file contents over HTTP.
        with LOCK:
            STATE[ref] = {
                "jobId": ref, "acceptedInputDigest": manifest["manifestSha256"],
                "state": "FAILED",
                "reason": type(e).__name__,
                "engineeringReleaseAuthorized": False,
            }


class Handler(BaseHTTPRequestHandler):
    def _write(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        supplied = self.headers.get("Authorization", "")
        return len(TOKEN) >= 32 and hmac.compare_digest(supplied, "Bearer " + TOKEN)

    def do_POST(self):
        if not self._authorized():
            self._write(401, {"error": "Unauthorized"})
            return
        if self.path != "/jobs":
            self._write(404, {"error": "Not Found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_JSON:
                raise ValueError("Invalid request size")
            manifest = json.loads(self.rfile.read(length))
            validate_request(manifest, APPROVED)
            ref = manifest["jobRef"]
            with LOCK:
                if ref in STATE:
                    self._write(409, {"error": "Duplicate immutable job ID"})
                    return
                STATE[ref] = {
                    "jobId": ref, "acceptedInputDigest": manifest["manifestSha256"],
                    "state": "QUEUED",
                }
            POOL.submit(_run, manifest, ref)
            self._write(202, STATE[ref].copy())
        except (ValueError, TypeError, KeyError):
            self._write(400, {"error": "Invalid or unapproved job"})
        except Exception:
            self._write(500, {"error": "Solver service error"})

    def do_GET(self):
        if not self._authorized():
            self._write(401, {"error": "Unauthorized"})
            return
        ref = self.path.removeprefix("/jobs/")
        if not self.path.startswith("/jobs/") or not IDS.fullmatch(ref):
            self._write(404, {"error": "Not Found"})
            return
        with LOCK:
            state = STATE.get(ref)
            snapshot = state.copy() if state else None
        self._write(200, snapshot) if snapshot else self._write(404, {"error": "Unknown job"})

    def log_message(self, format, *args):
        # Do not log Authorization headers or sensitive payloads.
        return


if __name__ == "__main__":
    if len(TOKEN) < 32 or not APPROVED:
        raise SystemExit("USV_SOLVER_SERVICE_TOKEN (>=32 chars) and approved case hashes required")
    ThreadingHTTPServer(("127.0.0.1", 8707), Handler).serve_forever()
