# Matchline — Claude Code Project Instructions

Read and follow our **shared, version-controlled rules**. They apply equally to Claude, Codex, and the three human contributors.

@AGENTS.md
@CONTRIBUTING.md

## Claude-specific behavior

- Before editing, identify the role/workstream (backend, frontend, or integration/QA), task ID, allowed paths, and gate. If unspecified, make a read-only plan and request/await an assigned scope instead of editing across workstreams.
- At bootstrap, make only repository/process infrastructure; **do not begin BE-00 or FE-00** until the bootstrap is reviewed. During Phase 1, begin with BE-00/FE-00, then joint G0, and only then BE-01/FE-01.
- Read both v2.4 specifications and both task lists under `specs/`; the identical Appendix A is normative. Do not silently reinterpret fields, endpoints, errors, thresholds or demo IDs.
- Keep changes limited to the assigned worktree and file ownership; describe proposed cross-workstream changes in a handoff rather than editing the other workstream's files.
- Prefer a small testable patch, then report tests actually run, failures, blockers, contract drift and next gate. Never claim a real AI check passed using a script or offline model.
- When `AGENTS.md` or `CONTRIBUTING.md` must change, use one reviewed shared-process PR rather than duplicating a new, contradictory rule here.

## Commands (only after the relevant scaffold exists)

- Backend: `cd backend && python -m pytest`; `ruff check .`; `ruff format --check .`.
- Frontend: `cd frontend && pnpm lint && pnpm typecheck && pnpm test`.
- End-to-end tests: run only with the documented local Compose/API/browser environment and seeded accounts. Record whether dependencies and credentials were available.
