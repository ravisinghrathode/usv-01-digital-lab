# Naval Studio Clarity — delivery and acceptance

## Delivered

A new light control-shell and Director's decision desk, preserving the dark product geometry workstage and the complete existing 24-module engineering application. Implemented through the installed **Impeccable** UI design skill guidance (Operate, new-work, craft floor, audit). The specifically named frontend-app-builder/frontend-design/frontend-ui-engineering/browser-testing-with-devtools/ui-ux-pro-max skills were **not listed as installed**; do not state they were run.

## Manual browser acceptance

- Compare baseline and Clarity on desktop 1440×900 and 1280×800, tablet 768×1024, mobile 390×844 and 320×700. Repeat Comfortable and Large text, plus 200% zoom. Take screenshots and inspect clipping or stale styling.
- Open navigation at mobile width: focus enters drawer, Tab stays within its visible controls, Escape closes it and returns focus to the opener. Verify backdrop close, search, group expansion, pin controls and every module.
- Exercise the app's header search (`⌘K`/`Ctrl+K`), loaded record results, modal focus management, New Record auth gate, Verify USV-01, assistant, backup, demo reset and project-context action.
- Confirm persisted work tabs retain user input across switches; closing may ask conservatively about unsaved changes. The tab mechanism does not yet offer record-aware dirty-state detection.
- Check keyboard and touch 3D navigation. Default illustrative vessel: arrow keys rotate, +/− zoom, Home resets. Imported OBJ: existing orbit/zoom/group selection. Compare controls remain explicitly not engineering-certified.
- Check every 24 registered module routes and their nested engineering workflows; no role, server API, verification state, geometry revision or approval authority must change due to the shell.
- Inspect font contrast across the new light shell and dark CAD workstage. Critical text target ≥4.5:1, and active/focus states must be visible without relying only on colour.
- Check render-image failure: primary artwork → one fallback → stable unavailable state. Hidden browser tab CAD animation should remain visibility-aware; profile CPU/memory when many work tabs are open.

## Deployment boundary

The requested Google AI Studio application must explicitly synchronize the reviewed GitHub `main` revision after merge. Its running build SHA and visual state cannot be established from GitHub workflow results alone. **No merge or deployment should be performed by this feature branch.**

## Limitations

This redesign does not produce a STEP/B-rep CAD authoring engine, authoritative CAD storage, validated hydrodynamics, solver-to-geometry dependency graphs, new engineering approval policy or blanket suspension of all legacy background processes. Those are separately governed engineering tasks. No restricted client geometry has been added to this branch.
