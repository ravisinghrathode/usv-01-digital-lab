# Container credentials: controlled provisioning

This deployment is **not ready for authenticated use** merely because the
health endpoint responds. Authentication is fail-closed until the operator
supplies a fresh bootstrap secret and provisions the Director credential.

## Security boundary

- The image build context excludes .secrets, SSH keys, private signing keys,
  cloud service-account JSON and local package credentials.
- Runtime password verifiers are stored in a separate named Docker volume,
  mounted at `/app/.secrets`, with the container configured read-only otherwise.
- No staff passphrase, bootstrap secret or signing key belongs in the repository,
  Dockerfile, image layer or checked-in compose file.
- Restoring the data volume alone does not restore staff credentials. Back up
  each volume separately under organization-controlled encryption and access.
- A successful health response does **not** prove credential enrollment,
  external evidence anchoring, engineering qualification or baseline readiness.

## Initial setup (explicitly authorized administrator)

Provision a cryptographically random **32+ character** `INITIAL_PROVISION_SECRET`
at runtime, from the operator's secret manager or a temporary secret delivery
mechanism. The application requires this before accepting first-time
`/api/auth/provision-initial` enrollment. Do not echo or record this secret in
shell history, source code or CI logs; prefer a runtime secret injection
mechanism. Enroll only an identity on the server-owned authorized staff list,
using a distinct 12+ character passphrase. Once the first credential exists,
further enrollment requires an authenticated Engineering Director session.
Remove the bootstrap secret from the running environment after enrollment and
restart as needed.

This PR deliberately **does not** generate a shared default administrator
password, auto-create a Director credential, or bypass first-time identity
proofing. Those would be security regressions.

## Production verification required

1. Build with a synthetic secret fixture present in the working tree, inspect
   the resulting Docker image/layers, and prove fixture bytes are absent.
2. Run `docker compose config --quiet` and build the production stage.
3. Provision a test identity using an ephemeral setup secret, restart the
   container, and confirm the credential survives in the named volume.
4. Verify that the root filesystem is read-only and that unauthorized initial
   enrollment fails when the secret is absent.
5. Validate per-volume encrypted backup and controlled recovery procedures.

The repository's static tests do not replace these runtime security checks.
