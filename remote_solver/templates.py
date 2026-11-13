"""Operator-approved deterministic solver template materialization.

This closes the *staging* gap without allowing an agent to upload arbitrary
OpenFOAM/CalculiX files. The operator provisions a catalog that binds:
- template ID,
- exact generator script SHA-256,
- solver family and fixed mesh path,
- bounded numeric parameters,
- source-identified quality plan.

The request can only choose the template and values inside those bounds.
The generator runs without network access under the same resource ceilings,
then the service creates an immutable deterministic ZIP and solver manifest.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Callable

from worker import (
    _limit_resources, _wrapped_argv, resource_policy, sha256,
)

ID = re.compile(r"^[A-Za-z0-9_-]{3,64}$")
SHA = re.compile(r"^sha256:[0-9a-f]{64}$")
GIT_SHA = re.compile(r"^[0-9a-f]{40}$")
MAX_GENERATED_BYTES = 512 * 1024 * 1024
MAX_GENERATED_FILES = 2000


def _canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def load_catalog(path: Path) -> dict:
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 2 * 1024 * 1024:
        raise ValueError("Template catalog missing or too large")
    raw=json.loads(path.read_text())
    if not isinstance(raw,dict) or not isinstance(raw.get("templates"),list):
        raise ValueError("Malformed template catalog")
    seen=set()
    normalized={}
    for item in raw["templates"]:
        if not isinstance(item,dict) or not ID.fullmatch(str(item.get("id",""))):
            raise ValueError("Invalid template ID")
        tid=item["id"]
        if tid in seen:
            raise ValueError("Duplicate template ID")
        seen.add(tid)
        if item.get("family") not in ("OPENFOAM_CFD","CALCULIX_FEA"):
            raise ValueError("Unsupported template family")
        generator=Path(str(item.get("generator","")))
        if not generator.is_absolute() or generator.is_symlink() or not generator.is_file():
            raise ValueError("Template generator must be an existing absolute regular file")
        digest=str(item.get("generatorSha256",""))
        if not SHA.fullmatch(digest) or sha256(generator.read_bytes())!=digest:
            raise ValueError("Template generator digest mismatch")
        mesh_path=str(item.get("meshPath",""))
        if not mesh_path or mesh_path.startswith("/") or ".." in Path(mesh_path).parts:
            raise ValueError("Unsafe template mesh path")
        bounds=item.get("parameterBounds")
        if not isinstance(bounds,dict) or not bounds:
            raise ValueError("Template requires bounded numeric parameters")
        for key,b in bounds.items():
            if not isinstance(key,str) or not key or not isinstance(b,dict):
                raise ValueError("Malformed parameter bound")
            lo=b.get("min"); hi=b.get("max")
            if type(lo) not in (int,float) or type(hi) not in (int,float) or not lo < hi:
                raise ValueError("Invalid numeric parameter range")
        qp=item.get("qualityPlan")
        if not isinstance(qp,dict) or not str(qp.get("sourceReference","")).strip():
            raise ValueError("Template quality plan must identify its source")
        normalized[tid]=item
    return normalized


def validate_template_request(request: dict, templates: dict) -> tuple[dict,dict]:
    if not isinstance(request,dict) or not ID.fullmatch(str(request.get("jobRef",""))):
        raise ValueError("Invalid template job reference")
    if not GIT_SHA.fullmatch(str(request.get("sourceCommit",""))):
        raise ValueError("Exact source SHA required")
    tid=str(request.get("templateId",""))
    template=templates.get(tid)
    if not template:
        raise ValueError("Template is not operator-approved")
    if request.get("templateDigest") != template["generatorSha256"]:
        raise ValueError("Template digest is not the approved generator digest")
    params=request.get("parameters")
    if not isinstance(params,dict) or set(params)!=set(template["parameterBounds"]):
        raise ValueError("Template parameters must exactly match the approved schema")
    clean={}
    for key,bound in template["parameterBounds"].items():
        value=params.get(key)
        if type(value) not in (int,float):
            raise ValueError("Template parameter must be numeric")
        value=float(value)
        if value < float(bound["min"]) or value > float(bound["max"]):
            raise ValueError("Template parameter outside approved envelope: "+key)
        clean[key]=value
    return template,clean


def _safe_generated_tree(root: Path) -> None:
    count=0
    total=0
    for item in root.rglob("*"):
        if item.is_symlink():
            raise ValueError("Generated case contains a symlink")
        if item.is_file():
            count+=1
            total+=item.stat().st_size
            mode=stat.S_IFMT(item.stat().st_mode)
            if mode != stat.S_IFREG:
                raise ValueError("Generated case contains non-regular file")
            if count>MAX_GENERATED_FILES or total>MAX_GENERATED_BYTES:
                raise ValueError("Generated case exceeds quota")


def _deterministic_zip(case: Path, target: Path) -> bytes:
    files=sorted(p for p in case.rglob("*") if p.is_file())
    with zipfile.ZipFile(target,"x",compression=zipfile.ZIP_DEFLATED) as z:
        for file in files:
            rel=file.relative_to(case).as_posix()
            info=zipfile.ZipInfo(rel,date_time=(1980,1,1,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=(0o600 & 0xFFFF)<<16
            z.writestr(info,file.read_bytes())
    return target.read_bytes()


def materialize_template_job(
    request: dict,
    catalog_path: Path,
    stage: Path,
    work: Path,
    runner: Callable[..., subprocess.CompletedProcess]=subprocess.run,
    isolation_mode: str | None=None,
) -> tuple[dict,set[str]]:
    templates=load_catalog(catalog_path)
    template,params=validate_template_request(request,templates)
    isolation=isolation_mode or os.environ.get("USV_SOLVER_ISOLATION_MODE","UNSHARE_USER_NET")
    work.mkdir(parents=True,exist_ok=True,mode=0o700)
    stage.mkdir(parents=True,exist_ok=True,mode=0o700)
    with tempfile.TemporaryDirectory(prefix="usvtemplate_",dir=work) as tmp:
        root=Path(tmp)
        case=root/"case"
        case.mkdir(mode=0o700)
        param_file=root/"parameters.json"
        param_file.write_bytes(_canonical_json(params))
        generator=Path(template["generator"])
        argv=[sys.executable,str(generator),"--output-dir",str(case),"--parameters",str(param_file)]
        proc=runner(
            _wrapped_argv(argv,isolation),
            cwd=str(root),capture_output=True,text=True,check=False,
            timeout=resource_policy()["wallTimeoutSeconds"],preexec_fn=_limit_resources,
            env={"PATH":os.environ.get("USV_SOLVER_BIN_PATH","/usr/bin:/bin"),
                 "HOME":str(root),"LC_ALL":"C"}
        )
        if proc.returncode!=0:
            raise RuntimeError("Approved template generator failed")
        _safe_generated_tree(case)
        mesh=case/template["meshPath"]
        if not mesh.is_file() or mesh.is_symlink():
            raise ValueError("Template did not generate the approved mesh/model path")
        archive=root/"case.zip"
        payload=_deterministic_zip(case,archive)
        archive_digest=sha256(payload)
        staged=stage/(archive_digest[7:]+".zip")
        if staged.exists():
            if sha256(staged.read_bytes())!=archive_digest:
                raise ValueError("Existing staged template case hash conflict")
        else:
            shutil.copyfile(archive,staged)
            os.chmod(staged,0o600)
        quality=json.loads(json.dumps(template["qualityPlan"]))
        materialization={
            "templateId":template["id"],
            "templateDigest":template["generatorSha256"],
            "parameters":params,
            "parameterDigest":sha256(_canonical_json(params)),
            "generatorStdoutSha256":sha256((proc.stdout or "").encode()),
            "generatorStderrSha256":sha256((proc.stderr or "").encode()),
        }
        manifest_seed={
            "jobRef":request["jobRef"],
            "sourceCommit":request["sourceCommit"],
            "family":template["family"],
            "inputArtifactUri":"https://solver-template.local/"+request["jobRef"]+".zip",
            "inputArtifactSha256":archive_digest,
            "meshArtifactSha256":sha256(mesh.read_bytes()),
            "qualityPlan":quality,
            "templateMaterialization":materialization,
        }
        manifest_digest=sha256(_canonical_json(manifest_seed))
        manifest={**manifest_seed,"manifestSha256":manifest_digest,
                  "releaseAuthorized":False,"engineeringValidated":False}
        return manifest,{archive_digest}
