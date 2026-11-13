"""Restricted server-side solver execution for pre-reviewed, staged cases.

NOT a general purpose remote shell or source-code upload service.
Runs only an operator-allowlisted immutable ZIP case with fixed solver commands.
Intended for a dedicated unprivileged, network-isolated Linux service account.
Does not validate a vessel, mesh refinement, class rules, or physical accuracy.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import stat
import subprocess
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from typing import Callable

SHA = re.compile(r"^sha256:[0-9a-f]{64}$")
GIT_SHA = re.compile(r"^[0-9a-f]{40}$")
JOB = re.compile(r"^[A-Za-z0-9_-]{3,64}$")
MAX_ZIP = 128 * 1024 * 1024
MAX_UNPACK = 512 * 1024 * 1024
MAX_FILES = 1500

def sha256(payload: bytes) -> str:
    return "sha256:" + hashlib.sha256(payload).hexdigest()

def validate_request(manifest: dict, approved: set[str]) -> None:
    if not isinstance(manifest, dict) or not JOB.fullmatch(str(manifest.get("jobRef", ""))):
        raise ValueError("Invalid job reference")
    if not GIT_SHA.fullmatch(str(manifest.get("sourceCommit", ""))):
        raise ValueError("Exact source SHA absent")
    if manifest.get("family") not in ("OPENFOAM_CFD", "CALCULIX_FEA"):
        raise ValueError("Solver family not authorized")
    for key in ("inputArtifactSha256", "meshArtifactSha256", "manifestSha256"):
        if not SHA.fullmatch(str(manifest.get(key, ""))):
            raise ValueError("Invalid input, mesh or manifest digest")
    if manifest["inputArtifactSha256"] not in approved:
        raise ValueError("Case archive is not operator-approved by exact hash")
    plan = manifest.get("qualityPlan")
    if not isinstance(plan, dict) or not str(plan.get("sourceReference", "")).strip():
        raise ValueError("Source-identified numerical quality plan required")
    for key in ("residualThreshold", "gridUncertaintyMaxFraction",
                "maxMeshSkewness", "maxNonOrthogonalityDeg"):
        value = plan.get(key)
        if type(value) not in (float, int) or not 0 <= value < float("inf"):
            raise ValueError("Malformed quality threshold")
    if plan["gridUncertaintyMaxFraction"] > 1 or plan["maxNonOrthogonalityDeg"] > 180:
        raise ValueError("Out-of-range quality threshold")

def unzip_restricted(data: bytes, dest: Path) -> None:
    if len(data) > MAX_ZIP or not zipfile.is_zipfile(io.BytesIO(data)):
        raise ValueError("Not an accepted ZIP case")
    cumulative = 0
    seen: set[str] = set()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if len(archive.infolist()) > MAX_FILES:
            raise ValueError("Too many case members")
        for info in archive.infolist():
            part = PurePosixPath(info.filename)
            unix_mode = info.external_attr >> 16
            if (not info.filename or info.filename.startswith("/") or
                "\\" in info.filename or ".." in part.parts or
                part.is_absolute() or stat.S_ISLNK(unix_mode) or
                (stat.S_IFMT(unix_mode) not in (0,stat.S_IFREG,stat.S_IFDIR))):
                raise ValueError("Unsafe archive entry")
            if str(part) in seen:
                raise ValueError("Duplicate case member")
            seen.add(str(part))
            cumulative += info.file_size
            if cumulative > MAX_UNPACK:
                raise ValueError("Decompression quota exceeded")
            out = dest.joinpath(*part.parts)
            if info.is_dir():
                out.mkdir(mode=0o700,parents=True,exist_ok=True)
                continue
            out.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
            with archive.open(info) as source, out.open("xb") as target:
                while True:
                    chunk = source.read(1024*1024)
                    if not chunk: break
                    target.write(chunk)

def command_plan(family: str) -> tuple[list[list[str]],str]:
    # Fixed command/arguments; neither ZIP nor API can supply a shell command.
    if family == "OPENFOAM_CFD":
        return ([["checkMesh","-allTopology","-allGeometry"],
                 ["simpleFoam"]],"constant/polyMesh/points")
    if family == "CALCULIX_FEA":
        return ([["ccx","-i","model"]],"model.inp")
    raise ValueError("Unknown solver")

def run_staged_case(manifest: dict, stage: Path, work_root: Path,
                    approved: set[str],
                    runner: Callable[..., subprocess.CompletedProcess] = subprocess.run) -> dict:
    validate_request(manifest,approved)
    archive_path = stage / (manifest["inputArtifactSha256"][7:] + ".zip")
    if archive_path.is_symlink() or not archive_path.is_file():
        raise FileNotFoundError("Approved case is not staged")
    data = archive_path.read_bytes()
    if sha256(data) != manifest["inputArtifactSha256"]:
        raise ValueError("Staged case checksum mismatch")
    commands, mesh_name = command_plan(manifest["family"])
    work_root.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="usvsolver_",dir=work_root) as sandbox:
        case = Path(sandbox)
        unzip_restricted(data,case)
        mesh = case / mesh_name
        if not mesh.is_file() or mesh.is_symlink():
            raise ValueError("Required pre-generated mesh file absent")
        if sha256(mesh.read_bytes()) != manifest["meshArtifactSha256"]:
            raise ValueError("Mesh checksum mismatch")
        logs: list[dict] = []
        for argv in commands:
            try:
                p = runner(argv,cwd=str(case),capture_output=True,text=True,
                           timeout=1800,check=False,env={
                               "PATH":os.environ.get("USV_SOLVER_BIN_PATH","/usr/bin:/bin"),
                               "HOME":str(case),"LC_ALL":"C"
                           })
            except (OSError, subprocess.TimeoutExpired) as exc:
                raise RuntimeError("Actual solver execution unavailable or timed out") from exc
            combined = (p.stdout or "") + "\n" + (p.stderr or "")
            logs.append({"executable":argv[0],"returnCode":p.returncode,
                         "logSha256":sha256(combined.encode())})
            if p.returncode != 0:
                raise RuntimeError("Solver command failed: "+argv[0])
        # No fake GCI/mesh convergence: a single CFD/FEA run cannot certify it.
        receipt = {
            "jobId":manifest["jobRef"],
            "acceptedInputDigest":manifest["manifestSha256"],
            "state":"COMPLETED",
            "solverVersion":"NOT_RECORDED",
            "quality":None,
            "engineeringValidated":False,
            "independentReferenceValidated":False,
            "engineeringReleaseAuthorized":False,
            "executionLogs":logs,
            "limitations":["Actual solver ran but externally hosted output, validated mesh-refinement uncertainty and independent witness are NOT established"]
        }
        return receipt

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest",required=True)
    args = parser.parse_args()
    path = Path(args.manifest).resolve()
    if path.stat().st_size > 1024*1024:
        raise SystemExit("Manifest too large")
    manifest = json.loads(path.read_text())
    approved = set(filter(None,os.environ.get("USV_SOLVER_APPROVED_ARTIFACT_DIGESTS","").split(",")))
    stage = Path(os.environ.get("USV_SOLVER_STAGING_DIR","/var/lib/usv-solver/staged"))
    root = Path(os.environ.get("USV_SOLVER_WORK_DIR","/var/lib/usv-solver/work"))
    print(json.dumps(run_staged_case(manifest,stage,root,approved),indent=2))
