# Live Commissioning Evidence and Reproducible Inputs — 2026-11-13

## Observed Google Drive connectivity (partial INT-02)

Authenticated connector operation, recorded 2026-11-12 UTC / 2026-11-13 IST:
- Found the named **USV-01** project folder using the connected paid Google Drive account.
- Found its **02_Naval_Architecture** subfolder.
- Created one new, non-sensitive `text/plain` probe in the project's root.
- Retrieved probe metadata confirming expected parent folder and byte size.
- Downloaded the test file successfully using Drive's download endpoint.
- Queried root-folder permissions: the response showed one `user` permission with `owner` role; this is a point-in-time observation, not an independent access-control penetration test.
- Trashed the temporary probe after the check.
- The Naval Architecture subfolder returned zero entries in a normal list-files query; no usable approved offsets or stability reference data were identified there during this check. This does not prove they do not exist elsewhere.

**INT-02 remains incomplete:** a full authorized content roundtrip, least-privilege role/revocation testing, synchronization-conflict test and durable signed evidence report are still required. This observation is *not* independent engineering certification. Connector credentials, personal email addresses, private file contents and temporary signed download URLs are not stored in this repository.

## Supply acceptance evidence without editing source

The campaign CLI now accepts optional externally maintained JSON arrays:

```bash
npm run acceptance:campaign -- --baseline-sha YOUR_EXACT_40_HEX_SHA \
  --evidence-file controlled-evidence.json \
  --benchmark-file controlled-benchmarks.json \
  --out-dir governance/reports
```

Each object in `controlled-evidence.json` uses:
```json
{
  "requirementId": "HYD-01",
  "baselineSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "referenceUri": "https://example.org/controlled/report",
  "referenceSha256": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "sourceType": "PHYSICAL_TEST",
  "reviewedBy": "Independent reviewer identity",
  "independentlyVerified": false,
  "attestationVerified": false
}
```

Each object in `controlled-benchmarks.json` uses:
```json
{
  "id": "EXAMPLE-ONLY",
  "quantity": "displacement",
  "referenceValue": 6,
  "observedValue": 6.01,
  "absoluteTolerance": 0.02,
  "relativeTolerance": 0.001,
  "unit": "tonnes",
  "sourceReference": "approved-data-revision"
}
```

**Examples are illustrative and MUST NOT be used for naval certification.** JSON schema validation and numerical comparison only show whether the inputs are well formed and numerically consistent; they do not verify the provenance of a reviewer, external laboratory, deployed integration or hardware test. The acceptance campaign remains fail-closed, including if submitted evidence sets `independentlyVerified` or `attestationVerified` to true.
