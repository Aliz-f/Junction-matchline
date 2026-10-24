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

Status: **done**, except the two items below. Auth is now wired end to end: real
login and register forms, header session controls with sign-out, validated
return-to paths, and cache eviction on identity change.

| | Remaining |
|---|---|
| **FE** | Expand MSW handlers to every endpoint the pages now use. The demo route handlers were extended instead, so `mocks/handlers.ts` is still the FE-00 frozen set |
| **FE** | FE-G0.4 `openapi-typescript` codegen to replace the hand-maintained `lib/api/types.ts`, failing CI on drift. Blocked on a conforming backend `/openapi.json` (D1–D4) |
| **BE** | **B1** — the forms are real but no session can be established until authenticated requests work. Every submit currently ends at the backend's 500 or demo mode's 401 |
| **SECRET** | BE-03 FREE and PREMIUM credentials, out of band, for G2 |
| **JOINT** | Real browser cookie + Origin test through the proxy (register 201 / login 200 / logout 204 / guest 200); CT-08 and CT-12 across PREMIUM → FREE → guest switches |

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
| **BE** | **G10 (new): all three manifest venues are within 14 km of each other in London**, including one named "North East Demo Ground" at 51.60, -0.07. The names imply national spread; the coordinates do not. The map renders correctly but shows three markers clustered in London rather than across England. Not a frontend bug — the coordinates are `coord_verified: true` — but it makes the map demo misleading |
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

Status: **structure and sync logic done**, message content blocked.

The change-feed reducer (`lib/rooms/sync.ts`) is complete and heavily tested as
a pure function — cursor advancement on all-REMOVE pages, idempotent duplicate
REMOVEs, removals surviving backward pagination, reinstatement by a newer
UPSERT, stable order for equal timestamps, and the empty-room → 45-message
burst. Demo rooms are empty, so none of it has run against real messages.

| | Remaining |
|---|---|
| **BE** | **G9 is the blocker for content.** The burst fixtures give a UUID5 namespace but no name template, body, author or timestamp step, so neither side can generate identical messages. Demo rooms are empty rather than invented |
| **BE** | **G5** — `RoomSummary.title` is required by Appendix A but absent from the manifest. Demo mode derives a label from `kind`; the real title is still owed |
| **BE** | **G6** — no hidden `POST_MATCH` template exists, so the "hidden template 404s everywhere" path has no real fixture behind it (the uniform-404 handler is in place and tested against unknown ids) |
| **BE** | D7 — every room endpoint is a 501 stub |
| **FE** | Premium create-room form. Demo mode has no session, so `can_create` is always false and the form has no reachable state; the FREE explanation and `/premium` link are in place |
| **FE** | Scroll preservation when prepending older pages |
| **FE** | Author badges render from `AuthorPublic.public_badges`, but no demo message has an author |
| **SECRET** | BE-03 FREE and PREMIUM credentials — G2 cannot pass without them |
| **JOINT** | CT-08, CT-12, CT-16, CT-17, CT-19 against the real backend |

## FE-08 — predictions, badges, profile · G3

Status: **form, validation and idempotency done**; no reachable success path
without a session.

| | Remaining |
|---|---|
| **BE** | **B1** — until authenticated requests work there is no session, so every private path ends at the sign-in prompt. Demo mode correctly returns 401 for all of them |
| **BE** | D7 — all prediction, badge, profile and leaderboard endpoints are 501 stubs |
| **BE** | Per-match scored prediction histories. The manifest has baseline counts (PREMIUM 5/3, FREE 4/2) but no per-match records, so badge boundaries cannot be verified |
| **FE** | Leaderboard component — the hook exists, the UI does not |
| **FE** | Settled-prediction display (+3 / +2 breakdown, VOID) is implemented but unexercised: no demo prediction can exist to settle |
| **FE** | History pagination — the first page is rendered, `next_cursor` is not followed yet |
| **JOINT** | CT-18 against the real backend; 201 vs 200 vs 409 on the key/body matrix; FREE badge 4/2 → 5/3 on settlement and back on baseline reset |

The prediction `Idempotency-Key` attempt is held in memory, not persisted: a
prediction is cheap to re-enter and a stale key surviving a reload could collide
with a record the user can no longer see. FE-09's What-if turns are different
and DO persist an attempt envelope, because re-sending costs a model call and a
quota slot.

## FE-09 — private What-if AI · G4

Status: **attempt handling, turn accounting, evidence joining and the full chat
UI done**; no reachable success path without a session.

The two modules that stop double charging and fabricated citations are complete
and tested as pure logic: `lib/whatif/attempt.ts` (sessionStorage envelope,
per-user and per-thread, with the superseded rule) and `lib/whatif/turns.ts`
(40-turn lifetime accounting, completed-pairs context, ref joining scoped to one
message).

| | Remaining |
|---|---|
| **BE** | **B1**, then D7 — every What-if endpoint is a 501 stub, so no thread can exist |
| **BE** | D1 — `message` length limits (10/2000) are backend-only, not in Appendix A. The composer enforces them; the contract does not state them |
| **SECRET** | **Remote model credentials.** Without them **CT-11 is BLOCKED, never PASS** — a scripted `DEMO_AI` reply does not satisfy the real-model acceptance test |
| **FE** | Thread creation (`POST /matches/{id}/whatif/threads`) — the selector lists threads and opens them, but the create control has no reachable state while every call 401s |
| **FE** | Scroll and focus management in a populated thread |
| **FE** | 202 PENDING polling is implemented but unexercised: no demo turn can be pending |
| **JOINT** | CT-14, CT-21, CT-22; the 200/202/503/409/429 matrix; no-double-charge on a released FAILED retry |

Demo mode serves no What-if data at all — it returns 401 for every thread
endpoint, which is the contract-correct answer for a guest.

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
