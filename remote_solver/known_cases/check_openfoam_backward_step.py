"""Validate a real OpenFOAM backward-facing-step commissioning receipt.

The case is OpenFOAM's canonical Driver & Seegmiller turbulent backward-facing
step verification/validation tutorial (Re_h=36000). This checker establishes
that the restricted worker can execute a real CFD case, enforce mesh/residual
quality and retain evidence. It does not establish hull-resistance accuracy,
grid convergence or marine engineering release.
"""
import json, math, sys, zipfile
from pathlib import Path

result=json.loads(Path(sys.argv[1]).read_text())
if result.get("state")!="COMPUTE_DONE_EVIDENCE_PENDING":
    raise SystemExit("Unexpected solver state")
version=str(result.get("solverVersion",""))
if not version or version=="NOT_RECORDED":
    raise SystemExit("OpenFOAM solver version missing")
q=result.get("quality") or {}
for key in ("finalResidual","maximumMeshSkewness","maximumNonOrthogonalityDeg"):
    value=q.get(key)
    if not isinstance(value,(int,float)) or not math.isfinite(value):
        raise SystemExit("Missing CFD quality metric: "+key)
if q["finalResidual"] > 1e-4:
    raise SystemExit("Final residual exceeds commissioning threshold")
if q["maximumMeshSkewness"] > 4:
    raise SystemExit("Mesh skewness exceeds commissioning threshold")
if q["maximumNonOrthogonalityDeg"] > 70:
    raise SystemExit("Mesh non-orthogonality exceeds commissioning threshold")
archive=Path(result["outputArtifactLocalPath"])
if not archive.is_file():
    raise SystemExit("Retained evidence archive missing")
with zipfile.ZipFile(archive) as z:
    names=set(z.namelist())
    required={"checkMesh.log","simpleFoam.log","solver-summary.json","version.log"}
    missing=required-names
    if missing:
        raise SystemExit("Evidence archive missing "+repr(sorted(missing)))
print(json.dumps({
    "status":"REAL_OPENFOAM_BACKWARD_STEP_PASS_UNCERTIFIED",
    "solverVersion":version,
    "benchmark":"Driver & Seegmiller backward-facing step, Re_h=36000",
    "publishedReattachmentLengthXoverH":"6.26 +/- 0.1",
    "finalResidual":q["finalResidual"],
    "maximumMeshSkewness":q["maximumMeshSkewness"],
    "maximumNonOrthogonalityDeg":q["maximumNonOrthogonalityDeg"],
    "gridUncertaintyFraction":q.get("gridUncertaintyFraction"),
    "evidenceSha256":result.get("outputSha256"),
    "engineeringReleaseAuthorized":False,
    "limitations":[
        "This run proves the restricted OpenFOAM execution/evidence path.",
        "The commissioning checker does not yet derive reattachment length from the computed field.",
        "No hull/free-surface resistance case was validated.",
        "No multi-grid convergence uncertainty was established."
    ]
},indent=2))
