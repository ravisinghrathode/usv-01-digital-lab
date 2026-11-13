"""Validate execution evidence for the real OpenFOAM backward-facing-step case.

This is an execution-path commissioning check, deliberately separate from
numerical acceptance. A solver run that exits normally but fails its declared
mesh/residual criteria is valid evidence that the restricted CFD path executed,
but remains unusable by design agents and cannot support engineering release.
"""
import json, math, sys, zipfile
from pathlib import Path

result=json.loads(Path(sys.argv[1]).read_text())
state=result.get("state")
if state not in ("COMPUTE_DONE_EVIDENCE_PENDING","COMPUTE_DONE_QUALITY_REJECTED"):
    raise SystemExit("Unexpected solver state: "+str(state))
version=str(result.get("solverVersion",""))
if not version or version=="NOT_RECORDED":
    raise SystemExit("OpenFOAM solver version missing")
q=result.get("quality") or {}
for key in ("finalResidual","maximumMeshSkewness","maximumNonOrthogonalityDeg"):
    value=q.get(key)
    if not isinstance(value,(int,float)) or not math.isfinite(value):
        raise SystemExit("Missing CFD quality metric: "+key)
archive=Path(result["outputArtifactLocalPath"])
if not archive.is_file():
    raise SystemExit("Retained evidence archive missing")
with zipfile.ZipFile(archive) as z:
    names=set(z.namelist())
    required={"checkMesh.log","simpleFoam.log","solver-summary.json","version.log"}
    missing=required-names
    if missing:
        raise SystemExit("Evidence archive missing "+repr(sorted(missing)))

quality_rejected=state=="COMPUTE_DONE_QUALITY_REJECTED"
status=("REAL_OPENFOAM_BACKWARD_STEP_EXECUTED_QUALITY_REJECTED"
        if quality_rejected
        else "REAL_OPENFOAM_BACKWARD_STEP_COMPUTE_DONE_EVIDENCE_PENDING")
print(json.dumps({
    "status":status,
    "solverExecutionProved":True,
    "numericalQualityPlanPassed":not quality_rejected,
    "qualityGateIssue":result.get("qualityGateIssue"),
    "solverVersion":version,
    "benchmark":"Driver & Seegmiller backward-facing step, Re_h=36000",
    "publishedReattachmentLengthXoverH":"6.26 +/- 0.1",
    "finalResidual":q["finalResidual"],
    "initialResidualsByField":q.get("initialResidualsByField"),
    "solverDeclaredConverged":q.get("solverDeclaredConverged"),
    "maximumMeshSkewness":q["maximumMeshSkewness"],
    "maximumNonOrthogonalityDeg":q["maximumNonOrthogonalityDeg"],
    "gridUncertaintyFraction":q.get("gridUncertaintyFraction"),
    "evidenceSha256":result.get("outputSha256"),
    "engineeringReleaseAuthorized":False,
    "agentResultUsePermitted":False if quality_rejected else True,
    "limitations":[
        "This proves the restricted OpenFOAM executable/case/evidence path ran on a real solver.",
        "A quality-rejected result is diagnostic evidence only and is blocked from design agents.",
        "The commissioning checker does not yet derive reattachment length from the computed field.",
        "No hull/free-surface resistance case was validated.",
        "No multi-grid convergence uncertainty was established."
    ]
},indent=2))
