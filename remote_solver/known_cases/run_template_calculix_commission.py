"""Materialize an approved bounded template, then run real CalculiX through worker."""
import argparse,json
from pathlib import Path

from templates import materialize_template_job
from worker import run_staged_case,sha256

p=argparse.ArgumentParser()
p.add_argument("--source-sha",required=True)
p.add_argument("--root",required=True)
p.add_argument("--isolation-mode",default="UNSHARE_NET_PRIVILEGED")
a=p.parse_args()
root=Path(a.root).resolve()
stage=root/"staged"; work=root/"work"; artifacts=root/"artifacts"
for d in (stage,work,artifacts):d.mkdir(parents=True,exist_ok=True,mode=0o700)

generator=(Path(__file__).resolve().parents[1]/"template_generators"/"calculix_axial_bar.py").resolve()
catalog=root/"template-catalog.json"
catalog.write_text(json.dumps({"templates":[{
    "id":"CALCULIX_AXIAL_BAR_V1",
    "family":"CALCULIX_FEA",
    "generator":str(generator),
    "generatorSha256":sha256(generator.read_bytes()),
    "meshPath":"model.inp",
    "parameterBounds":{
        "lengthMm":{"min":5,"max":20},
        "loadN":{"min":50,"max":200},
        "youngsModulusMpa":{"min":100000,"max":250000}
    },
    "qualityPlan":{
        "sourceReference":"ANALYTICAL_AXIAL_BAR_COMMISSIONING_ONLY_NOT_VESSEL_ACCEPTANCE",
        "residualThreshold":0.01,
        "gridUncertaintyMaxFraction":0.05,
        "maxMeshSkewness":4,
        "maxNonOrthogonalityDeg":70,
        "maxElementAspectRatio":5,
        "minScaledJacobian":0.2
    }
}]}))
request={
    "jobRef":"CI_TEMPLATE_CALCULIX_BAR",
    "sourceCommit":a.source_sha,
    "templateId":"CALCULIX_AXIAL_BAR_V1",
    "templateDigest":sha256(generator.read_bytes()),
    "parameters":{"lengthMm":10,"loadN":100,"youngsModulusMpa":210000}
}
manifest,approved=materialize_template_job(
    request,catalog,stage,work,isolation_mode=a.isolation_mode)
# The worker ignores template-only metadata; retain it in the commissioning
# report while executing the ordinary fixed manifest fields.
template_meta=manifest.pop("templateMaterialization")
base={k:manifest[k] for k in (
    "jobRef","sourceCommit","family","inputArtifactUri","inputArtifactSha256",
    "meshArtifactSha256","qualityPlan")}
import hashlib
manifest["manifestSha256"]="sha256:"+hashlib.sha256(
    json.dumps(base,separators=(",",":")).encode()).hexdigest()
result=run_staged_case(
    manifest,stage,work,approved,artifact_root=artifacts,
    isolation_mode=a.isolation_mode)
result["templateMaterialization"]=template_meta
(root/"result.json").write_text(json.dumps(result,indent=2)+"\n")
print(root/"result.json")
