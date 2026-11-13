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
import math
import os
import re
import resource
import stat
import subprocess
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from typing import Callable, Iterable

SHA = re.compile(r"^sha256:[0-9a-f]{64}$")
GIT_SHA = re.compile(r"^[0-9a-f]{40}$")
JOB = re.compile(r"^[A-Za-z0-9_-]{3,64}$")
MAX_ZIP = 128 * 1024 * 1024
MAX_UNPACK = 512 * 1024 * 1024
MAX_FILES = 1500
MAX_PERSIST_BYTES = 256 * 1024 * 1024
DEFAULT_CPU_SECONDS = 1800
DEFAULT_ADDRESS_SPACE_BYTES = 8 * 1024 * 1024 * 1024
DEFAULT_FILE_BYTES = 2 * 1024 * 1024 * 1024
DEFAULT_OPEN_FILES = 1024
DEFAULT_PROCESSES = 64
DEFAULT_WALL_TIMEOUT_SECONDS = 1800

RESOURCE_BOUNDS = {
    "USV_SOLVER_CPU_SECONDS": (30, 24 * 3600),
    "USV_SOLVER_ADDRESS_SPACE_BYTES": (512 * 1024 * 1024, 256 * 1024 * 1024 * 1024),
    "USV_SOLVER_FILE_BYTES": (16 * 1024 * 1024, 64 * 1024 * 1024 * 1024),
    "USV_SOLVER_OPEN_FILES": (64, 65536),
    "USV_SOLVER_PROCESSES": (1, 4096),
    "USV_SOLVER_WALL_TIMEOUT_SECONDS": (30, 24 * 3600),
}
FLOAT = r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][-+]?\d+)?"

def sha256(payload: bytes) -> str:
    return "sha256:" + hashlib.sha256(payload).hexdigest()

def _finite_number(value) -> bool:
    return type(value) in (float, int) and math.isfinite(float(value))

def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc
    low, high = RESOURCE_BOUNDS[name]
    if value < low or value > high:
        raise RuntimeError(f"{name} outside allowed host range [{low},{high}]")
    return value

def resource_policy() -> dict[str, int]:
    """Validated host-configurable ceilings; defaults preserve prior behavior."""
    return {
        "cpuSeconds": _env_int("USV_SOLVER_CPU_SECONDS", DEFAULT_CPU_SECONDS),
        "addressSpaceBytes": _env_int("USV_SOLVER_ADDRESS_SPACE_BYTES", DEFAULT_ADDRESS_SPACE_BYTES),
        "fileBytes": _env_int("USV_SOLVER_FILE_BYTES", DEFAULT_FILE_BYTES),
        "openFiles": _env_int("USV_SOLVER_OPEN_FILES", DEFAULT_OPEN_FILES),
        "processes": _env_int("USV_SOLVER_PROCESSES", DEFAULT_PROCESSES),
        "wallTimeoutSeconds": _env_int("USV_SOLVER_WALL_TIMEOUT_SECONDS", DEFAULT_WALL_TIMEOUT_SECONDS),
    }

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
    if manifest.get("family") == "CALCULIX_FEA":
        if not _finite_number(plan.get("maxElementAspectRatio")) or float(plan["maxElementAspectRatio"]) < 1:
            raise ValueError("CalculiX jobs require maxElementAspectRatio >= 1")
        if not _finite_number(plan.get("minScaledJacobian")) or not 0 < float(plan["minScaledJacobian"]) <= 1:
            raise ValueError("CalculiX jobs require minScaledJacobian in (0,1]")

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

