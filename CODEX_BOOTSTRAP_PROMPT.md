# Paste this entire prompt into Codex (one-time repository bootstrap)

You are the **integration/bootstrap engineer** for MATCHLINE, a three-person team project. Your assignment is **repository foundation only** — a small, reviewable Phase 0 change **before** any Phase 1 backend/frontend implementation. Execute the safe setup tasks now in the open workspace; do not stop at a proposal. Never claim to have created a remote GitHub repo or enabled branch protection unless you actually did so through authorized tooling.

## Goals

1. Establish **one monorepo**, with independent `backend/` (Python/FastAPI) and `frontend/` (Next.js/TypeScript), a shared `specs/` directory, and coordinated CI/guidance for three humans and two future coding agents.
2. Create/preserve root `AGENTS.md` (Codex), `CLAUDE.md` (Claude Code), and `CONTRIBUTING.md` (one team rulebook). If these were supplied with this prompt, use them as the baseline and do NOT silently shorten or rewrite them. If absent, create equivalent documents from the required rules below; ensure Claude imports the root `AGENTS.md` and `CONTRIBUTING.md` with its supported `@...` syntax.
3. Prepare safe Git, code hygiene, PR-review, testing and spec-identity scaffolding.
4. Provide exact next commands to start **BE-00** and **FE-00 in separate Git worktrees**, but **do not run those tasks in this bootstrap**.

## Read-only preflight before editing

- Print current repository root, `git status --short`, branch, and paths that already exist. Check for user changes and any existing instructions. Preserve all existing tracked/untracked content. If this isn't a Git repo, initialize local Git only; don't create/push a remote without approval.
- If the four Matchline Phase 1 v2.4 docs exist in `specs/`, read and compare their contract sections. The expected filenames are:
  - `Matchline_Phase1_Backend_Codex_Spec.md`
  - `Matchline_Phase1_Backend_Tasks.md`
  - `Matchline_Phase1_Frontend_Codex_Spec.md`
  - `Matchline_Phase1_Frontend_Tasks.md`
- If specs are **not yet present**, DO NOT invent them or block the repository foundation. Keep `specs/` ready and state `SPEC HANDOFF BLOCKED — four v2.4 files must be copied unchanged`. **Never say G0 passed or begin BE-00/FE-00 without the four docs.**
- Identify any conflict between requested changes and existing content before overwriting. If a requested file exists, update conservatively rather than replace it wholesale.

## Required files and directories

Create or conservatively update:

```text
matchline/
├── AGENTS.md                       # primary Codex agent instructions
├── CLAUDE.md                       # Claude imports AGENTS + CONTRIBUTING
├── CONTRIBUTING.md                 # three-person workflow and PR rules
├── README.md                       # bootstrap overview and local dev/worktree notes
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .github/
│   ├── pull_request_template.md
│   └── workflows/bootstrap.yml     # syntax/spec-alignment checks only at bootstrap
├── docs/
│   ├── TEAM_OWNERSHIP.md           # 3 unassigned roles; NO invented usernames
│   └── INTEGRATION_STATUS.md       # Bootstrap + G0–G5 PASS/FAIL/BLOCKED, no false PASS
├── scripts/
│   └── check_specs.py              # Python stdlib validation, no external deps
├── specs/                           # preserve four supplied v2.4 files, when present
├── backend/                         # directory marker only, no app implementation yet
└── frontend/                        # directory marker only, no app implementation yet
```

Create safe directory markers as needed. Do not install dependencies, generate an entire FastAPI/Next app, add Postgres migrations, seed fixture IDs, invent DTOs, call a sports/AI API, or implement Phase 1 features in this initial bootstrap. App scaffolding belongs to BE-00/FE-00 and later tasks. Do NOT generate `docker-compose.yml` yet; backend workstream owns it after initial bootstrap.

## Mandatory rules in AGENTS.md and CONTRIBUTING.md

