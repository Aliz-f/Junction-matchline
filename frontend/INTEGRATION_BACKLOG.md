# Frontend integration backlog

What is left on each frontend task, split by whether it can be finished now
against mocks or needs the real backend. Maintained by the frontend workstream;
this is a working backlog, **not** a gate record — gate status lives in
`FE01_HANDOFF.md` and `docs/INTEGRATION_STATUS.md`.

Last updated against `origin/main` `ce43094` (BE-01 merged) and branch
`frontend` `d4231ab` (FE-03).

## Legend

| Mark | Meaning |
|---|---|
| **FE** | Frontend can do this now, no backend needed |
| **BE** | Blocked on backend work |
| **JOINT** | Needs both services running together |
| **SECRET** | Needs a credential handed over out of band |

---

## Cross-cutting backend blockers

Everything below recurs across several tasks, so it is listed once. Sources:
`FE00_HANDOFF.md` (G/D/Q items) and `FE01_HANDOFF.md` (B/D5/D7 items).

| ID | Item | Blocks |
|---|---|---|
| **B1** | `current_user()` raises on every authenticated request (`auth.py:45`, naive vs aware datetime). BE-01's own test is red. | FE-02 auth, and every signed-in path in FE-06…FE-09 |
| **B2** | No `Cache-Control: private, no-store` / `Vary: Cookie` on private routes | CT-12, FE-10 |
| **D5** | `NOT_IMPLEMENTED` (501), `HTTP_ERROR`, `INTERNAL_ERROR` are not in the A1 error table; the frontend's `ErrorCodeSchema` rejects them | All error handling, FE-10 |
| **D7** | All contract endpoints except `/health`, `/meta`, `/auth/*` are 501 stubs | FE-03…FE-09 integration |
| **D1–D4** | OpenAPI snapshot drift (message length limits, nullable title, loose `server_now_utc` pattern, non-required `whatif_sharing`) | G0, FE-G0.4 codegen |
| **G1** | `MatchSummary.source` has no per-fixture `data_version` / `last_synced_at` / `is_stale` | FE-03, FE-04 |
| **G2** | `MatchSummary.features` absent from the manifest | FE-03, FE-04, FE-07, FE-08, FE-09 |
| **G3** | `MatchEvent.description` missing on an event | FE-04 |
| **G4** | `UserPublic.display_name` / `role` missing on demo users | FE-02, FE-07 |
| **G5** | `RoomSummary.title` missing on both rooms | FE-07 |
| **G6** | No hidden `POST_MATCH` template for `match_upcoming` | FE-07 |
| **G7** | Scenarios carry only `snapshot_id`; no standings `as_of`/`rows`, no expected impacts | FE-06 |
| **G8** | No edge fixture with `SUSPENDED` or `UNKNOWN` status | FE-03, FE-04 |
| **G9** | Room burst fixtures give a UUID5 namespace but no name template, body, author or timestamp step | FE-07 |
| **Q1** | Two fixtures are HALFTIME/FINISHED but kick off after the demo clock — intended? | FE-03 ordering |
| **Q3** | Confirm the unspecified mock error choices (422 vs 404 on bad selectors) | FE-02 |

**Q2 is answered** by BE-01 and needs no further action.

### Deployment-time integration settings

| Item | Detail |
|---|---|
| **JOINT** | Backend `CORS_ALLOWED_ORIGINS` must include the deployed frontend origin, or every write returns 403 `CSRF_ORIGIN_INVALID` |
| **JOINT** | `session_cookie_secure` must be enabled for any HTTPS deployment |
| **FE** | `MATCHLINE_API_BASE_URL` must be set at **build** time as well as runtime, or pages prerender against demo fixtures |

---

## FE-00 — contract shell · G0

Status: delivered; frozen except the handlers that depend on open questions.

| | Remaining |
|---|---|
| **BE** | Resolve or reject G1–G9, D1–D4, Q1, Q3 |
| **FE** | Freeze the remaining MSW handlers once those are answered |
| **JOINT** | Re-verify both fixture SHA-256 hashes, then three-role G0 sign-off |

Mirrors are currently still byte-identical to `origin/main`, so no re-copy is needed.

## FE-01 — scaffold and app shell

Status: delivered. Verified against BE-01 for `/health`, `/meta`, `/auth/*` guest
paths, Origin enforcement and header passthrough.

| | Remaining |
|---|---|
| **BE** | B2, so CT-12 has real headers to preserve |
| **FE** | Playwright project setup (not wired in FE-01) |
| **JOINT** | Confirm 404 and error states against a non-stub backend |

Note: no root `app/loading.tsx` may be reintroduced — it makes `notFound()`
return 200. See the comment in `lib/demo/mode.ts`.

## FE-02 — API client, auth, team onboarding · G1

Status: **partial.** Data layer done; auth UI not wired.

