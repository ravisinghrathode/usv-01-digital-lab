"""Check a real OpenFOAM v2606 turbulent flat-plate commissioning receipt.

The official OpenFOAM V&V case is a zero-pressure-gradient turbulent flat plate
based on NASA's turbulence-modeling reference at Re_L=5e6. This checker proves
real execution and retained evidence. When Cx/wallShearStress fields are
available it also reports correlation to the Weighardt skin-friction curve
used by the OpenFOAM tutorial. No acceptance threshold is invented here.
"""
import json, math, re, statistics, sys, zipfile
from pathlib import Path

RE_L=5.0e6
U_REF=69.4
WEIGHARDT_FORMULA="Cf=0.288*(log10(Re_x))^-2.45"
REFERENCE="https://doc.openfoam.com/2606/examples/verification-validation/turbulent/flat-plate-zpg/"

def bottom_wall_values(text:str):
    m=re.search(
        r"bottomWall\s*\{.*?value\s+nonuniform\s+List<([^>]+)>\s+\d+\s*\((.*?)\)\s*;",
        text,re.S)
    if not m:
        return []
    kind=m.group(1).strip().lower()
    payload=m.group(2)
    if "vector" in kind:
        out=[]
        for x,y,z in re.findall(
            r"\(\s*([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s*\)",payload):
            try: out.append((float(x),float(y),float(z)))
            except ValueError: pass
        return out
    out=[]
    for token in re.findall(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][-+]?\d+)?",payload):
        try: out.append(float(token))
        except ValueError: pass
    return out

def correlation_from_archive(z:zipfile.ZipFile):
    numeric_times={}
    for name in z.namelist():
        parts=name.split("/")
        if len(parts)==2 and parts[1] in ("Cx","wallShearStress","yPlus"):
            try: t=float(parts[0])
            except ValueError: continue
            numeric_times.setdefault(t,set()).add(parts[1])
    candidates=[t for t,names in numeric_times.items()
                if "Cx" in names and "wallShearStress" in names]
    if not candidates:
        return {"available":False,"reason":"retained Cx/wallShearStress boundary fields absent"}
    t=max(candidates)
    prefix=(str(int(t)) if float(t).is_integer() else str(t))+"/"
    # ZIP names preserve OpenFOAM's exact time directory formatting; locate by
    # numeric equivalence rather than assuming str(float) formatting.
    def member(field):
        for name in z.namelist():
            parts=name.split("/")
            if len(parts)==2 and parts[1]==field:
                try:
                    if float(parts[0])==t:return name
                except ValueError:pass
        return None
    cx_name=member("Cx");tau_name=member("wallShearStress");yp_name=member("yPlus")
    if not cx_name or not tau_name:
        return {"available":False,"reason":"latest retained time lacks benchmark fields"}
    xs=bottom_wall_values(z.read(cx_name).decode(errors="replace"))
    taus=bottom_wall_values(z.read(tau_name).decode(errors="replace"))
    yps=bottom_wall_values(z.read(yp_name).decode(errors="replace")) if yp_name else []
    n=min(len(xs),len(taus))
    if n<10:
        return {"available":False,"reason":"insufficient bottom-wall samples","sampleCount":n}
    # Cx can be scalar or vector depending on OpenFOAM release/function object.
    xvals=[float(v[0] if isinstance(v,tuple) else v) for v in xs[:n]]
    xmax=max(xvals)
    if not math.isfinite(xmax) or xmax<=0:
        return {"available":False,"reason":"invalid plate coordinates"}
    rows=[]
    for i,(x,tau) in enumerate(zip(xvals,taus[:n])):
        rex=(x/xmax)*RE_L
        if rex<1e5: # avoid leading-edge singular/correlation edge behavior
            continue
        if isinstance(tau,tuple):
            taumag=math.sqrt(sum(v*v for v in tau))
        else:
            taumag=abs(float(tau))
        cf=taumag/(0.5*U_REF*U_REF)
        ref=0.288*(math.log10(rex)**-2.45)
        if ref<=0 or not math.isfinite(cf):
            continue
        rows.append({
            "Re_x":rex,"Cf":cf,"referenceCf":ref,
            "relativeError":abs(cf-ref)/ref,
            "yPlus":(float(yps[i]) if i<len(yps) and not isinstance(yps[i],tuple) else None)
        })
    if not rows:
        return {"available":False,"reason":"no usable finite correlation samples"}
    errors=[r["relativeError"] for r in rows]
    return {
        "available":True,
        "time":t,
        "sampleCount":len(rows),
        "formula":WEIGHARDT_FORMULA,
        "meanAbsoluteRelativeError":sum(errors)/len(errors),
        "medianAbsoluteRelativeError":statistics.median(errors),
        "maxAbsoluteRelativeError":max(errors),
        "minimumReX":min(r["Re_x"] for r in rows),
        "maximumReX":max(r["Re_x"] for r in rows),
        "medianYPlus":statistics.median(
            [r["yPlus"] for r in rows if r["yPlus"] is not None]
        ) if any(r["yPlus"] is not None for r in rows) else None,
        "acceptanceThresholdDefined":False,
        "referenceValidationAccepted":False,
    }

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
    correlation=correlation_from_archive(z)

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
    "reference":REFERENCE,
    "skinFrictionCorrelation":correlation,
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
        "Skin-friction correlation is reported but has no independently approved acceptance threshold.",
        "No hull/free-surface resistance model was validated.",
        "No three-grid GCI uncertainty was established by this single benchmark run."
    ]
},indent=2))
