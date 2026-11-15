# Naval Design Studio — Five-Skill UI/UX Toolchain

**Authorization:** Project Lead's explicit instruction on 2026-11-15 to install
five dedicated UI/UX skills for use in the naval-design frontend. This is
a **source-controlled developer skill pack**. It neither installs native
ChatGPT plugins nor changes the frozen engineering-agent roster of 31
procedural/research skills or the 26-agent runtime.

## Verified skill package installation

Location: `.agents/skills/<skill-id>/SKILL.md`. Installed by the verified
`Vendor five pinned UI/UX agent skills` GitHub Actions workflow, which
cloned official upstream repositories at immutable commits and copied complete
skill folders including shipped references, scripts and data. No package-install hooks or external setup scripts were run. The bundled
UI UX Pro Max search script was invoked with \`--help\` solely to confirm
that it starts in the controlled GitHub Actions environment.

| Skill | Publisher / original directory | Pinned commit | Purpose |
| --- | --- | --- | --- |
| `frontend-app-builder` | [OpenAI](https://github.com/openai/plugins/tree/main/plugins/build-web-apps/skills/frontend-app-builder) | `d420d13051bffe4543ed39e30fa46b87148e47dd` | Image-led concept spec, faithful implementation and real browser QA |
| `frontend-design` | [Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | `1780c5e5a552fd4d1c9d6a7b0cab26b0c2bef064` | Distinctive subject-specific direction, layout and typography |
| `frontend-ui-engineering` | [Addy Osmani](https://github.com/addyosmani/agent-skills/tree/main/skills/frontend-ui-engineering) | `39b723ceebf81474d0557c1fecd01eddab585563` | Accessible production components and responsive frontend engineering |
| `browser-testing-with-devtools` | [Addy Osmani](https://github.com/addyosmani/agent-skills/tree/main/skills/browser-testing-with-devtools) | `39b723ceebf81474d0557c1fecd01eddab585563` | Live browser inspection, screenshot/computed CSS/DOM/network/a11y verification |
| `ui-ux-pro-max` | [NextLevelBuilder](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/main/.claude/skills/ui-ux-pro-max) | `d643997c82e94742dd3bee43210b0198e8bbba3d` | Searchable design-system library and UX heuristics, Python tooling and datasets |

Original license files are retained in the copied skill folders where shipped.
Anthropic's `LICENSE.txt` is Apache-2.0; NextLevelBuilder and Addy Osmani's
MIT licenses are included; OpenAI's Build Web Apps plugin manifests an MIT
license (see `frontend-app-builder/SOURCE-PLUGIN-MANIFEST.json`).

## How to use

A repository-aware coding agent (Codex, Claude Code, Gemini CLI,
Antigravity or compatible SKILL.md host) should discover all five under
`.agents/skills` and consult each original `SKILL.md`. The required
workflow is defined in the project's `AGENTS.md`. Tool installation and
skill discovery capabilities vary by host; the presence of source files
does not prove that a particular model has loaded or executed a skill.

In ordinary ChatGPT conversations, these **do not automatically appear in the
global installed-skill catalogue**. Use GitHub file access to read the exact
project copies when discussing or reviewing the UI. Do not report them as a
native ChatGPT installation.

### UI UX Pro Max design intelligence

Python 3 is the only prerequisite for the shipped search tool; its assets
are included in `.agents/skills/ui-ux-pro-max/data`. For example:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py --help
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "engineering workbench naval architecture" --domain style
```

Use the script's current help output for supported flags; never substitute
invented design-system search results.

### Browser testing prerequisite

The `browser-testing-with-devtools` skill includes **instructions only**.
Its procedure requires an operational Chrome DevTools MCP server or an
equivalent trusted browser test environment. No Chrome profile, extra MCP
provider, Playwright runtime or local user process was installed by this
skill-pack PR. This deliberately respects the project's authorization
boundary: do not attach to a user's personal authenticated browser or
transmit secrets.

The upstream skill recommends an isolated server command in compatible
MCP-enabled environments:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated"]
    }
  }
}
```

This is documentation, not a connected or installed MCP service. The
environment owner must authorize and verify the relevant browser tool before
claiming live visual acceptance.

## Mandatory Naval Design Studio acceptance

1. Produce the desktop CAD/product canvas and all five workflow concepts
   with accurate requirements and statuses. Approve a **single design system**
   and make it the source of truth before code.
2. Implement a coherent, typography-disciplined, responsive component
   library: app shell, navigation, CAD viewport, tree, inspector, evidence
   dock, modal states and tables. Keep the original guarded workbench
   accessible while migration proceeds.
3. Check running browser screenshots at 1440x900, 1280x800, 768px,
   390px and 320px; test 200% zoom and the user's larger-text mode.
4. Verify keyboard-only use, modal focus return, all module handoffs,
   contrast computed against real surfaces, truncation, error/empty states,
   accessible input labels, and the selected component's actual authority.
5. Compare rendered screenshots to approved concepts and document
   discrepancies before review. No '10/10' or sign-off claims without
   matching screenshots and direct inspection.
6. Run all TypeScript/deterministic tests, production builds and existing
   engineering/human approval governance. No UI skill grants engineering
   release authority.

**Supply-chain maintenance:** update the pinned upstream SHAs only after
source/license review. This feature branch is reviewed under the established
protected software governance; no engineering release, customer data or
hardware-control privileges are introduced.