| | Remaining |
|---|---|
| **FE** | Wire `useLogin` / `useRegister` / `useLogout` into the login and register forms (hooks exist, forms still inert) |
| **FE** | Header session UI: show the signed-in user, add sign-out |
| **FE** | Safe return-to path after an unauthorised write prompts sign-in |
| **FE** | Expand MSW handlers to every endpoint the pages now use (currently the FE-00 frozen set only; demo route handlers were extended instead) |
| **FE** | FE-G0.4: `openapi-typescript` codegen to replace the hand-maintained `lib/api/types.ts`, failing CI on drift |
| **FE** | Wire `/meta.scenario_revision` + `demo_epoch` change to cache invalidation |
| **BE** | **B1** — until fixed there is no reachable signed-in state at all |
| **BE** | G4, so a real `display_name` / `role` can be rendered |
| **SECRET** | BE-03 local-only FREE and PREMIUM credentials, out of band, for G2 |
| **JOINT** | Real browser cookie + Origin test through the proxy (register 201 / login 200 / logout 204 / guest 200) |
| **JOINT** | CT-08 and CT-12 verification across PREMIUM → FREE → guest switches — needs rooms and private data to exist |

## FE-03 — Match Journey · G1

Status: delivered against demo fixtures.

| | Remaining |
|---|---|
| **BE** | D7 — `/journey` is a 501 stub |
| **BE** | **G1 / G2** — demo mode currently derives `source` and `features`. Both must come from the backend; the derivation is a stand-in and must not survive integration |
| **BE** | G8 — no `SUSPENDED` / `UNKNOWN` fixture exists, so those node styles are untested against real data |
| **BE** | Q1 — confirm whether a FINISHED fixture should sit in the Journey's future |
| **FE** | Cup motifs (UCL purple/star, FA Cup orange/cup) have no fixtures to render; styling is unexercised |
| **JOINT** | Confirm Journey match UUIDs match the map and Impact for the same fixtures |

## FE-04 — Match details · G1

Status: **done** against demo fixtures.

| | Remaining |
|---|---|
| **FE** | Discuss / Predict / Impact / What-if panel *contents* — the tabs and their gating are done, the panels are handed to FE-07 / FE-08 / FE-06 / FE-09 |
| **BE** | D7 — `/matches/{id}` and `/matches` are 501 stubs |
| **BE** | G3 — missing `MatchEvent.description`; demo mode currently restates kind + player instead |
| **BE** | G8 — no `SUSPENDED` / `UNKNOWN` fixture, so those header states are untested against real data |
| **BE** | G1 / G2 as in FE-03 |
| **JOINT** | Confirm statistics and line-ups really are null from the provider, not dropped in transit |

## FE-05 — stadium map · G2

Status: **done** against demo fixtures.

| | Remaining |
|---|---|
| **FE** | Impact overlays on the map (HIGH/MEDIUM/LOW indicators from all `/impact/relevant` pages) — belongs with FE-06, which owns that endpoint |
| **FE** | Consented guest-favourite import from the map itself; it currently points the viewer at the Journey to do it |
| **BE** | D7 — `/map/stadiums` is a 501 stub; `illumination_state` must come from the backend, not demo mode's stand-in aggregation |
| **BE** | Precedence between illumination states for a venue hosting several selected fixtures is unspecified — demo mode picked one and the backend owns the real rule |
| **BE** | No fixture has an unverified-coordinate venue, so `VENUE_COORDINATES_UNVERIFIED` is untested against real data |
| **JOINT** | CT-02–CT-05 selector/subset rules and the CT-15 no-favourite path, against the real backend |

## FE-06 — Impact and standings · G2

Status: **structure done**, figures blocked. The UI, ordering, sectioning and
the full insufficient-evidence path are built and tested; no real impact number
can be shown until G7 is resolved.

