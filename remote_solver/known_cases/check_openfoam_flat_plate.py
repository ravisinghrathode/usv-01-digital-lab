"""Check a real OpenFOAM v2606 turbulent flat-plate commissioning receipt.

The official OpenFOAM V&V case is a zero-pressure-gradient turbulent flat plate
based on NASA's turbulence-modeling reference at Re_L=5e6. This checker proves
real execution and retained evidence. Numerical acceptance and experimental
skin-friction correlation are reported separately; no hull-resistance claim.
"""
import json, math, sys, zipfile
from pathlib import Path

result=json.loads(Path(sys.argv[1]).read_text())
state=result.get("state")
if state not in ("COMPUTE_DONE_EVIDENCE_PENDING","COMPUTE_DONE_QUALITY_REJECTED"):
    raise SystemExit("Unexpected solver state: "+str(state))
version=str(result.get("solverVersion",""))
if not version or version=="NOT_RECORDED" or version.startswith("UNPARSED:"):
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
    post=[n for n in names if n.startswith("postProcessing/")]

quality_passed=state=="COMPUTE_DONE_EVIDENCE_PENDING"
print(json.dumps({
    "status":("REAL_OPENFOAM_FLAT_PLATE_COMPUTE_DONE_UNCERTIFIED"
              if quality_passed else
              "REAL_OPENFOAM_FLAT_PLATE_EXECUTED_QUALITY_REJECTED"),
    "solverExecutionProved":True,
    "numericalQualityPlanPassed":quality_passed,
    "qualityGateIssue":result.get("qualityGateIssue"),
    "solverVersion":version,
    "benchmark":"OpenFOAM v2606 turbulent flat plate ZPG, Re_L=5e6",
    "reference":"https://doc.openfoam.com/2606/examples/verification-validation/turbulent/flat-plate-zpg/",
    "finalResidual":q["finalResidual"],
    "maximumMeshSkewness":q["maximumMeshSkewness"],
    "maximumNonOrthogonalityDeg":q["maximumNonOrthogonalityDeg"],
    "postProcessingFiles":post[:100],
    "gridUncertaintyFraction":q.get("gridUncertaintyFraction"),
    "evidenceSha256":result.get("outputSha256"),
    "engineeringReleaseAuthorized":False,
    "agentResultUsePermitted":False,
    "limitations":[
        "This proves the restricted real OpenFOAM execution/evidence path.",
        "Skin-friction reference correlation must be extracted before CFD model validation is claimed.",
        "No hull/free-surface resistance model was validated.",
        "No three-grid GCI uncertainty was established."
    ]
},indent=2))