def _limit_resources() -> None:
    """Hard child-process ceilings from validated host policy."""
    policy = resource_policy()
    limits = (
        (resource.RLIMIT_CPU, policy["cpuSeconds"], policy["cpuSeconds"] + 5),
        (resource.RLIMIT_AS, policy["addressSpaceBytes"], policy["addressSpaceBytes"]),
        (resource.RLIMIT_FSIZE, policy["fileBytes"], policy["fileBytes"]),
        (resource.RLIMIT_NOFILE, policy["openFiles"], policy["openFiles"]),
        (resource.RLIMIT_CORE, 0, 0),
    )
    for kind, soft, hard in limits:
        resource.setrlimit(kind, (soft, hard))
    if hasattr(resource, "RLIMIT_NPROC"):
        resource.setrlimit(resource.RLIMIT_NPROC, (policy["processes"], policy["processes"]))
    os.setsid()

def _wrapped_argv(argv: list[str], isolation_mode: str) -> list[str]:
    if isolation_mode == "UNSHARE_NET":
        return ["unshare", "--net", "--", *argv]
    if isolation_mode == "TEST_NO_NAMESPACE":
        return argv
    raise ValueError("Unsupported network-isolation mode")

def _solver_environment(case: Path) -> dict[str, str]:
    # Do not inherit the host environment wholesale. OpenFOAM's Debian/Ubuntu
    # binaries require WM_PROJECT_DIR to find their shipped etc dictionaries.
    # The path is operator-controlled, never supplied by the case archive/API.
    wm_project_dir = os.environ.get("USV_OPENFOAM_PROJECT_DIR", "/usr/share/openfoam")
    if not os.path.isabs(wm_project_dir) or ".." in Path(wm_project_dir).parts:
        raise RuntimeError("USV_OPENFOAM_PROJECT_DIR must be an absolute trusted host path")
    return {
        "PATH": os.environ.get("USV_SOLVER_BIN_PATH", "/usr/bin:/bin"),
        "HOME": str(case), "LC_ALL": "C",
        "WM_PROJECT_DIR": wm_project_dir,
        "OMP_NUM_THREADS": os.environ.get("USV_SOLVER_OMP_THREADS", "2"),
        "OPENBLAS_NUM_THREADS": os.environ.get("USV_SOLVER_BLAS_THREADS", "2"),
    }

def _run(runner: Callable[..., subprocess.CompletedProcess], argv: list[str], case: Path,
         timeout: int | None = None, isolation_mode: str = "UNSHARE_NET") -> subprocess.CompletedProcess:
    effective_timeout = resource_policy()["wallTimeoutSeconds"] if timeout is None else timeout
    return runner(
        _wrapped_argv(argv, isolation_mode), cwd=str(case), capture_output=True,
        text=True, timeout=effective_timeout, check=False, preexec_fn=_limit_resources,
        env=_solver_environment(case)
    )

def _version_command(family: str) -> list[str]:
    return ["simpleFoam", "-help"] if family == "OPENFOAM_CFD" else ["ccx", "-v"]

def _parse_version(text: str, family: str) -> str:
    patterns = (
        [r"OpenFOAM[^\n]*?(?:v|version[ :=-]*)([A-Za-z0-9_.+-]+)", r"OpenFOAM[- ]([A-Za-z0-9_.+-]+)"]
        if family == "OPENFOAM_CFD"
        else [r"(?:CalculiX(?: CrunchiX)?[^\n]*?(?:version|Version)?[ :=-]*|This\s+is\s+Version\s+)([0-9]+(?:\.[0-9]+)+)"]
    )
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1)
    for line in text.splitlines():
        if line.strip():
            return "UNPARSED:" + line.strip()[:120]
    return "NOT_RECORDED"

