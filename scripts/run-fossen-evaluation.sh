#!/usr/bin/env bash
# RESEARCH ONLY. Manual execution on a disposable credential-free GitHub runner.
set -euo pipefail
if [[ "${GITHUB_ACTIONS:-}" != 'true' || "${RUNNER_OS:-}" != 'Linux' || "${FOSSEN_RISK_ACK:-}" != 'I_ACKNOWLEDGE_DISPOSABLE_THIRD_PARTY_EXECUTION' ]]; then
  echo 'Refusing evaluation: requires manually acknowledged disposable Linux runner' >&2
  exit 2
fi
for program in docker git node python3 sha256sum; do command -v "$program" >/dev/null || { echo "Missing $program" >&2; exit 2; }; done
: "${RUNNER_TEMP:?Missing RUNNER_TEMP}"
SPEC='references/third-party-candidates/fossen-python-vehicle-simulator.json'
OUT="$RUNNER_TEMP/fossen-evaluation"
CTX="$RUNNER_TEMP/fossen-trusted-build"
mkdir -p "$OUT" "$CTX/wheels"
cleanup() { rm -rf "$OUT/source" "$CTX"; }
trap cleanup EXIT

# The token is confined to metadata intake and removed before staging/execution.
INTAKE_TOKEN="${GITHUB_TOKEN:-}"
unset GITHUB_TOKEN
GITHUB_TOKEN="$INTAKE_TOKEN" node scripts/repository-integration.mjs intake --spec "$SPEC" --out-dir "$OUT"
unset INTAKE_TOKEN
node scripts/repository-integration.mjs stage --spec "$SPEC" --out-dir "$OUT"
node --input-type=module <<'JS'
import fs from 'node:fs';
const root=process.env.RUNNER_TEMP+'/fossen-evaluation/';
const a=JSON.parse(fs.readFileSync(root+'intake.json','utf8'));
const b=JSON.parse(fs.readFileSync(root+'stage.json','utf8'));
if(a.commit!==b.commit||a.tree!==b.tree||a.repository!==b.repo||b.dynamicExecution!==false||b.approved!==false)
  throw Error('Source immutable revision and Git tree mismatch');
JS

# Only a measured, offline-installed NumPy wheel is allowed in the disposable image.
python3 -m pip download --only-binary=:all: --no-deps 'numpy==2.3.5' --dest "$CTX/wheels"
COUNT="$(find "$CTX/wheels" -type f -name 'numpy-*.whl' | wc -l | tr -d ' ')"
[[ "$COUNT" == '1' ]] || { echo 'Exactly one NumPy wheel required' >&2; exit 2; }
WHEEL="$(find "$CTX/wheels" -type f -name 'numpy-*.whl' -print -quit)"
WHEEL_SHA="$(sha256sum "$WHEEL" | cut -d' ' -f1)"
cp integrations/candidates/fossen_python_vehicle_simulator_adapter.py "$CTX/fossen_adapter.py"
ADAPTER_SHA="$(sha256sum "$CTX/fossen_adapter.py" | cut -d' ' -f1)"
docker pull --platform linux/amd64 python:3.12-slim
BASE_DIGEST="$(docker image inspect python:3.12-slim --format '{{index .RepoDigests 0}}')"
[[ "$BASE_DIGEST" =~ ^[a-zA-Z0-9_.:/-]+@sha256:[0-9a-f]{64}$ ]] || { echo 'No immutable base digest' >&2; exit 2; }
cat > "$CTX/Dockerfile" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
ARG NUMPY_WHEEL_SHA
COPY wheels/ /opt/usv01/wheels/
COPY fossen_adapter.py /opt/usv01/fossen_adapter.py
RUN printf 'numpy==2.3.5 --hash=sha256:%s\n' "$NUMPY_WHEEL_SHA" > /tmp/requirements.lock \
    && python3 -m pip install --no-index --no-deps --only-binary=:all: --require-hashes --find-links=/opt/usv01/wheels -r /tmp/requirements.lock \
    && rm -rf /opt/usv01/wheels /tmp/requirements.lock