| | Remaining |
|---|---|
| **BE** | **G7 is the blocker.** Snapshots are `{id, key}` only — no standings `as_of`, no rows, no expected impacts. Without them there are no points-gap effects, no scenarios and no table |
| **BE** | D7 — `/impact/relevant`, `/matches/{id}/impact` and `/standings` are 501 stubs |
| **FE** | Hypothetical-vs-CONFIRMED rendering is implemented but **unexercised**: demo mode can never emit a scenario, so only the zero-scenario path has real data behind it |
| **FE** | HIGH/MEDIUM/LOW banding is implemented and unit-tested with synthetic insights, but no real insight has been graded |
| **FE** | Separate historical-effects area, once historical insights exist to put in it |
| **FE** | Map Impact overlays (FE-05 defers to this task's endpoint) |
| **JOINT** | CT-06 / CT-07; thresholds at 3/6/7/9/10 |

Demo mode deliberately does **not** implement `/standings`: inventing a table,
or deriving one from fixture scores, is the fabrication the rules prohibit, and
positions need tiebreaks nothing specifies. It returns the gap error instead.

## FE-07 — Community and rooms · G2

Status: **not started.** Route and 404 behaviour exist.

| | Remaining |
|---|---|
| **FE** | Global room list, per-match rooms, direct room fetch by `GET /rooms/{id}` (not from the index) |
| **FE** | Message pagination with `sync_after_seq`, `/changes` polling, ordered UPSERT/REMOVE applied to all loaded pages |
| **FE** | 15-second foreground polling, on focus, on reconnect, on `/meta` revision change, after a 409 |
| **FE** | Composer available to FREE in OPEN rooms; PREMIUM-only create form; `can_create` as a same-kind, match-phase permission |
| **FE** | Read-only at cutoff; 403 `PREMIUM_REQUIRED` and 409 `ROOM_CLOSED` without silent message loss |
| **FE** | Reporting, sanitisation, draft preservation; HIDDEN excluded entirely, FLAGGED visible |
| **BE** | D7 — every room endpoint is a 501 stub |
| **BE** | **G5** (no `RoomSummary.title`), **G6** (no hidden POST_MATCH template), **G9** (burst fixtures underspecified, so both sides cannot generate identical messages) |
| **SECRET** | BE-03 FREE and PREMIUM credentials — G2 cannot pass without them |
| **JOINT** | CT-08, CT-12, CT-16, CT-17, CT-19 |

## FE-08 — predictions, badges, profile · G3

Status: **not started.**

| | Remaining |
|---|---|
| **FE** | HOME/DRAW/AWAY plus optional exact score, with the both-null-or-both-valid rule |
| **FE** | Upsert before cutoff; mandatory UUID `Idempotency-Key`; re-`GET` `/predictions/me` after every write and render that, not the replayed snapshot |
| **FE** | Scoring breakdown (+3 outcome, +2 exact), explicit VOID |
| **FE** | Leaderboard, prediction history, badges; **no** What-if list at G3 |
| **FE** | Cutoff from `locked_at` + `/meta`, never ticking against frozen time |
| **BE** | D7 — all prediction endpoints are 501 stubs |
| **BE** | Per-match scored prediction histories (manifest has counts only), so badge boundaries cannot be verified |
| **JOINT** | CT-18; FREE badge 4/2 → 5/3 on settlement and back to 4/2 on baseline reset |

## FE-09 — private What-if AI · G4

Status: **not started.**

| | Remaining |
|---|---|
| **FE** | Thread selector and multi-turn private chat on finished matches; thread list added to `/profile` at G4 only |
| **FE** | Typed evidence rendering, refs joined only within the same AI message, unsafe refs shown as unsafe |
| **FE** | USER vs `AI_ANALYSIS` vs `DEMO_AI` distinction; verdict / reasoning / supports / challenges / assumptions / unknowns / confidence / sources / follow-up |
| **FE** | Composer 10–2,000 chars, Enter/Shift+Enter, `aria-live` announcement |
| **FE** | Idempotency across 200 / 202 / 503 / 409 / 429; `sessionStorage` attempt envelope with the original key and byte-identical body; never mint a replacement key |
| **FE** | Quota display from backend counts only; 40-turn thread limit text including FAILED and PENDING turns |
| **FE** | Never claim the AI proves a counterfactual; no numerical counterfactual probabilities |
| **BE** | D7 — all What-if endpoints are 501 stubs |
| **BE** | D1 — `message` length limits are backend-only, not in Appendix A |
| **SECRET** | Remote model credentials. **Without them CT-11 is BLOCKED, never PASS** — a scripted `DEMO_AI` reply does not satisfy it |
| **JOINT** | CT-14, CT-21, CT-22 |

## FE-10 — conformance and release QA · G5

Status: **not started.** Depends on everything above.

| | Remaining |
|---|---|
| **FE** | Generated types from a conforming `/openapi.json`, drift rejected in CI |
| **FE** | Remove temporary MSW-only types; no `any` casts |
| **FE** | Responsive 360px/desktop, keyboard, alt text, reduced motion, tile-outage checks |
| **FE** | Provenance audit: only `DEMO_SYNTHETIC` / `DEMO_AI` where correct, real missing data null |
| **JOINT** | All 22 CT scenarios, full error catalogue (401, 403, 404, 409, 422, 429, 502, 503) |
| **JOINT** | Baseline reset: old cookies 401, private caches cleared, re-login prompt |
| **JOINT** | `baseline → upcoming_live → upcoming_finished` state parity across Journey, Map, Impact |
| **JOINT** | Playwright against the real API; record commands and PASS/FAIL/BLOCKED |

---

## Suggested order

1. **Backend fixes B1, B2, D5** — B1 alone unblocks every signed-in path
2. **Backend answers G1–G9 / D1–D4 / Q1 / Q3** → freeze FE-00 → joint **G0**
3. **FE-04** then **FE-05** — both buildable now against demo fixtures
4. **FE-02 completion** once B1 lands, then joint **G1**
5. **FE-06, FE-07** → **G2** (needs the BE-03 credential handoff)
6. **FE-08** → **G3**; **FE-09** → **G4** (CT-11 BLOCKED without model credentials)
7. **FE-10** → **G5**

FE-04 and FE-05 are the only substantial screens with no backend dependency for
*building*, so they are the useful work while the backend items are open.
