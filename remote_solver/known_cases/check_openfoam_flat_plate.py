"""Check the real OpenFOAM turbulent-flat-plate commissioning receipt.

The Ubuntu packaged tutorial is a zero-pressure-gradient turbulent flat plate
based on the NASA turbulence-modeling flat-plate reference. This check proves
the restricted worker can execute and retain a real OpenFOAM CFD case. It does
NOT claim hull resistance validation or grid convergence.
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
    "status":"REAL_OPENFOAM_FLAT_PLATE_PASS_UNCERTIFIED",
    "solverVersion":version,
    "finalResidual":q["finalResidual"],
    "maximumMeshSkewness":q["maximumMeshSkewness"],
    "maximumNonOrthogonalityDeg":q["maximumNonOrthogonalityDeg"],
    "gridUncertaintyFraction":q.get("gridUncertaintyFraction"),
    "evidenceSha256":result.get("outputSha256"),
    "engineeringReleaseAuthorized":False,
    "limitations":[
        "Official packaged turbulent-flat-plate tutorial proves CFD execution path only.",
        "No hull/free-surface resistance model was validated.",
        "No multi-grid convergence uncertainty was established."
    ]
},indent=2))
