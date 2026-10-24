# Matchline — Three-Person Contribution and Integration Rules

This file defines collaboration **process**, while the four `specs/` documents define feature behavior. These rules apply to humans, Codex, and Claude.

## Team responsibilities

| Role | Primary responsibility | Exclusive edit area after foundation handoff | Required review |
|---|---|---|---|
| Member A — Backend lead | FastAPI, persistence, football data, server-side AI, API conformance | `backend/**`, root Compose and root integration README | Member C; Member B for contract changes |
| Member B — Frontend lead | Next.js UI, Match Journey, map, typed API client, UI/e2e tests | `frontend/**` | Member C; Member A for contract changes |
| Member C — Integration/QA lead | Bootstrap, CI, contract checks, fixture hashes, acceptance gates, PR coordination | `.github/**`, cross-stack `scripts/**`, shared process docs after review | A or B; both for contract changes |

The table is a role assignment, **not an assertion of members' names or GitHub IDs**. Record actual names/handles in `docs/TEAM_OWNERSHIP.md` once the three members agree. Member C coordinates rather than unilaterally rewriting backend or frontend code.

## Before coding

1. Bootstrap root files, Git process, `.gitignore`, `.editorconfig`, PR template, scripts and CI without implementing Phase 1 features.
2. Add the **unmodified four v2.4 spec/task files** to `specs/`. Validate that both Appendix A sections are identical; stop and report if missing/different.
3. Create an initial reviewed commit on `main`. Do not push to or create a GitHub repository without explicit permission.
4. Create two independent feature branches/worktrees only after the initial commit: `feat/be-00-contract` and `feat/fe-00-mocks`. Never run the two agents in the same worktree.
5. Backend BE-00 generates authoritative demo manifest, edge corpus and minimal OpenAPI shell. Frontend FE-00 mirrors **that committed revision** and matching hashes. Both roles plus Member C approve **G0** before FE-01/BE-01.

## Git conventions

- Default branch: `main`, protected with PR review and required checks when GitHub settings become available.
- Branch names: `feat/be-00-contract`, `feat/fe-03-journey`, `fix/be-auth-origin`, `fix/fe-map-selection`, `test/contract-ct-02`, `docs/team-rules`, `chore/ci-checks`.
- Commits: Conventional Commits such as `feat(backend): add favorite-team endpoint`, `test(contract): cover room visibility`, `docs: clarify team ownership`.
- Keep PRs small and scoped to one coherent task or slice; link task IDs and G0–G5 gate. Never rewrite shared branch history or force push without team approval.
- At least one other human reviews each PR. Both backend and frontend leads review shared API/DTO/fixture changes; Member C records integration gate status.
- If branch protection cannot be configured, use the same manual checklist; do not claim enforcement is enabled.

## Pull-request checklist

- [ ] Task ID, scope, and acceptance criteria are recorded.
- [ ] Changed files stay inside assigned ownership (or approved shared scope).
- [ ] No keys, cookies, tokens, credentials, copied real sports feeds, or local `.env` values are committed.
- [ ] Relevant lint, typecheck, tests and docs validation ran; exact commands and failures are reported.
- [ ] API shape, migrations, fixture IDs and error cases are contract-aligned; no undocumented endpoints.
- [ ] Tests cover success, error, empty, auth and concurrency cases as applicable.
- [ ] No synthetic facts shown as real; no What-if certainty claims presented as evidence.
- [ ] Other team received required schema/seed/mock handoff and hash/version info.
- [ ] Reviewer approves; gate result is marked PASS/FAIL/BLOCKED with evidence.

## API and shared fixture change control

Appendix A v2.4 is the authority, including DTOs, error envelope, HTTP statuses, auth/Origin rules, match state, room changes, private What-if interactions, and 22 required contract scenarios. FastAPI OpenAPI is **generated conformance evidence**, not a new authority.

For any material contract change: (1) open a change request; (2) document reason, endpoints/types, data migration and backward compatibility; (3) update **both** specs **and both** task lists together; (4) update backend expected OpenAPI and contract tests; (5) update frontend generated types/MSW fixtures; (6) request A+B reviews and C's gate coordination; (7) land one coherent PR. Do not allow an agent to repair contract drift by changing only its side.

Backend's manifest and edge corpus are immutable for G0 unless this coordinated process approves a revision. Frontend fixtures are generated/copied from them, never independently invented. Record hashes for reproducibility.

## Quality and security standards

