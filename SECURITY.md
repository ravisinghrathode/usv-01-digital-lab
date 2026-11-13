# Security Policy

## Supported Releases

The USV-01 Digital Engineering Lab enforces continuous cryptographic audit trails and fail-closed governance gates on `main`.

| Release Branch | Supported | Security Maintenance |
|---|:---:|---|
| `main` | Yes | Active cryptographic gate checks, secret scanning, dependency audits |

## Reporting a Security Vulnerability

If you discover a security vulnerability or governance policy bypass in the USV-01 repository:

1. **Do Not Disclose Publicly:** Do not create a public GitHub issue for sensitive security vulnerabilities.
2. **Contact:** Report findings via private GitHub Advisory or contact the Project Lead / DevSecOps maintainer.
3. **Response Timeline:** Acknowledgment within 48 hours and an initial triage disposition.

## Automated DevSecOps Governance

All pull requests are automatically analyzed by:
- Dependency security audits (`bun audit --audit-level=high`)
- Static secret detection (`scripts/governance/secret-scanner.ts`)
- Cryptographic HMAC-SHA256 and Ed25519 baseline verification
- Network isolation barriers for remote CFD/FEA solvers
