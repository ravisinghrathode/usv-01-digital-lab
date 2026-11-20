# PR-03 container secret canary verification

Status: **proposed CI gate; production acceptance remains pending**.

This follow-up converts the existing static `.dockerignore` assertions into a
real Docker image scan. The Python script creates ephemeral synthetic secrets
in the build checkout, builds both stages, saves both images and scans every
exported layer for exact canary bytes. It does not include any actual private
key, credential, token or secret.

CI: `.github/workflows/docker-secret-image-canary.yml`, triggered on relevant
Docker/security file changes, plus manual dispatch.

Unresolved acceptance:
- Verify cold-start staff enrollment and restart persistence in an isolated
  runtime deployment without leaking a bootstrap secret
- Verify secret-store backup/restoration and key rotation
- Independently verify all real deployment credentials are absent from the
  image, logs, remote cache and exported artifacts
- Maintain fail-closed engineering evidence and release controls

A passing synthetic-image test does not constitute operational deployment
approval, staff-identity proofing or completion of PR-03.
