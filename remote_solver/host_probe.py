"""Fail-closed host preflight for the restricted solver service.

Run this as the *same service account* and environment that will execute solver
jobs. It does not certify a host; it proves that configured process ceilings,
filesystem permissions, solver binaries and the required no-network namespace
are actually usable before accepting work.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import subprocess
import tempfile
from pathlib import Path

from worker import resource_policy

def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--require-openfoam",action="store_true")
    parser.add_argument("--require-calculix",action="store_true")
    parser.add_argument("--require-network-isolation",action="store_true")
    args=parser.parse_args()

    checks: dict[str,object] = {
        "platform": platform.platform(),
        "linux": platform.system()=="Linux",
        "resourcePolicy": resource_policy(),
        "serviceUid": os.geteuid() if hasattr(os,"geteuid") else None,
        "networkIsolation": {"required": args.require_network_isolation, "passed": False},
        "binaries": {},
        "filesystem": {},
        "engineeringReleaseAuthorized": False,
    }
    failures: list[str]=[]
    if not checks["linux"]:
        failures.append("Linux host required")

    required={"unshare":True}
    openfoam_wrapper=os.environ.get("USV_OPENFOAM_WRAPPER","").strip()
    if args.require_openfoam:
        if openfoam_wrapper:
            wrapper_path=Path(openfoam_wrapper)
            checks["binaries"]["openfoamWrapper"]=str(wrapper_path)
            if not wrapper_path.is_absolute() or not wrapper_path.is_file():
                failures.append("Configured OpenFOAM wrapper is missing")
        else:
            required.update({"simpleFoam":True,"checkMesh":True})
    if args.require_calculix:
        required["ccx"]=True
    for binary in required:
        located=shutil.which(binary)
        checks["binaries"][binary]=located
        if not located:
            failures.append("Missing binary: "+binary)

    if args.require_openfoam and openfoam_wrapper and Path(openfoam_wrapper).is_file():
        command=[openfoam_wrapper,"simpleFoam","-help"]
        if args.require_network_isolation:
            command=["unshare","--user","--map-root-user","--net","--",*command]
        p=subprocess.run(command,capture_output=True,text=True,check=False,timeout=20)
        banner=(p.stdout or "")+"\n"+(p.stderr or "")
        checks["openfoamExecutionProbe"]={
            "returnCode":p.returncode,
            "banner":banner[:800]
        }
        if "OpenFOAM" not in banner:
            failures.append("Versioned OpenFOAM wrapper did not execute simpleFoam help")

    if args.require_network_isolation and shutil.which("unshare"):
        p=subprocess.run(["unshare","--user","--map-root-user","--net","--","sh","-c","test -r /proc/self/ns/net"],
                         capture_output=True,text=True,check=False,timeout=10)
        checks["networkIsolation"]={
            "required":True,"passed":p.returncode==0,
            "returnCode":p.returncode,
            "stderr":(p.stderr or "")[:500]
        }
        if p.returncode!=0:
            failures.append("unprivileged user+network namespace failed for this service account")
    elif not args.require_network_isolation:
        checks["networkIsolation"]={"required":False,"passed":None}

    for env_name,default in (
        ("USV_SOLVER_STAGING_DIR","/var/lib/usv-solver/staged"),
        ("USV_SOLVER_WORK_DIR","/var/lib/usv-solver/work"),
        ("USV_SOLVER_ARTIFACT_DIR","/var/lib/usv-solver/artifacts"),
    ):
        path=Path(os.environ.get(env_name,default))
        record={"path":str(path),"exists":path.exists(),"writable":False}
        try:
            path.mkdir(parents=True,exist_ok=True,mode=0o700)
            with tempfile.NamedTemporaryFile(dir=path,delete=True):
                pass
            record["writable"]=True
        except OSError as exc:
            record["error"]=str(exc)[:500]
            failures.append(env_name+" is not writable")
        checks["filesystem"][env_name]=record

    checks["failures"]=failures
    checks["hostReadyForRestrictedCompute"]=not failures
    print(json.dumps(checks,indent=2,sort_keys=True))
    return 0 if not failures else 2

if __name__=="__main__":
    raise SystemExit(main())
