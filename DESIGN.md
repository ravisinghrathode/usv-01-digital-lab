# Naval Studio — Clarity UI Design Contract

## Mode and identity

**Operate.** Professional, high-clarity naval engineering workbench. The visual concept is a **surveyor's drafting desk**: crisp neutral control surfaces and a dark, instrument-like product geometry workstage. Brand character comes from precision, restrained marine-teal accents and disciplined evidence labels, not glowing dashboards, gradients, artificial metrics or decorative motion.

Clarity is a replacement of the old inconsistent dark **shell**, not of the engineering modules, the digital-thread data or their authorization model. Each feature remains discoverable by ID and module registry entry.

## Direction contract

- **First viewport:** product name and current engineering module immediately legible; compact orientation and provenance strip; a full-width primary CAD workstage with a clear dark geometry viewer.
- **Visual hierarchy:** current task title → product and evidence context → workspace tabs → engineering artifact → contextual details. Muted metadata must remain readable in ambient daylight.
- **Signature interaction:** jump from any open work tab to any registered engineering module via search, with the selected product and working tabs preserved. Director queue links to real registers.
- **Responsive structure:** desktop sidebar with grouped module catalogue; compact 72–76 px rail on midsize; keyboard-managed drawer at mobile widths; all actions remain reachable.
- **Honest risk:** visual consistency of older module implementations is not guaranteed solely by a new shell. Preserve their light palette; migrate legacy components incrementally with real browser verification.

## Semantic palette

| Token | Colour | Usage |
|---|---|---|
| ns-canvas | `#eef3f5` | Main workspace ground |
| ns-paper | `#ffffff` | UI surfaces, cards and navigation |
| ns-ink | `#152d39` | Primary labels |
| ns-secondary | `#45606b` | Secondary text |
| ns-muted | `#526b76` | Metadata |
| ns-line | `#cedce1` | Borders |
| ns-accent | `#096b7e` | Primary action and current selection |
| ns-attention | `#825719` | Unverified/TBD evidence statuses |
| ns-success | `#175e50` | Affirmative UI status, not technical release |

All normal text roles target at least WCAG AA 4.5:1 on their supported light surfaces. Dark CAD/command controls retain a separate high-contrast palette within `studio-dark`. Never pair old Tailwind `bg-slate-950` (currently white) with light CAD text; use scoped overrides or explicit dark surfaces.

## Typography and interaction

System sans for interface labels; tabular numerals in record data; monospace reserved for configuration IDs, hashes and units. Normal UI text at least 13–15 px, with the existing Comfortable/Large user preference; no critical engineering information should rely solely on 10 px labels. Minimum interactive target 44px. Focus ring clearly visible. Module/toolbar/tabs accessible by keyboard. Motion conveys state; reduced-motion users get a static viewer.

## Source layout

`src/studio/clarity.css` contains the new shell's scoped design vocabulary. `StudioNavigation`, `TopBar`, `StudioContextStrip`, `StudioWorkspaceBar`, `DirectorBriefing` express the new workbench. CAD Studio is the dark workstage; other legacy views retain their current product functions.

## Release criteria

1. Typecheck, deterministic tests, bundle and protected engineering governance checks green.
2. Desktop + tablet + mobile screenshots at Comfortable/Large and 200% browser zoom; no hidden primary commands, unreadable text, or unsanctioned horizontal page scroll.
3. Native keyboard navigation, focus trapping/restoration in mobile drawer and command palette, CAD camera keys, form/dialog access.
4. Calculated and browser-computed text contrast for default/hover/selected/error/disabled states.
5. All 24 module routes, existing workflows, permissions and human approvals still accessible.
6. Validate actual Google AI Studio source revision separately from GitHub merge.

Until the running application has passed these checks, source-level implementation and CI success do not establish visual or accessibility certification.
