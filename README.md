# USV-01 Digital Engineering Lab

Private engineering workspace for the USV-01 unmanned surface vessel project.

## Repository status

This first repository commit establishes the shared project context and AI Studio build specification. The complete React MVP and Obsidian vault package are available in the ChatGPT conversation as `USV-01_Digital_Engineering_Lab_MVP.zip`; they have **not** yet been committed to this repository. Add/extract that package into the repository before treating this repository as the live application source.

## Project boundaries

- GitHub: version-controlled source code, shared project context and schemas.
- Google AI Studio: Gemini-powered application development.
- ChatGPT: engineering analysis, research, independent design review and verification planning.
- Obsidian: linked engineering knowledge graph and Markdown notes.
- Google Drive: controlled documents, drawings, reports and large files.
- Linear: issues, milestones and workstream execution.

## Build

The application bundle is a Vite + React application. Once its files are present at the repository root:

```bash
npm install
npm run dev
npm run build
```

Import this repository into Google AI Studio Build mode and follow `AI_STUDIO_BUILD_PROMPT.md`. Use two-way GitHub synchronisation as the shared code workflow. This synchronises repository files, not private assistant chat histories.

## Engineering governance

Use `USV01_PROJECT_CONTEXT.md` as the common baseline. Treat every unknown vessel parameter as `TBD`. Starter records are illustrative, not approved vessel design data. Human engineering review and independent verification are required for safety-critical decisions.

No live vessel control, actuator commands, weapon targeting or combat-payload features are in scope.