def _parse_check_mesh(check_log: str, case: Path) -> dict:
    data: dict = {}
    check_json = case / "checkMesh.json"
    if check_json.is_file():
        try:
            loaded = json.loads(check_json.read_text(errors="replace"))
            if isinstance(loaded, dict):
                data = loaded
        except (OSError, json.JSONDecodeError):
            data = {}
    max_non_orth = data.get("maxNonOrth")
    max_skew = data.get("maxSkew")
    if not isinstance(max_non_orth, (int, float)) or not math.isfinite(float(max_non_orth)):
        matches = re.findall(
            rf"(?:Mesh\s+non-orthogonality\s+Max:|max(?:imum)?\s+non[- ]?orthogonality(?:\s*=|:))\s*({FLOAT})",
            check_log, re.IGNORECASE)
        max_non_orth = float(matches[-1]) if matches else None
    if not isinstance(max_skew, (int, float)) or not math.isfinite(float(max_skew)):
        matches = re.findall(
            rf"(?:Max(?:imum)?\s+(?:boundary\s+|internal\s+)?skew(?:ness)?(?:\s*=|:)|maxSkew\s*[:=])\s*({FLOAT})",
            check_log, re.IGNORECASE)
        max_skew = float(matches[-1]) if matches else None
    return {
        "maximumMeshSkewness": float(max_skew) if isinstance(max_skew, (int, float)) else None,
        "maximumNonOrthogonalityDeg": float(max_non_orth) if isinstance(max_non_orth, (int, float)) else None,
    }

def _parse_final_residuals(solver_log: str) -> tuple[float | None, dict[str, float]]:
    last: dict[str, float] = {}
    pattern = re.compile(
        rf"Solving\s+for\s+([^,\s]+).*?Final\s+residual\s*=\s*({FLOAT})",
        re.IGNORECASE)
    for field, value in pattern.findall(solver_log):
        number = float(value)
        if math.isfinite(number):
            last[field] = number
    return (max(last.values()) if last else None, last)

def _parse_force_coefficients(case: Path) -> dict:
    for file in reversed(sorted(case.glob("postProcessing/**/coefficient.dat"))):
        lines = file.read_text(errors="replace").splitlines()
        headers = None
        rows: list[list[float]] = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith("#"):
                words = stripped.lstrip("#").strip().split()
                if words and words[0].lower() == "time":
                    headers = words
                continue
            try:
                rows.append([float(x) for x in stripped.split()])
            except ValueError:
                continue
        if not rows:
            continue
        row = rows[-1]
        if headers and len(headers) == len(row):
            return {
                "sourceFile": str(file.relative_to(case)), "time": row[0],
                "coefficients": {k:v for k,v in zip(headers[1:], row[1:]) if math.isfinite(v)}
            }
        return {"sourceFile": str(file.relative_to(case)), "time": row[0], "rawFinalNumericRow": row[1:]}
    return {}

def _parse_calculix_dat(case: Path) -> dict:
    dat = case / "model.dat"
    if not dat.is_file():
        return {}
    max_stress = None
    max_disp = None
    first_normal_stress_samples: list[float] = []
    mode = None
    for line in dat.read_text(errors="replace").splitlines():
        lower = line.lower()
        if "stress" in lower:
            mode = "stress"
            continue
        if "displacement" in lower:
            mode = "displacement"
            continue
        values = [float(v) for v in re.findall(FLOAT, line)]
        if mode == "stress" and len(values) >= 8:
            # CalculiX DAT ordering documented by header:
            # elem, integration point, sxx, syy, szz, sxy, sxz, syz.
            first_normal_stress_samples.append(values[2])
            for value in values[-6:]:
                max_stress = max(abs(value), max_stress or 0.0)
        elif mode == "displacement" and len(values) >= 4:
            xyz = values[-3:]
            magnitude = math.sqrt(sum(v*v for v in xyz))
            max_disp = max(magnitude, max_disp or 0.0)
    result = {"sourceFile": "model.dat"}
    if max_stress is not None:
        result["maxAbsoluteStressComponent"] = max_stress
    if first_normal_stress_samples:
        result["meanFirstNormalStressComponent"] = (
            sum(first_normal_stress_samples) / len(first_normal_stress_samples)
        )
        result["firstNormalStressSampleCount"] = len(first_normal_stress_samples)
    if max_disp is not None:
        result["maxDisplacementMagnitude"] = max_disp
    return result if len(result) > 1 else {}

