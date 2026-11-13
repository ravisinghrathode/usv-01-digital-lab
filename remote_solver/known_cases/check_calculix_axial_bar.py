"""Check real CalculiX commissioning output against the analytical axial bar.

This is a software/solver-path commissioning check, not validation of naval FEA.
"""
import json, math, sys, zipfile
from pathlib import Path

result=json.loads(Path(sys.argv[1]).read_text())
if result.get('state')!='COMPUTE_DONE_EVIDENCE_PENDING':
    raise SystemExit('Unexpected solver state')
version=str(result.get('solverVersion',''))
if not version or version=='NOT_RECORDED':
    raise SystemExit('Solver version missing')
key=result.get('keyResults') or {}
stress=key.get('maxAbsoluteStressComponent')
disp=key.get('maxDisplacementMagnitude')
if not isinstance(stress,(int,float)) or not math.isfinite(stress):
    raise SystemExit('Parsed stress missing')
if not isinstance(disp,(int,float)) or not math.isfinite(disp):
    raise SystemExit('Parsed displacement missing')
expected_stress=100.0
expected_disp=100.0*10.0/(1.0*210000.0)
stress_rel=abs(stress-expected_stress)/expected_stress
disp_rel=abs(disp-expected_disp)/expected_disp
# 3-D end constraints and one-element-thick mesh create local effects. This gate
# is deliberately loose enough for commissioning, not an accuracy certificate.
if stress_rel>0.15:
    raise SystemExit(f'FE stress differs from analytical bar by {stress_rel:.3%}')
if disp_rel>0.15:
    raise SystemExit(f'FE displacement differs from analytical bar by {disp_rel:.3%}')
archive=Path(result['outputArtifactLocalPath'])
if not archive.is_file():
    raise SystemExit('Retained evidence archive missing')
with zipfile.ZipFile(archive) as z:
    required={'model.dat','model.frd','solver-summary.json','version.log','ccx.log'}
    missing=required-set(z.namelist())
    if missing:
        raise SystemExit('Evidence archive missing '+repr(sorted(missing)))
print(json.dumps({
    'status':'REAL_CALCULIX_KNOWN_CASE_PASS_UNCERTIFIED',
    'solverVersion':version,
    'maxStressComponentMpa':stress,
    'analyticalStressMpa':expected_stress,
    'stressRelativeError':stress_rel,
    'maxDisplacementMm':disp,
    'analyticalDisplacementMm':expected_disp,
    'displacementRelativeError':disp_rel,
    'evidenceSha256':result.get('outputSha256'),
    'engineeringReleaseAuthorized':False
},indent=2))
