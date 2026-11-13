# Safety and engineering governance

- This Digital Lab is a documentation, analysis-management and verification workspace; it is not a vessel command interface.
- Do not implement live control of propulsion, steering, actuators or other vessel equipment.
- Do not implement weapon targeting or combat-payload functionality.
- AI outputs are proposals until reviewed and approved by an authorized engineer.
- Keep approved revisions immutable; changes create a new revision with traceable rationale.
- Record assumptions, units, coordinate frames, data provenance and solver versions.
- Safety-critical analysis requires independent review and appropriate physical verification.
- Unknown vessel particulars and acceptance criteria remain `TBD`.
## Two distinct approval gates

**Gate L: restricted laboratory commissioning.** An operator can opt in to a
research-only, non-operational ChatGPT/Codex subscription pilot without first
approving unknown vessel parameters or a vessel engineering baseline. Research
tasks may plan, calculate, compare, critique and assemble traceable candidate
design evidence; a successful AI invocation is never a design approval.

**Gate E: evidence-based vessel engineering release.** A vessel design revision
requires independently reviewed engineering evidence and explicit Engineering
Director signoff before it can be accepted or released. Safety-critical
decisions, missing measurements and unverified physics cannot be promoted to
approved facts by any AI agent.

**Source-code protection remains independent of both gates.** The Stage A
path-based classifier assigns routine, restricted-lab software, protected
software/security, or safety-critical vessel engineering routes. Restricted
lab research changes use protected CI without a vessel ECR. Protected
governance/authentication/execution changes additionally require an independent
GitHub peer approval bound to the exact head and deterministic security review.
Only changes affecting vessel engineering evidence, approved parameters,
release authority or naval safety acceptance require a Director Ed25519 ECR.
Stage E validates the correct route and source integrity; it never substitutes
for authorization. No agent may approve its own code or vessel design.

See [Laboratory Commissioning Protocol](LAB_COMMISSIONING_PROTOCOL.md) for
machine-enforced constraints, authenticated live acceptance and evidence rules.
