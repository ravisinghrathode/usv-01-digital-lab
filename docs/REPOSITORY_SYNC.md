# Repository and assistant synchronisation

## Shared source of truth

This repository is the shared version-controlled source for application code, engineering schemas and the common project context file.

## Workflow

1. ChatGPT or Google AI Studio edits a branch or working copy.
2. Changes are committed to GitHub with a clear message.
3. Pull/refresh the repository in the other environment before editing the same files.
4. Use branches or pull requests for overlapping work; do not rely on silent last-write-wins overwrites.
5. Update `USV01_PROJECT_CONTEXT.md` when an engineering baseline or project ownership rule changes.
6. Keep Obsidian's linked Markdown graph in the Obsidian vault. Git may version the Markdown files, but Google Drive folder structure is not the knowledge graph.

Two-way repository sync shares files and code only. It does not merge ChatGPT and Gemini conversation histories, private memory or tool credentials.