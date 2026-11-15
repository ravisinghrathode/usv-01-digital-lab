# Naval Design Studio / Naval AI Lab — Product Context

Engineering Sessions is the standard USV-01 investigation interface. The previous Naval Design Studio remains available at `/dockyard2.html`; the original Naval Studio editor remains available through the explicitly labelled governed route. Example investigation data is visibly synthetic, and scientific or engineering approval remains authority-controlled.

## Primary interface and protected legacy route

- `/` is Engineering Sessions: the standard investigation-based interface with Worktable, Design, Experiment, Decide and Notebook modes.
- `/legacy.html` is the original Naval Studio engineering editor, retained for controlled record changes, tools, agent execution and human approval gates. Its return link leads to Engineering Sessions.
- `/dockyard2.html` preserves the previous Naval Design Studio interface.
- Registered module links target `/legacy.html?module=<ID>`; previously shared `/?module=<ID>` links must still resolve safely.
- Standard-interface adoption does not certify physics, CAD, simulations, or governance approval. The Engineering Sessions investigation itself remains a synthetic demonstration; deployment to the separately hosted application is not implied by a GitHub merge.

## Users and goals

- **Engineering contributors:** inspect the selected product, navigate discipline registers, evaluate controlled inputs, create draft records subject to existing authentication and authorization.
- **Programme Director:** inspect actual engineering decisions, risks and evidence; retain formal human authority for approval and release.
- **Independent reviewers:** navigate traceability, tests, deviation records and provenance without accepting AI claims as verified engineering evidence.

## Non-negotiable product truths

- One maintained module registry contains **24 destinations**: 23 original modules plus CAD Studio.
- Existing requirements, simulations, risks, activities, agent workflows, records, authentication, approval gates and APIs must survive interface redesign unchanged.
- Browser-local OBJ inspection and the procedural vessel drawing do **not** establish authoritative, approved STEP/B-rep geometry or verified physics.
- Missing data remains TBD or explicitly unassigned; display no fabricated speed, weight, hydrostatics or verification conclusions.
- A UI-only selected configuration does not imply engineering release. Independent review and human approval remain separate gates.
- Restricted marine/client geometry should remain in approved access-controlled systems, not be committed to public GitHub.

## Intended operating environment

Desktop engineering workstation first, with usable tablet and mobile navigation, keyboard operation and zoom/reflow. The requested Google AI Studio app is a separate running deployment and must be synchronized and verified after GitHub merge; a PR is never proof of live deployment.