def _scaled_jacobian_at(
    pts: list[tuple[float,float,float]], xi: float, eta: float, zeta: float
) -> float:
    signs = [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
             (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]
    cols: list[list[float]] = []
    for axis in range(3):
        col: list[float] = []
        for coord in range(3):
            total = 0.0
            for i,(sx,sy,sz) in enumerate(signs):
                if axis == 0:
                    d = sx * (1 + sy*eta) * (1 + sz*zeta) / 8
                elif axis == 1:
                    d = sy * (1 + sx*xi) * (1 + sz*zeta) / 8
                else:
                    d = sz * (1 + sx*xi) * (1 + sy*eta) / 8
                total += pts[i][coord] * d
            col.append(total)
        cols.append(col)
    a,b,c = cols
    det = (a[0]*(b[1]*c[2]-b[2]*c[1])
           - b[0]*(a[1]*c[2]-a[2]*c[1])
           + c[0]*(a[1]*b[2]-a[2]*b[1]))
    norms = [math.sqrt(sum(x*x for x in v)) for v in cols]
    denom = norms[0]*norms[1]*norms[2]
    return det/denom if denom > 0 else -1.0

def _parse_c3d8_mesh_quality(model: Path) -> dict:
    """C3D8 aspect + scaled-Jacobian screen at centre, 8 Gauss points and 8 corners."""
    nodes: dict[int,tuple[float,float,float]] = {}
    elements: list[list[int]] = []
    mode = None
    c3d8 = False
    for raw in model.read_text(errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("**"):
            continue
        if line.startswith("*"):
            upper = line.upper()
            mode = "NODE" if upper.startswith("*NODE") else "ELEM" if upper.startswith("*ELEMENT") else None
            c3d8 = mode == "ELEM" and "TYPE=C3D8" in upper.replace(" ","")
            continue
        parts = [p.strip() for p in line.split(",")]
        try:
            if mode == "NODE" and len(parts) >= 4:
                nodes[int(parts[0])] = (float(parts[1]),float(parts[2]),float(parts[3]))
            elif mode == "ELEM" and c3d8 and len(parts) >= 9:
                elements.append([int(x) for x in parts[1:9]])
        except ValueError:
            continue
    if not elements:
        raise RuntimeError("CalculiX mesh quality currently supports explicit C3D8 elements only")
    edges = [(0,1),(1,2),(2,3),(3,0),(4,5),(5,6),(6,7),(7,4),
             (0,4),(1,5),(2,6),(3,7)]
    signs = [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
             (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]
    g = 1 / math.sqrt(3)
    gauss = [(sx*g,sy*g,sz*g) for sx,sy,sz in signs]
    samples = [(0.0,0.0,0.0), *gauss, *[(float(x),float(y),float(z)) for x,y,z in signs]]
    max_aspect = 0.0
    min_scaled = 1.0
    worst_element = None
    worst_location = None
    for element_index, element in enumerate(elements, start=1):
        coords = [nodes.get(n) for n in element]
        if any(c is None for c in coords):
            raise RuntimeError("C3D8 element references missing node")
        pts = [c for c in coords if c is not None]
        lengths = []
        for a,b in edges:
            dx=pts[b][0]-pts[a][0];dy=pts[b][1]-pts[a][1];dz=pts[b][2]-pts[a][2]
            lengths.append(math.sqrt(dx*dx+dy*dy+dz*dz))
        if min(lengths) <= 0:
            raise RuntimeError("Degenerate C3D8 edge")
        max_aspect=max(max_aspect,max(lengths)/min(lengths))
        for location in samples:
            scaled = _scaled_jacobian_at(pts,*location)
            if scaled < min_scaled:
                min_scaled = scaled
                worst_element = element_index
                worst_location = location
    return {
        "maximumElementAspectRatio":max_aspect,
        "minimumScaledJacobian":min_scaled,
        "jacobianSamplesPerElement":len(samples),
        "worstJacobianElementOrdinal":worst_element,
        "worstJacobianNaturalCoordinates":worst_location,
    }

def _quality_gate_calculix(metrics: dict, plan: dict) -> None:
    aspect=metrics.get("maximumElementAspectRatio")
    jac=metrics.get("minimumScaledJacobian")
    if not _finite_number(aspect) or not _finite_number(jac):
        raise RuntimeError("CalculiX mesh-quality metrics missing")
    if aspect > plan["maxElementAspectRatio"]:
        raise RuntimeError("FEA element aspect ratio exceeds source-defined threshold")
    if jac < plan["minScaledJacobian"]:
        raise RuntimeError("FEA scaled Jacobian below source-defined threshold")

def _selected_artifacts(case: Path) -> Iterable[Path]:
    exact = {"solver-summary.json","checkMesh.log","simpleFoam.log","ccx.log","version.log",
             "checkMesh.json","model.dat","model.frd","model.sta","model.cvg"}
    for file in case.rglob("*"):
        if not file.is_file() or file.is_symlink():
            continue
        rel = file.relative_to(case).as_posix()
        if rel in exact or rel.startswith("postProcessing/"):
            yield file

def _persist_artifacts(case: Path, artifact_root: Path, job_ref: str, summary: dict) -> tuple[Path,str]:
    artifact_root.mkdir(parents=True, exist_ok=True, mode=0o700)
    (case / "solver-summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    archive_path = artifact_root / (job_ref + "-solver-evidence.zip")
    if archive_path.exists():
        raise FileExistsError("Immutable solver evidence archive already exists")
    total = 0
    with zipfile.ZipFile(archive_path, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        for file in _selected_artifacts(case):
            total += file.stat().st_size
            if total > MAX_PERSIST_BYTES:
                raise RuntimeError("Persisted solver evidence exceeds configured quota")
            archive.write(file, file.relative_to(case).as_posix())
    os.chmod(archive_path, 0o600)
    return archive_path, sha256(archive_path.read_bytes())

def _quality_gate_openfoam(metrics: dict, plan: dict) -> None:
    for key in ("finalResidual","maximumMeshSkewness","maximumNonOrthogonalityDeg"):
        value = metrics.get(key)
        if not isinstance(value, (int,float)) or not math.isfinite(float(value)):
            raise RuntimeError("Required OpenFOAM residual or mesh-quality metric was not produced")
    if metrics["finalResidual"] > plan["residualThreshold"]:
        raise RuntimeError("Final solver residual exceeds source-defined screening threshold")
    if metrics["maximumMeshSkewness"] > plan["maxMeshSkewness"]:
        raise RuntimeError("Mesh skewness exceeds source-defined screening threshold")
    if metrics["maximumNonOrthogonalityDeg"] > plan["maxNonOrthogonalityDeg"]:
        raise RuntimeError("Mesh non-orthogonality exceeds source-defined screening threshold")

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
                    runner: Callable[..., subprocess.CompletedProcess] = subprocess.run,
                    *, artifact_root: Path | None = None,
                    isolation_mode: str = "UNSHARE_NET") -> dict:
    validate_request(manifest,approved)
    archive_path = stage / (manifest["inputArtifactSha256"][7:] + ".zip")
    if archive_path.is_symlink() or not archive_path.is_file():
        raise FileNotFoundError("Approved case is not staged")
    data = archive_path.read_bytes()
    if sha256(data) != manifest["inputArtifactSha256"]:
        raise ValueError("Staged case checksum mismatch")
    commands, mesh_name = command_plan(manifest["family"])
    work_root.mkdir(parents=True,exist_ok=True,mode=0o700)
    artifact_root = artifact_root or (work_root.parent / "artifacts")
    with tempfile.TemporaryDirectory(prefix="usvsolver_",dir=work_root) as sandbox:
        case = Path(sandbox)
        unzip_restricted(data,case)
        mesh = case / mesh_name
        if not mesh.is_file() or mesh.is_symlink():
            raise ValueError("Required pre-generated mesh/model file absent")
        if sha256(mesh.read_bytes()) != manifest["meshArtifactSha256"]:
            raise ValueError("Mesh checksum mismatch")

        version_run = _run(runner,_version_command(manifest["family"]),case,
                           timeout=30,isolation_mode=isolation_mode)
        version_text = (version_run.stdout or "") + "\n" + (version_run.stderr or "")
        (case / "version.log").write_text(version_text)
        solver_version = _parse_version(version_text,manifest["family"])
        # Some packaged solver CLIs use a non-zero status for informational
        # version/help modes. Trust only a parser-recognized solver banner;
        # unshare/binary failures do not contain one and therefore fail closed.
        if solver_version == "NOT_RECORDED" or solver_version.startswith("UNPARSED:"):
            raise RuntimeError("Unable to query a parseable actual solver version")

        logs: list[dict] = []
        command_text: dict[str,str] = {}
        for argv in commands:
            try:
                p = _run(runner,argv,case,isolation_mode=isolation_mode)
            except (OSError, subprocess.TimeoutExpired) as exc:
                raise RuntimeError("Actual solver execution unavailable or timed out") from exc
            combined = (p.stdout or "") + "\n" + (p.stderr or "")
            command_text[argv[0]] = combined
            (case / (argv[0] + ".log")).write_text(combined)
            logs.append({"executable":argv[0],"returnCode":p.returncode,
                         "logSha256":sha256(combined.encode())})
            if p.returncode != 0:
                raise RuntimeError("Solver command failed: "+argv[0])

        quality = {
            "finalResidual":None,
            "gridUncertaintyFraction":None,
            "maximumMeshSkewness":None,
            "maximumNonOrthogonalityDeg":None,
            "maximumElementAspectRatio":None,
            "minimumScaledJacobian":None
        }
        key_results: dict = {}
        if manifest["family"] == "OPENFOAM_CFD":
            quality.update(_parse_check_mesh(command_text.get("checkMesh",""),case))
            residual, residuals_by_field = _parse_final_residuals(command_text.get("simpleFoam",""))
            quality["finalResidual"] = residual
            _quality_gate_openfoam(quality,manifest["qualityPlan"])
            key_results = {
                "finalResidualsByField":residuals_by_field,
                "forceCoefficients":_parse_force_coefficients(case)
            }
        else:
            quality.update(_parse_c3d8_mesh_quality(case / "model.inp"))
            _quality_gate_calculix(quality,manifest["qualityPlan"])
            key_results = _parse_calculix_dat(case)

        summary = {
            "jobId":manifest["jobRef"],
            "acceptedInputDigest":manifest["manifestSha256"],
            "family":manifest["family"],
            "solverVersion":solver_version,
            "quality":quality,
            "keyResults":key_results,
            "engineeringValidated":False,
            "independentReferenceValidated":False,
            "engineeringReleaseAuthorized":False,
            "executionLogs":logs,
            "resourcePolicy":resource_policy(),
            "networkIsolationMode":isolation_mode,
            "limitations":[
                "Retained solver output and parsed metrics do not establish model validity.",
                "Grid uncertainty remains pending an independently reviewed multi-grid study.",
                "Physical/reference validation and qualified engineering review remain mandatory."
            ]
        }
        evidence_path,evidence_sha = _persist_artifacts(
            case,artifact_root,manifest["jobRef"],summary)
        return {
            **summary,
            "state":"COMPUTE_DONE_EVIDENCE_PENDING",
            "outputArtifactLocalPath":str(evidence_path),
            "outputSha256":evidence_sha
        }

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
    artifacts = Path(os.environ.get("USV_SOLVER_ARTIFACT_DIR","/var/lib/usv-solver/artifacts"))
    print(json.dumps(run_staged_case(
        manifest,stage,root,approved,artifact_root=artifacts,
        isolation_mode="UNSHARE_NET"),indent=2))