ENV PYTHONDONTWRITEBYTECODE=1
USER 65534:65534
WORKDIR /candidate
DOCKER
docker build --network=none --pull=false \
  --build-arg "BASE_IMAGE=$BASE_DIGEST" --build-arg "NUMPY_WHEEL_SHA=$WHEEL_SHA" \
  --iidfile "$OUT/image-id.txt" --file "$CTX/Dockerfile" "$CTX"
IMAGE_ID="$(cat "$OUT/image-id.txt")"
[[ "$IMAGE_ID" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo 'Missing measured local image ID' >&2; exit 2; }
node scripts/prepare-fossen-runtime.mjs --candidate "$SPEC" --image-id "$IMAGE_ID" \
  --base-digest "$BASE_DIGEST" --dependency-sha "$WHEEL_SHA" --adapter-sha "$ADAPTER_SHA" --out-dir "$OUT"

# dockerArgs mounts only this checkout read-only, with no network or privileges.
chmod -R a+rX "$OUT/source/fossen-python-vehicle-simulator"
node scripts/repository-integration.mjs verify --spec "$OUT/runtime-manifest.json" \
  --out-dir "$OUT" --execute --acknowledge-third-party-risk
node scripts/repository-integration.mjs propose --spec "$OUT/runtime-manifest.json" --out-dir "$OUT"
node --input-type=module <<'JS'
import fs from 'node:fs';
const root=process.env.RUNNER_TEMP+'/fossen-evaluation/';
const v=JSON.parse(fs.readFileSync(root+'verification.json','utf8'));
const p=JSON.parse(fs.readFileSync(root+'runner-provenance.json','utf8'));
p.sourceTested=true;
p.softwareSmokeTestsPassed=v.cases.length>0&&v.cases.every(c=>c.passed);
p.marinePhysicsValidated=false;
p.securityCveReview='NOT_PERFORMED';
p.licenseCompatibility='PENDING';
p.independentApproval='PENDING';
p.toolRegistered=false;
p.vesselReleased=false;
fs.writeFileSync(root+'runner-provenance.json',JSON.stringify(p,null,2)+'\n');
if(!p.softwareSmokeTestsPassed)throw Error('GNC reference case failures');
JS
# Evidence receipt produced ONLY after all five real sandbox smoke cases pass.
# The GitHub run conclusion is checked independently by the register importer.
node --input-type=module <<'JS'
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=process.env.RUNNER_TEMP+'/fossen-evaluation/';
if(process.env.GITHUB_REPOSITORY!=='ravisinghrathode/usv-01-digital-lab'||
   !/^[0-9]+$/.test(process.env.GITHUB_RUN_ID||'')||
   !/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA||''))throw Error('Untrusted workflow identity');
const raw=fs.readFileSync(root+'verification.json');
const report=JSON.parse(raw);
if(report.status!=='REFERENCE_CASES_PASSED_UNVERIFIED_ENGINEERING'||
   !Array.isArray(report.cases)||report.cases.length!==5||
   report.cases.some(x=>x.passed!==true)||report.vesselRelease!==false||
   report.engineeringValidation!==false)throw Error('Upstream smoke evaluation is not successful');
const receipt={
 schemaVersion:1,recordId:'EXT-001',kind:'SANDBOX_EVALUATION',
 project:'USV-01',custodianAgent:'A26',
 softwareApproved:false,engineeringValidated:false,toolRegistered:false,vesselReleased:false,
 runId:process.env.GITHUB_RUN_ID,
 runUrl:'https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/'+process.env.GITHUB_RUN_ID,
 labHeadSha:process.env.GITHUB_SHA,
 sourceCommit:report.commit,sourceTree:report.tree,imageId:report.image,
 verificationSha256:'sha256:'+createHash('sha256').update(raw).digest('hex')
};
fs.writeFileSync(root+'external-software-usage-receipt.json',JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
console.log('Wrote research-only receipt; NOT accepted in register until GitHub run succeeds and review PR merges');
JS
echo 'Isolated GNC smoke testing finished; independent marine engineering approval still HOLD.'