- **Three humans:** A backend lead edits `backend/**` and later root `docker-compose.yml` and integration `README.md`; B frontend lead edits `frontend/**`; C integration/QA coordinator owns initial bootstrap, `.github/**`, cross-stack `scripts/**`, gates and common process docs. Actual names/handles remain TBD until user fills them in.
- **Shared/protected:** `specs/**`, contract Appendix A, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, manifests and cross-stack decisions cannot be changed by one side alone. A and B review shared changes; C coordinates gate sign-off.
- One repository, separate branches and **independent Git worktrees** for backend and frontend agents. Never let two agents edit the same worktree simultaneously.
- `main` is integration branch. Require review and CI in documented process; if repository settings are not accessible, output a manual GitHub settings checklist. Do not falsely claim branch protection or CODEOWNERS assignment was configured.
- Branch examples: `feat/be-00-contract`, `feat/fe-00-mocks`, `fix/be-...`, `fix/fe-...`, `test/contract-...`, `chore/ci-...`.
- Conventional Commits; one bounded task/slice per PR; task ID and G0–G5 gate on PR; at least one other human reviewer. Both A and B review API/schema changes.
- Before any feature work, inspect **all four v2.4 docs**. Appendix A, byte-identical between specs, is normative. No undocumented routes, fields, fixture IDs, score rules or partial four-file contract edits. OpenAPI must conform to the frozen Appendix, not override it.
- BE-00/FE-00 are **pre-G0**. BE-00 creates minimal Pydantic/OpenAPI shell + canonical demo manifest and test corpus; FE-00 mirrors hashes and typed fixtures. Three humans review G0; BE-01/FE-01 only after G0 sign-off. No claims of gate PASS without running tests and recording evidence.
- Stack: backend Python 3.12+, FastAPI, Pydantic 2, async SQLAlchemy, Alembic, Postgres, pytest, Ruff. Frontend Next.js App Router, strict TS, pnpm, Tailwind, Vitest, Playwright. Use lint/typechecks/tests rather than stylistic preference.
- Browser calls only relative, same-origin `/api/v1` via Next.js proxy. Server owns auth, kickoff, role permissions, standings/impact math, demo clock, quotas and match state. Never paste secrets in source, logs, frontend env, snapshots or tracked files.
- Match Journey is main page; one match per node. Competition decides color/motif; match status decides animation/icon. Favorite club highlights home **and away** matches but does not hide others. Geolocations must be verified or shown as unmapped.
- FREE users may participate in existing rooms; PREMIUM users may create rooms. What-if is **private multi-turn user-to-AI** analysis, not a user chat; evidence and uncertainty are mandatory. Predictions lock at kickoff; impact computed deterministically. Label synthetic sports data and scripted AI. A real remote-model adapter is required in Phase 1 code, but without credentials its live test is BLOCKED, not PASS.
- Phase 1 explicitly excludes real billing, gambling, Phase 2 public interpretation API, published private AI chats, and unauthorized use of league logos/data. Do not fetch/use live football API before data licensing is confirmed.
- At the end of every coding task, report files changed, test commands and outputs, API impact, gate status and handoff/blockers. Never work outside assigned edit ownership.

`CLAUDE.md` should be short and contain the actual `@AGENTS.md` and `@CONTRIBUTING.md` import directives, then only Claude-specific instructions. Avoid duplicating independent rule versions that can drift.

## Implement bootstrap checks and template files

1. `.editorconfig`: UTF-8, LF, final newline, reasonable indentation defaults (Python/TS 4 or 2 according to file type), trim trailing whitespace except Markdown intentional double spaces.
2. `.gitattributes`: stable LF for source/specs, binaries identified when needed.
3. `.gitignore`: Python caches/venvs, `.env` and `.env.*` EXCEPT `*.example`, node_modules, `.next`, coverage, playwright/test results, local credentials, IDE junk, caches. Do not ignore any AGENTS/CLAUDE/spec files.
4. `.github/pull_request_template.md`: task/gate, summary, allowed directories, contract-change checkbox, data/security checks, tests run with PASS/FAIL/BLOCKED, reviewed-by, handoff.
5. `docs/TEAM_OWNERSHIP.md`: blank roles A/B/C + responsibility/paths and a reminder to replace blank names/handles with real ones, not invented accounts. Do not create a fake `.github/CODEOWNERS`; document how to add it after receiving verified GitHub handles.
6. `docs/INTEGRATION_STATUS.md`: simple gate table Bootstrap, G0, G1, G2, G3, G4, G5, all NOT STARTED unless actually proven otherwise, plus blocks/handoff section.
7. `scripts/check_specs.py` (standard library):
   - Validate all 4 expected v2.4 paths together; if exactly 0 files exist, clearly return `BLOCKED: specs not yet copied` without falsely recording G0 PASS. In strict mode exit nonzero. If some but not all are present, always nonzero with names.
   - Check all 4 spec headers target v2.4; compare content from the exact `## Appendix A` heading through EOF in both spec files (byte-for-byte), report SHA-256.
   - Check the presence of CT-01 through CT-22 in both Appendix A6 sections; report missing IDs.
   - No network or external dependencies, no altering specs or silently normalizing differing contracts.
   - Support `--bootstrap-allow-missing` ONLY for the initial foundation check when all four docs are absent; print `SKIPPED/BLOCKED`, not PASS. In all other cases, enforce strict rules.
8. `.github/workflows/bootstrap.yml`: syntax and spec-alignment validation on PR/push. Run the strict validator when all specs are present, and fail if only some specs are present. Before docs are copied, explicitly report `SKIPPED (awaiting specs)` for the spec job rather than presenting green as contract verification. If possible, check line endings and obvious tracked secrets without any external action.
9. `README.md`: project summary, topology diagram/text, what this bootstrap includes, how to place v2.4 docs, how to run the validator, branch/worktree commands AFTER initial commit, eventual ports `3000` and `8000`, local environment notes. Label planned commands that do not exist yet. No fabricated dev/test success claims.

## Validation and safe completion

- Run the Python bootstrap validator in the appropriate mode and show actual output. If the four documents exist, run strict mode and report Appendix A hash and the 22 CT IDs; if absent, state the handoff requirement.
- Validate YAML syntax if a YAML tool is already available; if not, report this as not checked. Run `git diff --check`, inspect new files, verify no accidental secrets or unrelated changes.
- Do **not** assume a remote exists or push. Do not auto-commit without instruction; show the suggested commit and branch/worktree commands. No destructive cleanup of a nonempty repository.
- Final report must include: created/modified files; validation evidence; missing spec documents or other blockers; a three-member responsibility summary; precise next steps for importing the four v2.4 docs and opening separate BE-00/FE-00 worktrees; and a **clear stop statement**: "Bootstrap complete; BE-00/FE-00 and G0 have not started."

Now inspect the open repository and execute **only this bootstrap**.
