# Naval Studio — Product Context

Naval Studio is the USV-01 marine engineering development workbench. Users work on vessel geometry, requirements, technical analysis, simulation, procurement, knowledge, risk, traceability, AI-agent collaboration and independent verification. It is an **engineering operating interface**, not a marketing dashboard.

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