- Python: explicit typing for public APIs, small services, Pydantic validation, async DB access, migrations for schema changes, Ruff, pytest. No business logic buried in route handlers.
- TypeScript: `strict` enabled, no `any` workarounds, typed API client from conforming OpenAPI, composable accessible components, component and Playwright coverage. Pin dependencies and commit `pnpm-lock.yaml`.
- Use UTC internally; display Europe/London with timezone. Server is authoritative for clock, room cutoffs, prediction lock, scores, relevance, quotas, and roles.
- Cookies are HttpOnly and session-backed; all browser API traffic uses same-origin `/api/v1`. User-dependent/private response cache rules must follow the contract; clear on auth changes.
- Never store secrets in Git. Provide `.env.example` with **variable names and safe placeholders only**. Demo premium/free passwords live in gitignored developer/CI secrets, handed off privately.
- Real model adapter is an implementation requirement; if network or credentials unavailable, report the G4 real-model smoke test BLOCKED. Synthetic sports data and scripted AI are always visibly labeled.
- Preserve audit logs, privacy and consent; never export Phase 1 private What-if content to public rooms or external developers.
- Prefer meaningful error states and accessible forms; avoid fake success states, placeholder buttons, and unhandled empty/loading states.

## Integration gates

| Gate | Requirement | Coordinator evidence |
|---|---|---|
| Bootstrap | Root repo/process setup only; no Phase 1 app implementation | Rule files, CI scaffolding, clean Git state, known spec availability |
| G0 | BE-00 + FE-00 frozen contract/manifest/OpenAPI/mock agreement | Appendix A identity; both fixture hashes and CT-13; three-role sign-off |
| G1 | Auth, teams, Journey, match details | Actual backend + frontend + contract results |
| G2 | Map, Impact, Community, permissions | Real FREE/PREMIUM test accounts; map/room contract results |
| G3 | Prediction settlement, badges, profile | Authoritative cutoff/scoring, CT tests |
| G4 | Private multi-turn What-if AI | Evidence/limits/retries; live-model result PASS or BLOCKED (never fake PASS) |
| G5 | Release integration | Full 22 CT scenarios, end-to-end tests, security and UI checks |

A gate requires **observed evidence**, not just a checked task box. Record PASS/FAIL/BLOCKED, exact command/output summary, environment, PR/commit and reviewer. If a gate is blocked, independently mocked work may continue, but its integrated status is not PASS.

## Handoffs and meeting routine

- Each workstream writes a concise PR/handoff message with changed paths, API/fixture changes, test commands/results, and dependencies.
- Member C maintains `docs/INTEGRATION_STATUS.md` (task/gate states, fixture hashes, blockers, next owner); this is a status log, **not** an alternate spec.
- At the start of a coding session, pull/rebase the approved `main` updates in your own feature branch using the team's agreed policy; never touch another agent's worktree.
- At each gate, both leads verify the same IDs/data and integration contract; Member C runs/records joint tests. Escalate any hidden behavior mismatch rather than patching around it locally.

## Foundation clarifications

- Shared/protected files include `specs/**`, Appendix A, `AGENTS.md`, `CLAUDE.md`, this file, manifests and cross-stack decisions. Both A and B review shared changes; C coordinates approval. No side changes them alone.
- Backend stack: Python 3.12+, FastAPI, Pydantic 2, SQLAlchemy 2 async, Alembic, PostgreSQL 16+, pytest and Ruff. Frontend: Next.js App Router, React, strict TypeScript, pnpm, Tailwind, Vitest/Testing Library and Playwright. Choose changes using lint/typecheck/test evidence.
- Browser calls only relative same-origin `/api/v1` through the Next.js proxy. Backend owns authentication, kickoff, roles, standings/impact calculations, demo clock, quotas and match state.
- Match Journey is the main page, one match per node. Competition controls color/motif; status controls animation/icon. Favorite clubs highlight both home and away fixtures without hiding other matches. Coordinates must be verified or fixtures shown as unmapped.
- FREE users participate in existing rooms; PREMIUM users may create rooms. What-if is private multi-turn user-to-AI analysis with evidence and uncertainty, separate from community chat. Predictions lock at kickoff and impact is deterministic. Label synthetic data `DEMO_SYNTHETIC` and scripted AI `DEMO_AI`.
- Phase 1 excludes real billing, gambling, public interpretation APIs, publishing private AI chats and unauthorized logos/data. Do not fetch/use a live football API until data licensing is confirmed.
- Every task handoff records files, exact commands/results (PASS/FAIL/BLOCKED), API/schema impact, gate state, blockers and next owner. Never edit outside assigned ownership. BE-00/FE-00 precede G0; all three humans must review G0 before BE-01/FE-01.
