# Naval Studio X.2 — UI technical audit remediation and acceptance

## Scope and review authority

This feature branch extends the existing **PR #111** readability correction. It targets the nine source-backed defects from the UIAudit review: four P1 issues and five P2 issues. The repository retains the **single Studio X shell and all 24 modules**, 23 existing engineering destinations plus CAD Studio. No engineering records, agent authority, safety approvals, CAD verification claims, backend data schemas or server-side permission gates are deliberately altered. The user must personally approve the GitHub merge.

## Implementation milestones

| Order | Severity | Defect | Remediation | Automated evidence | Manual acceptance |
|---|---|---|---|---|---|
| 1 | P1 | Dark-on-dark text and 10–12 px labels | Scoped semantic tokens, WCAG AA text palette, Comfortable/Large text preference, root-class CSS fix | `tests/studioReadability.test.tsx`, `tests/studioAuditRemediation.test.tsx` | Computed contrast for all visible states in deployed app, 200% zoom |
| 2 | P1 | Search input lacks results | Top-bar control opens actual local in-session module + register search; sources are requirements, decisions, risks, simulations, verification, tests, BOM, knowledge notes | `searchLoadedRecords` ID/title/description tests; modal SSR | Confirm real record data updates and correct containing modules |
| 3 | P1 | Command modal keyboard semantics | Native modal `dialog.showModal()`, focus entry/return, Escape, combobox/listbox relationships, live result count, arrow and Enter selection | Modal markup and option controls tested | Keyboard and screen-reader acceptance in actual browser |
| 4 | P1 | Tight header/touch controls | 44px minimum dark-shell buttons and workspace tabs, header wrapping, compact mobile actions menu preserving new record, JSON backup, demo reset and context guide | TopBar SSR control preservation tests | 320/375/768/1280/1440px, 200% zoom and actual touch |
| 5 | P2 | Incomplete tab semantics | Roving focus, arrow/Home/End, `aria-controls`, paired panel IDs/`aria-labelledby` | `nextWorkTab` + rendered ARIA tests | Keyboard tab switch, close confirmation, unsaved local edits |
| 6 | P2 | Hidden tabs animate | Visibility-aware vessel rAF loop, reduced-motion observer and approximately 15fps throttling when visible | `shouldAnimateViewport` tests and source preservation checks | Verify hidden tabs stop CPU activity in browser profiler |
| 7 | P2 | OBJ canvas redraw per pointer event | Coalesced `requestAnimationFrame`, cached sampled triangle selection, ResizeObserver redraw only as needed, keyboard camera controls | Source invariants and keyboard markup | Profile OBJ representative sizes and group selection |
| 8 | P2 | Reduced-motion blanket suppression | Remove global `0.01ms` animation kill, stop only decorative pulse/spin and CAD autoplay; maintain visible interaction state | Source and CSS regression tests | OS reduced-motion preference with keyboard and zoom |
| 9 | P2 | Scattered light/dark tokens | One scoped set of Studio semantic CSS custom properties while preserving separate older light module palette | CSS token, same-element scoping and contrast checks | Review visually at all surfaces; long-term token migration remains |

## Search and security contract

The search contains **only records already loaded into the existing React session**. It does not query hidden server data or bypass authorizations. Each hit identifies its record ID, title, type, loaded status and containing module. Clicking a hit opens the module but does not scroll to an individual record; adding deep-linkable record focus requires changes to individual legacy views. The UI says this explicitly.

## Performance and state contract

Open engineering work tabs remain mounted to preserve local unsaved component state, but the illustrative 3D renderer pauses animation when not intersecting the viewport, when the document is hidden, or when reduced motion is requested. This branch cannot guarantee that every other legacy module's independent timers or network polls are suspended; full lifecycle ownership and background polling budgets are a subsequent performance workstream. The OBJ mesh uses a 2D render canvas, not authoritative engineering CAD; frame-coalescing does not certify large-model performance.

## CSS and accessibility contract

The original Tailwind slate mapping is purposely light-oriented and must remain intact for the 23 legacy modules. Studio dark regions use the `studio-dark` class for a scoped semantic palette and larger text sizes. CSS selectors now cover classes applied **directly on the themed element**, as well as descendants. The 44px control target is a minimum for dark-shell buttons. The accessible command palette uses the browser's native modal dialog instead of a faux overlay. Dark native control appearance is scoped to dark regions, not the old light views.

## Required acceptance before declaring the live UI ready

1. Pass TypeScript, deterministic test suite, production bundle and protected safety/governance gate on the PR head.
2. Use the **running** app in a browser and inspect CAD Studio, director briefing, compact navigation, all work tabs, global search, modal overlays, original detailed overview and each legacy engineering form. Confirm all 24 routes and nested workflow permissions.
3. Capture actual screenshots at minimum 320×700, 375×812, 768×1024, 1280×800 and 1440×900 in Comfortable/Large text, and at 200% zoom, including no horizontal page clipping except intentionally scrollable tab bars/data tables.
4. Run keyboard-only checks: open search with Ctrl/⌘+K; input typing, arrow navigation, Escape, focus restoration; workspace arrow/Home/End; accessible focus outline; accessible close controls; mesh camera via arrow and +/-; selection through product tree.
5. Measure actual computed contrast in default/hover/selected/disabled/error states (WCAG AA target for normal text 4.5:1). Constants-only contrast tests are not a substitute for rendered testing.
6. In a real browser, profile hidden CAD tab CPU and memory as more tabs accumulate; verify reduced-motion mode has no automatic vessel animation but interactive controls remain functional.
7. Confirm no changes to saved records, server permissions, engineering-approval authority or CAD evidence status.

## Deployment and limitations

The GitHub PR does **not** deploy to Google AI Studio. After the user merges it, fetch or synchronize the new `main` commit in the AI Studio project, then verify the running revision and acceptance steps above. Until live-browser tests are performed, status is **repository CI-ready, visual acceptance pending**, not “WCAG certified.” The UIAudit plugin's bundled detector was not runnable in this session; deterministic repository source checks and GitHub Actions provide evidence, but no score improvement should be asserted without the same scored audit rerun with browser access.

Remaining long-term work: full semantic token adoption across every old module, true record deep links, unified unsaved-change tracking, browser-based automated accessibility, performance budgets for every legacy engine and authoritative controlled CAD.
