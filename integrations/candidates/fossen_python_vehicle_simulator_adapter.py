#!/usr/bin/env python3
"""Research-only JSON bridge to a pinned Fossen PythonVehicleSimulator checkout.

Run ONLY inside the separately approved, network-disabled, disposable evaluation
container. The upstream source is mounted read-only at /candidate. This module
does not install dependencies, access vehicle hardware, or approve results.

Supported operations are basic mathematical/GNC primitives for initial smoke
testing. They do NOT demonstrate numerical accuracy of a ship-motion model.
"""
import json
import math
import sys

SOURCE_ROOT = "/candidate/src"
MAX_REQUEST_BYTES = 8192
ALLOWED = {"ssa", "sat", "rzyx", "smtrx"}


class AdapterError(ValueError):
    pass


def finite_number(value, name):
    if type(value) not in (int, float):
        raise AdapterError(f"{name} must be a numeric JSON value")
    number = float(value)
    if not math.isfinite(number) or abs(number) > 1e6:
        raise AdapterError(f"{name} out of safe evaluation range")
    return number


def scalar_vector(value, name, n=3):
    if not isinstance(value, list) or len(value) != n:
        raise AdapterError(f"{name} must contain {n} values")
    return [finite_number(x, f"{name}[{i}]") for i, x in enumerate(value)]


def dispatch(request, gnc):
    """Return flat numerical values for the existing USV-01 comparison engine."""
    if not isinstance(request, dict) or request.get("operation") not in ALLOWED:
        raise AdapterError("unsupported or missing operation")
    operation = request["operation"]
    if operation == "ssa":
        angle = finite_number(request.get("angleRad"), "angleRad")
        return {"value": float(gnc.ssa(angle))}
    if operation == "sat":
        value = finite_number(request.get("value"), "value")
        lower = finite_number(request.get("minimum"), "minimum")
        upper = finite_number(request.get("maximum"), "maximum")
        if lower > upper:
            raise AdapterError("minimum must be <= maximum")
        return {"value": float(gnc.sat(value, lower, upper))}
    if operation == "rzyx":
        phi = finite_number(request.get("rollRad"), "rollRad")
        theta = finite_number(request.get("pitchRad"), "pitchRad")
        psi = finite_number(request.get("yawRad"), "yawRad")
        rotation = gnc.Rzyx(phi, theta, psi)
        return {f"r{i}{j}": finite_number(float(rotation[i][j]), "rotation") for i in range(3) for j in range(3)}
    vector = scalar_vector(request.get("vector"), "vector")
    skew = gnc.Smtrx(vector)
    return {f"s{i}{j}": finite_number(float(skew[i][j]), "skew") for i in range(3) for j in range(3)}


def main():
    raw = sys.stdin.buffer.readline(MAX_REQUEST_BYTES + 1)
    if len(raw) > MAX_REQUEST_BYTES or not raw.endswith(b"\n"):
        raise AdapterError("request too large or missing newline")
    request = json.loads(raw)
    # Import upstream code only after validating the input, inside the isolated
    # process. Do not grant the candidate any runtime network or file writes.
    sys.path.insert(0, SOURCE_ROOT)
    from python_vehicle_simulator.lib import gnc
    result = dispatch(request, gnc)
    print(json.dumps(result, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except (AdapterError, ValueError, TypeError, ImportError, KeyError, IndexError) as exc:
        print(f"candidate evaluation refused: {type(exc).__name__}: {exc}", file=sys.stderr)
        raise SystemExit(2)
