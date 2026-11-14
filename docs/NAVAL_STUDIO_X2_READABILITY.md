# Naval Studio X.2 — Readability and contrast correction

## Root cause

The repository's `tailwind.config.js` deliberately maps `slate-950` to white surfaces and `slate-300` to `#334155` for the older **light** engineering pages. Studio X.2 introduced **dark** navy panels yet reused labels like `text-slate-300`. Those labels compiled to dark-on-dark text. Contrast of `#334155` on `#101b2a` is approximately **1.67:1**, below WCAG AA's 4.5:1 target for normal text.

## Remediation

- Preserve the older module colours to avoid a broad regression. Dark Studio-only regions now declare `studio-dark`, and `src/index.css` scopes their text and panel token fixes to `.studio-x .studio-dark`. This avoids changing the historical palette globally.
- Dark-shell foreground tokens against `#101b2a`:
  - Primary `#f1f5f9`: approx 15.81:1
  - Secondary `#cbd5e1`: approx 11.67:1
  - Muted `#a8b9cf`: approx 8.67:1
  - Accent `#67e8f9`: approx 11.95:1
- Raise default type sizes: 9–10 px micro labels → 12 px, 11 px labels → 13 px, `text-xs` → 14 px, `text-sm` → 15 px.
- Add an accessible **Text: Comfortable / Text: Large** toggle in the workspace bar; Large increases micro/labels/xs/sm to 14/15/16/17 px. The preference is stored in browser `localStorage` and has a safe Comfortable default if storage is unavailable.
- Give dark-shell buttons 34 px minimum height, improve scrollbars and increase header flexibility for zoom and larger text.
- Preserve visible keyboard focus styling and reduced-motion support.

## Acceptance

Automated tests (`tests/studioReadability.test.tsx`) verify WCAG AA foreground ratios, preference fallback, renderable accessible controls, dark-only scoping, and all 24 original module registrations.

Before merging, verify browser screenshots at desktop (1280×800, 1440×900), tablet and mobile widths at Comfortable and Large; check CAD tree, inspector, Director briefing, programme dashboard, global command search, navigation, header, forms and dialog contrast; test keyboard focus and 200% browser zoom. Tests cannot substitute for visual inspection of the running Google AI Studio app.

The source fix has no API, agent, data-schema, approval-gate, or CAD-provenance effect. It does not automatically redeploy the running Google AI Studio preview. User review/merge remains required.
