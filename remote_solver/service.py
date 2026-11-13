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
from templates import materialize_template_job

MAX_JSON = 32 * 1024
IDS = re.compile(r"^[A-Za-z0-9_-]{3,64}$")
TOKEN = os.environ.get("USV_SOLVER_SERVICE_TOKEN", "")
STAGE = Path(os.environ.get("USV_SOLVER_STAGING_DIR", "/var/lib/usv-solver/staged"))
WORK = Path(os.environ.get("USV_SOLVER_WORK_DIR", "/var/lib/usv-solver/work"))
ARTIFACTS = Path(os.environ.get("USV_SOLVER_ARTIFACT_DIR", "/var/lib/usv-solver/artifacts"))
OUTPUT_BASE_URI = os.environ.get("USV_SOLVER_OUTPUT_BASE_URI", "").rstrip("/")
APPROVED = set(filter(None, os.environ.get("USV_SOLVER_APPROVED_ARTIFACT_DIGESTS", "").split(",")))
TEMPLATE_CATALOG = Path(os.environ.get("USV_SOLVER_TEMPLATE_CATALOG", "")) if os.environ.get("USV_SOLVER_TEMPLATE_CATALOG") else None
POOL = ThreadPoolExecutor(max_workers=1)
STATE: dict[str, dict] = {}
LOCK = threading.Lock()


def _run(manifest: dict, ref: str, approved_override: set[str] | None = None) -> None:
    with LOCK:
        STATE[ref]["state"] = "RUNNING"
    try:
        receipt = run_staged_case(
            manifest, STAGE, WORK, approved_override if approved_override is not None else APPROVED, artifact_root=ARTIFACTS,
            isolation_mode=os.environ.get("USV_SOLVER_ISOLATION_MODE","UNSHARE_USER_NET"))
        local_path = receipt.pop("outputArtifactLocalPath", None)
        if local_path:
            receipt["outputArtifactUri"] = (
                OUTPUT_BASE_URI + "/artifacts/" + ref
                if OUTPUT_BASE_URI.startswith("https://") else None
            )
        ARTIFACTS.mkdir(parents=True, exist_ok=True, mode=0o700)
        receipt_file = ARTIFACTS / (ref + "-receipt.json")
        receipt_file.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
        os.chmod(receipt_file, 0o600)
        with LOCK:
            # Preserve the worker's fail-closed disposition. In particular,
            # COMPUTE_DONE_QUALITY_REJECTED must never be rewritten as a
            # successful evidence-pending result merely because the process ran.
            STATE[ref] = receipt.copy()
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
        if self.path not in ("/jobs","/template-jobs"):
            self._write(404, {"error": "Not Found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_JSON:
                raise ValueError("Invalid request size")
            request = json.loads(self.rfile.read(length))
            approved_override = None
            template_meta = None
            if self.path == "/template-jobs":
                if TEMPLATE_CATALOG is None:
                    raise ValueError("Template catalog not configured")
                manifest,approved_override = materialize_template_job(
                    request,TEMPLATE_CATALOG,STAGE,WORK,
                    isolation_mode=os.environ.get("USV_SOLVER_ISOLATION_MODE","UNSHARE_USER_NET"))
                template_meta = manifest.pop("templateMaterialization",None)
                # Recompute digest without template-only metadata because the
                # public SolverJobManifest deliberately contains only fixed
                # solver fields. The template provenance is returned beside it.
                base={
                    "jobRef":manifest["jobRef"],"sourceCommit":manifest["sourceCommit"],
                    "family":manifest["family"],"inputArtifactUri":manifest["inputArtifactUri"],
                    "inputArtifactSha256":manifest["inputArtifactSha256"],
                    "meshArtifactSha256":manifest["meshArtifactSha256"],
                    "qualityPlan":manifest["qualityPlan"],
                }
                import hashlib
                manifest["manifestSha256"]="sha256:"+hashlib.sha256(
                    json.dumps(base,separators=(",",":")).encode()).hexdigest()
            else:
                manifest=request
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
                if template_meta:
                    STATE[ref]["templateMaterialization"]=template_meta
            POOL.submit(_run, manifest, ref, approved_override)
            payload={**STATE[ref].copy()}
            if self.path == "/template-jobs":
                payload["manifest"]=manifest
            self._write(202,payload)
        except (ValueError, TypeError, KeyError):
            self._write(400, {"error": "Invalid or unapproved job"})
        except Exception:
            self._write(500, {"error": "Solver service error"})

    def do_GET(self):
        if not self._authorized():
            self._write(401, {"error": "Unauthorized"})
            return
        if self.path.startswith("/artifacts/"):
            ref = self.path.removeprefix("/artifacts/")
            if not IDS.fullmatch(ref):
                self._write(404, {"error": "Not Found"})
                return
            archive = ARTIFACTS / (ref + "-solver-evidence.zip")
            if archive.is_symlink() or not archive.is_file():
                self._write(404, {"error": "Artifact unavailable"})
                return
            body = archive.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(body)
            return
        ref = self.path.removeprefix("/jobs/")
        if not self.path.startswith("/jobs/") or not IDS.fullmatch(ref):
            self._write(404, {"error": "Not Found"})
            return
        with LOCK:
            state = STATE.get(ref)
            snapshot = state.copy() if state else None
        if snapshot is None:
            receipt_file = ARTIFACTS / (ref + "-receipt.json")
            if receipt_file.is_file() and not receipt_file.is_symlink():
                try:
                    snapshot = json.loads(receipt_file.read_text())
                except (OSError, json.JSONDecodeError):
                    snapshot = None
        self._write(200, snapshot) if snapshot else self._write(404, {"error": "Unknown job"})

    def log_message(self, format, *args):
        # Do not log Authorization headers or sensitive payloads.
        return


if __name__ == "__main__":
    if len(TOKEN) < 32 or (not APPROVED and TEMPLATE_CATALOG is None) or (OUTPUT_BASE_URI and not OUTPUT_BASE_URI.startswith("https://")):
        raise SystemExit("Strong token plus approved staged hashes and/or template catalog, and HTTPS output base (when set), required")
    ThreadingHTTPServer(("127.0.0.1", 8707), Handler).serve_forever()
