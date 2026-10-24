# FE-00 handoff (pre-G0)

Branch `frontend` (all frontend work), based on `main` at `81dae23` (BE-00 merged). Scope:
`frontend/**` only. Status: **FE-00 partially frozen; G0 BLOCKED** on the
backend items below. Nothing here is a G0 sign-off.

## Mirrored fixtures (CT-13, frontend half)

| File | SHA-256 | Mirror check |
|---|---|---|
| `tests/fixtures/demo_manifest.json` | `434c152362e5ffcdf9979ee222daed77976b54c204b94c2ab4904888b221f9b5` | byte-identical to `backend/app/seed/demo_manifest.json` |
| `tests/fixtures/contract_edge_cases.json` | `f2b4fff7969be31341e74ec299b594b4518916f561edff34e7165079ead7fe74` | byte-identical to `backend/tests/fixtures/contract_edge_cases.json` |

Both match `backend/contracts/BE00_HANDOFF.md`. Re-copy, never edit.

## What is frozen

- `lib/api/contract.ts`: Zod schemas for every A1/A3 DTO, enum and A1 error
  code→status; `lib/api/types.ts` infers TS types from them (temporary until
  FE-G0.4 codegen).
- `mocks/handlers.ts`: only routes the manifest fully determines —
  `GET /health`, `GET /auth/me` (guest, `private, no-store` + `Vary: Cookie`),
  `GET /competitions`, `GET /teams?competition=PL` (`crest_url: null`: no
  licensed crest in manifest), `GET /competitions/PL/matchdays?season=2026`.
  All other routes are intentionally unhandled (`onUnhandledRequest: "error"`).
- Validation of manifest identity/references/integrity, A4 starter IDs, G0
  status coverage, three named scenarios, badge baselines, and all 11 edge
  cases (incl. Europe/London DST via IANA zone data and CT-18 score rule).

## Blocking gaps for backend (G1–G9, enforced by `tests/contract/g0-gaps.test.ts`)

The frontend cannot build these Appendix A responses without inventing data:

- **G1** `MatchSummary.source` — no `data_version`, `last_synced_at`, `is_stale` per fixture.
- **G2** `MatchSummary.features` — not in manifest; FE must not derive backend-authoritative flags.
- **G3** `MatchEvent.description` — missing on `80000000-…0001`.
- **G4** `UserPublic.display_name` / `role` — missing on both demo users.
- **G5** `RoomSummary.title` — missing on both rooms.
- **G6** No hidden `POST_MATCH` template for `match_upcoming`, though A4 says `upcoming_finished` activates it.
- **G7** Scenarios carry only `snapshot_id`; A4 requires standings `as_of`/`rows` and expected impacts.
- **G8** A4 says the edge corpus covers `SUSPENDED`/`UNKNOWN`; no case fixture has either status.
- **G9** `EMPTY_ROOM_BURST`/`HIDDEN_OLD_MESSAGE` give a UUID5 namespace but no name template, body, author or timestamp step, so both sides cannot generate identical messages.

Also absent but lower priority for G0: per-match scored prediction histories
(only counts), model response test phrases, expected gap/ranking scores.

## OpenAPI snapshot drift (D1–D4, enforced by `tests/contract/openapi-drift.test.ts`)

- **D1** `WhatifMessageRequest.message` has `minLength=10`, `maxLength=2000`; Appendix A defines no limits.
- **D2** `WhatifThreadRequest.title` accepts `null`; Appendix A is `title?: string`.
- **D3** `MetaView.server_now_utc` pattern `^.+Z$` is looser than A1 `YYYY-MM-DDTHH:mm:ssZ`.
- **D4** `MetaCapabilities.whatif_sharing` is not `required` (has a default); A3 response fields are always present.

Fix on the backend or via a coordinated change request; the test fails either way until this list is updated.

## Questions (not asserted as violations)

- **Q1** `match_halftime` (kickoff 2026-11-08) and `match_event_poor_finished`
  (2026-11-29) are HALFTIME/FINISHED but kick off after the 2026-10-24 demo
  clock. Intended? It puts a finished What-if-eligible match in the Journey's future.
- **Q2** `/meta` in DEMO: initial `scenario_revision` after first seed, and
  `capabilities.events` / `live_updates` values, are not specified anywhere.
  `/meta` mocks stay unfrozen until answered (`demo_epoch=1` is from A3b).
- **Q3** Unspecified mock error choices: `/teams` with competition ≠ PL → 422;
  `/competitions/{code}/matchdays` unknown code → 404, season ≠ 2026 → 422. Confirm.

## G0 plans (FE-G0.2 / FE-G0.4)

- **Proxy/auth:** FE-01 adds a server-side Next.js rewrite `/api/v1/:path*` →
  `http://localhost:8000/api/v1/:path*` from a server-only env var; browser
  uses relative `/api/v1` with `credentials: "include"`, no `NEXT_PUBLIC_API_BASE_URL`,
  no CSRF header, ordinary browser `Origin`. Private/room routes use `cache: "no-store"`.
- **Types:** once backend `/openapi.json` conforms, add `openapi-typescript`
  regeneration of `lib/api/types.ts` and keep `openapi-drift.test.ts` failing on drift.

## Commands run (macOS, Node 22.22.2, pnpm 9.15.0 via corepack)

| Command | Result |
|---|---|
| `corepack pnpm install` | PASS (lockfile created) |
| `corepack pnpm typecheck` | PASS |
| `corepack pnpm test` | PASS — 6 files, 76 tests |
| `python3 scripts/check_hygiene.py` | PASS |
| `python3 scripts/check_specs.py` | PASS (document alignment only) |
| `pnpm lint` | BLOCKED — ESLint is set up in FE-01 |

API/schema impact: none (no shared files edited). Next: backend resolves or
rejects G1–G9/D1–D4/Q1–Q3, then FE-00 freezes the remaining handlers and A+B+C run joint G0.
