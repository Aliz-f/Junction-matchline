# Matchline — Bootstrap package (before Phase 1 work)

These are **starter instructions and rule files**, not a coded application.

## Included

- `CODEX_BOOTSTRAP_PROMPT.md`: **one complete prompt** to paste into Codex to create the repository foundation and initial process/CI scaffolding.
- `AGENTS.md`: required team-wide agent working rules used by Codex.
- `CLAUDE.md`: Claude Code entry point that imports AGENTS.md and CONTRIBUTING.md.
- `CONTRIBUTING.md`: three human team roles, review/handoff workflow, branch conventions, G0–G5 protocol.

## Recommended usage

1. Create your **single private** `matchline` repository locally or on GitHub (with your explicit authorization). Keep it empty or preserve any existing work.
2. Place `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, and `CODEX_BOOTSTRAP_PROMPT.md` at the repository root. These files must stay together, as Claude imports both rules files.
3. Open Codex at the repository root and paste the **entire contents** of `CODEX_BOOTSTRAP_PROMPT.md`. Or ask Codex to read it and execute it exactly. It will create the foundation files and cross-file validation tool.
4. Add the four **unchanged** Matchline Phase 1 **v2.4** Markdown files under `specs/` (names in the prompt). The bootstrap must not invent missing spec files.
5. Review the scaffold as three humans and create the initial Git commit. Do **not** declare G0 complete yet.
6. Start separate backend/frontend Codex worktrees, complete BE-00/FE-00, compare seed-manifest/corpus hashes and API contract, and jointly sign off G0 before BE-01/FE-01.

**Important:** The bootstrap prompt deliberately stops short of implementing app features, backend DB models, or frontend pages. It is safe to run before copying the four v2.4 specs; the spec validation is clearly BLOCKED until the files exist.

## Naming

Use the exact filenames `AGENTS.md` and `CLAUDE.md`. `agent.md`, `agents.md`, `calude.md`, and `CLAUD.md` are not the expected defaults.
