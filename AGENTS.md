# Matchline — Repository Agent Rules

Applies to every AI coding agent and human contributor working in this repository. This is the main, version-controlled **process rulebook** for Codex. Claude Code loads the same rules through `CLAUDE.md`. Read `CONTRIBUTING.md` for the full three-person workflow.

## 1. Mission and scope

Matchline is a personalized, gamified football-media platform. Phase 1 focuses on the English Premier League, a match-by-match Journey, a geographic stadium map, favorite-team impact, community rooms, deterministic predictions, and a **private, multi-turn conversation between each user and AI** for post-match What-if analysis. The AI must examine the user's actual hypothesis, identify supporting and conflicting verified evidence, and explain uncertainty. Community rooms are a separate user-to-user feature.

Do **not** implement Phase 2 features (payments, third-party public API, multi-sport support, public AI-thread sharing) during bootstrap or Phase 1 unless an approved spec change explicitly moves them.

## 2. Read in this order before implementation

1. This `AGENTS.md` and `CONTRIBUTING.md`.
2. Both `specs/Matchline_Phase1_*_Codex_Spec.md` documents, **v2.4**.
3. The task file for the assigned workstream, and the other task file for dependencies.
4. The **identical Appendix A** in both specs; it is the frozen normative API/DTO/test contract.
5. Existing source, tests, manifests, and Git history relevant to the requested change.

If files are missing, report exactly which. **Do not invent API routes, DTO fields, UUIDs, fixture data, or sign-offs.** If prose conflicts with Appendix A, Appendix A governs the technical contract; report discrepancies rather than silently rewriting specs. User-approved scope changes require coordinated changes to both specs and both task lists.

## 3. Work in small, bounded changes

- Begin by stating the assigned workstream, task ID(s), files to edit, dependencies, and expected tests.
- Never start a later gate before its prerequisites pass. **BE-00 and FE-00 happen before G0; BE-01 and FE-01 happen only after joint G0 sign-off.**
- Do one coherent task slice per change/PR; do not implement entire Phase 1 in the repository bootstrap.
- Preserve existing code and user changes. Never delete, overwrite, reset, force-push, rebase shared branches, or change remote settings without authorization.
- Avoid needless dependencies, sweeping refactors, undocumented endpoints, mock-only claims of integration, and speculative abstractions.
- Never mark a test or gate PASS without running the relevant check. Use PASS, FAIL, or BLOCKED, and provide evidence.

## 4. File ownership and three-person collaboration

- **Backend workstream:** `backend/**`, plus root `docker-compose.yml` and root `README.md` after foundation handoff.
- **Frontend workstream:** `frontend/**`, including `frontend/README.md`.
- **Integration/QA coordinator (third teammate):** `.github/**`, `scripts/**` for cross-stack checks, shared process docs, and G0–G5 coordination. Own initial root bootstrap files **before** workstream handoff.
- **Shared/protected:** `specs/**`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/TEAM_OWNERSHIP.md`, contract/manifests. Do not edit unilaterally; obtain backend + frontend review and integration coordinator approval for contract modifications.
- Backend is the source owner of `backend/app/seed/demo_manifest.json` and `backend/tests/fixtures/contract_edge_cases.json`. Frontend only mirrors their approved content/hashes after BE-00.
- Roles refer to people, not agent identities. Fill actual names/handles only after team confirmation; never invent GitHub usernames.
- Use separate branches/worktrees and PRs; don't have agents modify the same worktree concurrently.

## 5. Technical and design rules

- Backend: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2 async, Alembic, PostgreSQL 16+, pytest, Ruff.
- Frontend: Next.js App Router, React, TypeScript `strict`, Tailwind, pnpm lockfile, Vitest/Testing Library, Playwright. No unexplained `any` or UI-only invented server state.
- Browser uses **relative same-origin `/api/v1`** through a Next.js proxy; never call FastAPI cross-origin directly from browser components. Backend is authoritative for permissions, cutoff, demo time, calculations, and feature flags.
- All match IDs/teams/fixtures come from the approved shared manifest and contract. Use verified coordinates or expose unmapped fixtures, never fabricate locations.
- Competition determines node color/motif; status determines animation/icon/label. Don't copy protected league logos or Candy Crush artwork.
- A favorite team **prioritizes** information; it never conceals other matches. Home and away fixtures are highlighted.
- Free accounts can contribute to existing rooms; premium can create rooms. Community moderation must follow the documented guarded CLI and public redaction contract.
- Predictions close at server-authoritative kickoff and are settled deterministically. What-if conclusions are **not** objectively verifiable counterfactual results.
- All facts and AI output must disclose provenance. Synthetic data = `DEMO_SYNTHETIC`; scripted AI = `DEMO_AI`; real AI must not fabricate evidence. Phase 1 includes a configurable remote AI adapter; don't count a scripted response as a passed real-model acceptance test.
- Date/time: store UTC, render football-local Europe/London with an explicit timezone, honor server `/meta` time and scenario revision in DEMO mode.
- Never leak passwords, session tokens, model keys or local credentials into commits, logs, test snapshots, browser bundles, or `.env.example` values.

## 6. Definition of done and reporting

- Run relevant formatter/lint/type checks and tests; if a tool is not installed or credentials are absent, record BLOCKED with reason, not PASS.
- API changes require backend contract tests, frontend typed fixture updates, and explicit approval through change control; generated OpenAPI must conform to Appendix A, not override it.
- Fix or document new warnings; no failing tests disguised as unrelated, no weakened assertions to force green.
- At the end of each task report: task IDs; changed files; commands and results; API/schema impact; blockers; handoff required; next allowed gate.

## 7. Code review rules

Flag: undocumented API/DTO drift; missing auth/Origin checks; cross-user cache leaks; secrets; synthetic content portrayed as real; unverifiable AI claims; missing evidence refs; kickoff or prediction race conditions; cache/redaction leaks; broken UUID/manifest integrity; and work crossing ownership boundaries. Review observable behavior, not just whether code compiles.

## 8. Foundation process clarifications

- Human A is backend lead, B frontend lead, C integration/QA coordinator; names and verified GitHub handles remain TBD. One monorepo uses `main` for integration and independent branches/worktrees for the two future agents.
- Require CI and at least one other human reviewer per bounded task PR; both A and B review shared/protected changes, and C coordinates approval and gate sign-off. Use Conventional Commits and record task ID plus gate. Branch examples: `feat/be-00-contract`, `feat/fe-00-mocks`, `fix/be-auth-origin`, `fix/fe-map-selection`, `test/contract-ct-02`, `chore/ci-checks`. Documented review requirements do not imply GitHub protection is configured.
- Match Journey is the main page, with one match per node. Backend also owns authentication, quotas, standings/impact math and match state. Private multi-turn What-if analysis must cite evidence and explain uncertainty.
- Phase 1 excludes real billing, gambling, public interpretation APIs, published private AI chats and unauthorized league logos/data. Do not fetch or use a live football API before licensing is confirmed. Missing remote-model credentials make its live acceptance test BLOCKED, not PASS.
