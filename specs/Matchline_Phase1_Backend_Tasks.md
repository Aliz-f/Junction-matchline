# MATCHLINE — Phase 1 Backend Tasks (Codex Execution Board)

**ID:** ML-BE-TASKS-P1  
**Version:** 2.4 · 24 October 2026  
**Owner:** Backend Codex agent  
**Specification:** `specs/Matchline_Phase1_Backend_Codex_Spec.md` (v2.4)  
**Cross-check:** `specs/Matchline_Phase1_Frontend_Codex_Spec.md` (v2.4)  
**Normative source of truth throughout:** *Appendix A v2.4* (identical in both specs); generated FastAPI `/openapi.json` MUST conform to it before frontend type generation.  
**Scope:** Phase 1 only; Phase 2 deferred. **Ownership exception:** backend agent also owns root `docker-compose.yml` and `README.md`; never edits `frontend/**`.

> **Execution contract:** Implement only this backend workstream. Never edit `frontend/` files, never change Appendix A alone, and never claim a task complete without its tests/gates. The user↔AI What-if conversation is not the public room service. Every match is keyed by the same internal UUID across Journey, Map, Impact, rooms, predictions and What-if. `DEMO_SYNTHETIC` data and `DEMO_AI` text must always be clearly marked. The backend must work without sports/AI credentials.

## BE-00 — Pre-G0 minimal contract/bootstrap (mandatory; BEFORE gate freeze)

**Dependencies:** None beyond reading all four documents. **Parallel:** FE-00 may set up its shell; FE-00 must import/copy the final BE-00 manifest before G0. **Ownership:** backend agent owns `backend/**`, root `docker-compose.yml`/`README.md` when needed.

- [ ] Create a minimal importable FastAPI app/Pydantic v2 schema module from **exact Appendix A v2.4** and a script exporting expected `backend/contracts/openapi.expected.json` (handler bodies can be stubs; route names/requests/response shapes cannot).
- [ ] Create `backend/app/seed/demo_manifest.json` at **this stage** with the A4 UUIDs, kickoff/matchday consistency, remaining venue/team/room/snapshot/event/user IDs, synthetic facts, verified provenance, **five additional historical FINISHED fixtures**, FREE baseline 4 scored/2 correct + pending winning prediction and PREMIUM baseline 5 scored/3 correct. Freeze expected post-settlement FREE bronze status. Include `match_upcoming` on 2026-11-01 in matchday 11 and `match_live` in matchday 10. **Before G0 sign-off, include every BE-02 seeded status/capability fixture in the authoritative **demo manifest** (not solely in the edge corpus): SCHEDULED, LIVE, HALFTIME, FINISHED, POSTPONED, CANCELLED, event-rich/event-poor FINISHED, and non-relevant other-team match; also SUSPENDED/UNKNOWN edge behavior. Freeze IDs/team-round membership, expected scores, event availability, and validation status so BE-02 never invents new fixtures.**
- [ ] Create a self-check script that validates UUID references, uniqueness of `(competition,season,matchday,team)` among non-cancelled games, status/score consistency, valid kickoff order, and a single demo clock. Validate **three complete named demo scenarios** (`baseline`, `upcoming_live`, `upcoming_finished`) with explicit status, synthetic scores, snapshot IDs and expected fixture state/impact; no computed status from clock.
- [ ] Before G0 create **`backend/tests/fixtures/contract_edge_cases.json`** with all 11 A4 cases and the G0 status/capability matrix and stable synthetic IDs, verified venue coordinate provenance, deterministic empty-room burst and older-hidden-message generation; validate referential integrity and record SHA-256 for FE-00 mirror. Keep these test-only cases outside ordinary DEMO user views.
- [ ] Handoff both immutable manifests/hashes and expected OpenAPI snapshot to frontend agent. Do not start BE-01 until BE-G0 and FE-G0 sign-off.

**Acceptance:** contract can be imported/exported without database; canonical manifest parses and passes all fixture-uniqueness checks; FE-00 receives matching UUIDs.

## 0. Parallel development protocol (both agents follow)

- [ ] **BE-G0.1** Read both specs and both task lists. Compare shared Appendix A exact content; report differences and stop if they differ.
- [ ] **BE-G0.2** Confirm hashes and G0 fixtures for **both** canonical demo manifest and shared contract-edge corpus (CT-13), including every BE-02 required status and event-rich/poor fixture in the **demo manifest** with stable IDs; reject independent FE fixture fabrication. Confirm monorepo layout, directory ownership (`backend/**`, root `docker-compose.yml`, and root `README.md` owned by backend agent; `frontend/**` and frontend README owned by frontend agent), primary API `/api/v1`, same-origin frontend proxy, local ports 3000/8000, and cookie/Origin rules.
- [ ] **BE-G0.3** Inspect pre-G0 **BE-00** Pydantic/expected OpenAPI artifact and signed seed manifest; verify shared fields/enums rather than trying to create them after the gate.
- [ ] **BE-G0.4** Freeze BE-00 expected OpenAPI snapshot; after feature implementation re-export final `/openapi.json` and require schema conformity. Coordinate a four-file PR for any breaking change.
- [ ] **BE-G0.5** Validate the BE-00 authoritative seed manifest: fixture IDs/teams/rounds/times (no team twice per matchday), clock, events, standings, verified venues, accounts and expected results; share an unchanged copy with FE-00.

**G0 deliverables (already bootstrapped by BE-00):** schemas, initial expected OpenAPI, seed manifest, error catalog, command to regenerate OpenAPI, and signed shared version. **Do not start independent API renaming after this gate.**

## BE-01 — Foundation, configuration and contract shell (P0)

**Dependencies:** BE-00 plus signed BE-G0 and FE-G0. **Unblocks:** FE-02 integration, BE-02/03. **Suggested ownership:** `backend/pyproject.toml`, `backend/app/main.py`, `backend/app/core/**`, `backend/app/schemas/**`, `backend/Dockerfile`, root `docker-compose.yml`, root `README.md`, backend test config. No frontend root-file edits.

- [ ] Exact auth contract: register 201 `{user}`, login 200 `{user}`, logout 204 no JSON body, anonymous `GET /auth/me` 200 `{user:null}`; Origin validation includes login/register; test 403 CSRF_ORIGIN_INVALID on missing/mismatched Origin.
- [ ] Generate OpenAPI that conforms to **frozen** Appendix A v2.4; never redefine the frontend contract by codegen alone.
- [ ] Scaffold FastAPI with Pydantic v2, Python 3.12+, SQLAlchemy async, Alembic and test harness; pin versions in dependency lockfile.
- [ ] Add `APP_ENV`, Postgres DSN, provider mode, AI adapter, demo flag, allowed origins, session/quota env placeholders; no credential defaults other than clearly local development examples.
- [ ] Provide Docker Compose Postgres + API and documented local startup; no Redis/WebSockets required.
- [ ] Mount all routes under `/api/v1` and implement `GET /api/v1/health`; optional root `/health` infra alias and standard `/docs` + `/openapi.json`.
- [ ] Implement standard `{error:{code,message,details,request_id}}` handler with HTTP status mapping, request IDs, logging redaction, and schema tests.
- [ ] Implement `/api/v1/meta` with mode, `server_now_utc`, `demo_clock_frozen`, feature flags (`whatif_sharing`, `events`, `live_updates`) and default competition; flags must reflect *working* features, not wishlist items.
- [ ] Phase 1 remote AI credentials are supplied only in backend env; add test-only configured remote adapter diagnostics (`AI_PROVIDER=remote`, model/base URL/key) that never leak values to `/meta` or JS. Offline mocks alone do not satisfy G4 acceptance.
- [ ] Configure exact-origin CORS and strict Origin checks for register/login/logout and cookie-authenticated mutations (account for internal CLI/tests separately). Never rely on CORS as CSRF protection.
- [ ] Add lint, formatting, mypy (if practical), unit/integration commands and CI job instructions.
- [ ] Include sample JSON responses from Appendix A in contract tests; reject missing/null-field shape drift.

**Acceptance tests:** `/api/v1/health` returns 200; errors match canonical envelope; `/meta` truthful; strict origin policy exercised; imported application has no side-effect sync; `/openapi.json` valid; environment without secrets starts in demo mode.

## BE-02 — Database, normalized provider abstraction, demo seed (P0)

- [ ] Add append-only `moderation_actions` table/migration (`id`, `message_id`, operator identifier, action, reason, created_at) for the guarded backend-only moderation CLI; demo baseline reset restores synthetic audit state. No public moderation mutation route is included in Appendix A.

**Dependencies:** BE-01. **Unblocks:** FE-02/03/04/05 mocks -> integration; BE-04/05/06/07/08.

- [ ] Define Pydantic input schemas and database CHECK constraints for prediction outcome/score pairs: both scores null OR both nonnegative integers with direction matching HOME/DRAW/AWAY. At BE-02 test model/schema/DB integrity **only**; do not require the BE-07 HTTP mutation route, HTTP 422 responses, or CT-18 before BE-07 exists. Reserve invalid-request side-effect/idempotency assertions for BE-07 (G3).
- [ ] Persist `prediction_revisions` (first creation + meaningful edits) **and** `prediction_requests` (all keys, including same-body no-ops) with immutable first `created_at`, latest accepted meaningful-edit `submitted_at`, request-body hashes and cached response statuses; revision/replay audit tests.
- [ ] Persist an `app_runtime_state` singleton (`demo_clock_utc`, `demo_epoch`, `scenario_name`, `scenario_revision`, `updated_at`), read it in `/meta` on each request; `DEMO_CLOCK_ISO` is only the initial seed fallback, NOT a process-global mutable clock. Scenario CLI locks this row and updates it atomically across processes with all fixture changes. Add `meta.demo_epoch` and `meta.scenario_revision` response fields; test concurrent worker visibility.
- [ ] Use persisted `app_runtime_state.demo_clock_utc` as authoritative DEMO time (initially seeded from `DEMO_CLOCK_ISO`); the clock is **not** a match-status trigger; expose `/meta`; implement protected CLI `python -m app.jobs.demo_transition --scenario baseline|upcoming_live|upcoming_finished` applying manifest status + explicit score/events + standings snapshots + demo time atomically. At BE-02, implement the scenario CLI, **room-template activation** and settlement hooks/interfaces; fixture FINISHED **prediction settlement behavior is implemented/tested in BE-07**. Before BE-07 exists, test manifest-driven fixture/score/standings/clock transitions and hook invocation with a stub; never claim settlement has passed at BE-02. Seed/reset and command reruns deterministic; no public mutator.
- [ ] Add transactional per-room change-sequence persistence and message-change log schema (`room_change_events`) without stored message body; BE-06 implements its endpoints. `RoomMessagesPage.sync_after_seq` is derived from the same consistent snapshot as initial visible messages, not a separate out-of-band request.
- [ ] Implement `baseline` as **destructive, atomic restoration of ALL isolated DEMO state**: fixtures, events, standings, seeded rooms/messages, predictions/revisions/requests, badges, AI threads/messages/requests/quota, reports, and demo sessions/users; invalidate sessions and require frontend re-login. Reset only under `APP_ENV=development|test` AND `SPORTS_PROVIDER=demo`; refuse LIVE/production. Coordinate a reset epoch bump; unfinished old AI worker results cannot commit. `upcoming_live` and `upcoming_finished` are targeted incremental, repeatable scenario transitions, not baseline resets. At BE-02, test baseline restoration of **seeded records, relationships, users/sessions, clock, revision and schema constraints**, including tables reserved for later slices; the **actual post-settlement/earned-badge reset test belongs to BE-07**, and **full reset after a private AI exchange/quota belongs to BE-08/BE-09**. No premature claim that later services already exist.
- [ ] Use and validate the **already committed BE-00** canonical seed manifest with real UUIDs from A4, verified venue provenance and expected match/standings results; never regenerate a different manifest after G0.
- [ ] Implement competitions/seasons/teams/competition membership, venues and **season_team_home_venues verified home-team associations**, matches, match events, standings snapshots, users/sessions, rooms/messages, predictions/badges, reports, What-if threads/messages/idempotency requests (incl. `reservation_active`), provider sync audit records.
- [ ] Use stable UUID PKs, `(provider,provider_id)` uniqueness, indexed foreign keys, UTC timestamps, appropriate check constraints and explicit soft-hide behavior for public/shared content.
- [ ] Create Alembic migrations with upgrade/downgrade tests using real test PostgreSQL.
- [ ] Define `SportsDataProvider` with capability flags (`has_events`, `has_lineups`, `has_player_stats`), normalization and explicit missing-data errors.
- [ ] Seed deterministic *synthetic match outcomes and events* for an English Premier League season with at least: SCHEDULED, LIVE, HALFTIME, FINISHED, POSTPONED, CANCELLED, event-rich FINISHED, event-poor FINISHED, and non-relevant other-team fixture.
- [ ] Curate a **verified/attribution-safe** set of England venue coordinates **and season-specific home-team/venue provenance**. Set `coord_verified=true` only with source evidence; only advertise `home_team_ids` when verified. Preserve `unmapped_matches` examples and a no-fixture favorite stadium; a shared venue can have multiple home teams. Synthetic matches at actual venues still get `DEMO_SYNTHETIC` labels.
- [ ] Fix seeded demo clock and fixture IDs for repeatable cutoff, impact, same-UUID and E2E tests. Commit ≥5 additional synthetic **completed historical fixture records** with distinct UUIDs and legally valid matchday/team participation; demo PREMIUM profile starts with ≥5 SCORED predictions and ≥3 correct (active `PREDICTOR_BRONZE`), demo FREE profile starts with 4 SCORED and 2 correct and has an upcoming prediction whose known correct settlement brings it to 3/5 and earns the badge. Specify exact predictions/scores and expected before/after badge states in manifest; include them in baseline reset. Seed FREE/PREMIUM test accounts by protected CLI and known safe synthetic data; do not expose premium-upgrade API.
- [ ] Implement public `GET /competitions`, `GET /teams?competition=PL`, `GET /competitions/PL/matchdays?season=...`, and normalized `GET /matches`/`GET /matches/{id}` response.
- [ ] Expose details `events`, `statistics|null`, `data_capabilities`, source stale/version; do not invent unavailable subs, players or stat lines.

**Acceptance tests (BE-02 only):** run baseline → upcoming_live → upcoming_finished CLI scenarios for **fixture status, scores, events, standings snapshots and clock only**, asserting no settlement/badge/AI functionality before BE-07/08; ensure no fixture promotion from clock alone; reject two active fixtures for one team in same Premier League matchday, and accept Spurs in MD10 and MD11 on separate dates; idempotent seeding; correct status mapping; verified coords filter; no inconsistent result/status; `/teams` sorted; list pagination correct; fixture IDs match manifest; no actual-game claims; migrations from empty DB work.

## BE-03 — Sessions, favorite team, profile read (P0)

**Dependencies:** BE-01/02. **Unblocks:** FE-02, FE-08 Profile, BE-06/07/08.

- [ ] **Pre-G2 FREE/PREMIUM demo-account handoff (BE-03 owns, not BE-09):** Provide a protected seed CLI that creates/reset-validates one FREE and one PREMIUM local DEMO login from `MATCHLINE_DEMO_FREE_EMAIL`, `MATCHLINE_DEMO_FREE_PASSWORD`, `MATCHLINE_DEMO_PREMIUM_EMAIL`, `MATCHLINE_DEMO_PREMIUM_PASSWORD` supplied through gitignored backend local config or test-runner secrets. Never commit credentials, put passwords in shared JSON/Markdown, `NEXT_PUBLIC_*`, frontend bundles, or stdout logs. Supply an out-of-band local-only credential handoff and tested login commands to the frontend agent **before G2**, ideally at G1. FE-07 must sign in with both real roles and test FREE posting / PREMIUM room creation before G2 can pass. Record role/account identifiers and handoff completion without secret values; expire/rotate on reset. BE-09 merely verifies/updates this existing handoff.
- [ ] `POST /auth/register` returns **201 `{user:UserPublic}`**, `POST /auth/login` **200 `{user:UserPublic}`**, `POST /auth/logout` **204 empty body**, and `GET /auth/me` **200 `{user:UserPublic|null}`**. Reject invalid/missing Origin for register/login/logout and authenticated mutations.
- [ ] Argon2id hashes, random opaque HttpOnly cookie token, database SHA-256 session token hash, expiry and revocation, rate limit, SameSite=Lax, prod Secure.
- [ ] **Authenticated favorite precedence:** server `favorite_team_id` (including null) always wins; no `localStorage` input is trusted or implicitly imported. `PUT /users/me/favorite-team` persists a user-initiated choice only; test login with stale guest favorite, explicit consented import, decline/no import, and logout/account switch.
- [ ] `PUT /users/me/favorite-team` validates team membership in `default_season_start_year` field from `GET /meta` (2026) Premier League; `/teams?competition=PL` lists that same membership. Saves one team and never resets history.
- [ ] `GET /users/me/profile` returns canonical direct `UserProfile` including counts and badges; authentication required. `/meta` supplies fixed PL season start year 2026 for favorite selection.
- [ ] **Private HTTP cache policy CT-12:** `GET /auth/me`, `/users/me/profile` and all own-profile/auth GET/POST/PUT responses (including errors and Set-Cookie/clear-cookie) send `Cache-Control: private, no-store` and `Vary: Cookie`; Next.js proxy preserves headers and never caches these responses across sessions. Test guest→FREE→PREMIUM→logout and 401/403 paths.
- [ ] Ensure guest can call read endpoints without a cookie, cannot mutate personal state or view another profile.
- [ ] Verify browser `Origin` against allowlist on writes, and appropriate cookie behavior through same-origin proxy.

**Acceptance tests:** guest `{user:null}`, registration/login/logout, persistent favorite across sessions, origin attacks rejected, user cannot edit another user's preference, login role comes from DB not request payload.

## BE-04 — Journey and stadium map (P0)

**Dependencies:** BE-02; auth preference optional. **Unblocks:** FE-03/04/05 (Journey, match, map).

- [ ] Map response `StadiumFixture={match:MatchSummary}`, including teams/competition/venue/source; `UnmappedMatch={match:MatchSummary,reason}`; ensure all season venues included and zero-fixture venues INACTIVE.
- [ ] Match detail `MatchEvent` + nullable capabilities follow A3 (no guessed substitutions or per-marker N+1 fetch requirement).
- [ ] `GET /journey?team_id=UUID&season=YYYY` returns chronological `MatchSummary` items + team/season; supports empty valid team response and validates invalid team.
- [ ] MatchSummary includes competition `{code,brand_key}`, independent status, opponent/team names, kickoff UTC, score null when unknown, features, venue and source.
- [ ] `/map/stadiums?competition=PL&season=...&matchday=N` or `date=YYYY-MM-DD`: require exactly one filter and reject both; `date` is in **Europe/London** using DST-safe boundaries.
- [ ] Return all known venues with `LIVE/UPCOMING_ROUND/COMPLETED/INACTIVE/POSTPONED_OR_CANCELLED/UNKNOWN`, per-venue fixtures array, `unmapped_matches` with reason, source stale/provenance. No invented `map_visible` field; derive plotted/list-only state exclusively from `stadiums` versus `unmapped_matches`.
- [ ] Merge multiple matches at one venue without losing individual match IDs; include **sorted season-verified `home_team_ids` even when venue has no selected fixture**; shared stadium associations supported. Status selection prioritizes LIVE over scheduled but does not alter per-fixture state.
- [ ] Make inactive venues non-actionable by response semantics; do not reassign fake coordinates or label scheduled game live.

**Acceptance tests:** one match's UUID identical in Journey, Map, Match details; wrong/missing coords in unmapped list; DST date boundary; overlapping venues; finished historical round; selected future round NOT live; explicit `demo_transition` CLI transitions deterministically change statuses and persisted clock together; changing clock alone NEVER changes match status.

- [ ] Explicit map tests: SCHEDULED kickoff after `/meta.server_now_utc` => UPCOMING_ROUND; overdue SCHEDULED => UNKNOWN/unconfirmed; multi-fixture venue chooses precedence; browser wall time never influences this value.

- [ ] **BE-04 additional mandatory map tests:** union verified selected neutral venues with season home venues; `home_team_ids=[]` on neutral venue is legal; ensure a favorite AWAY fixture can be identified via embedded teams; each selected FINISHED fixture is navigable independently of aggregate venue illumination (`CT-03`–`CT-05`).

## BE-05 — Standings and impact engine (P0)

- [ ] **Contract reconciliation:** LOW relevance is exactly 7–9 pre-match points away; NONE is >=10, not >6. FINISHED matches with verified pre/post standings return three scenario outcomes: one CONFIRMED actual + two HYPOTHETICAL alternatives from the same pre-match baseline. When standings are unavailable, scenarios are empty and a separately verified final result still populates `actual_outcome`. `GapEffect.position_change` always denotes the favorite team’s rank improvement. The public `/standings` endpoint returns current/latest standings only; historical Impact must carry historical provenance and caveats. Test all boundaries, own-team case and latest-vs-historical labeling data.

**Dependencies:** BE-02/04. **Unblocks:** FE-06 Impact page and map overlays (G2).

- [ ] Every `ImpactInsight` embeds `match:MatchSummary`; each scenario contains `effects:GapEffect[]` for both opponents, includes actual/hypothetical distinction, snapshots and signed gap semantics.
- [ ] Implement `GET /standings?competition=PL&season=YYYY` with snapshot metadata, validated table rows and stale status.
- [ ] Implement deterministic 3/1/0 football rule module and standings tiebreak awareness; keep undefined positions null rather than fabricate goal-difference outcomes.
- [ ] `GET /matches/{id}/impact?favorite_team_id=UUID` returns `ImpactInsight` (A3); include `NONE`/`UNKNOWN` states, own-team and other-team scenarios, source refs and authoritative pre-match snapshot. Tests enforce own-team one opponent GapEffect, other-team two, and no fabricated rank under tiebreak ties.
- [ ] Compute `gap_before = favorite_points − affected_team_points`, `gap_delta = gap_after − gap_before` **for each affected rival independently**; negative = adverse for favorite.
- [ ] Create HOME/DRAW/AWAY scenarios for upcoming **other-team AND favorite-team** matches, label `is_hypothetical=true`, distinguish verified completed result effects, use the **pre-match** snapshot for thresholds; for favorite-team fixture use a single `GapEffect` against its opponent and update BOTH favorite and opponent points. Own matches are excluded from `/impact/relevant` but supported by `/matches/{id}/impact`.
- [ ] Implement `GET /impact/relevant?favorite_team_id=...&competition=PL&season=...&matchday=...` **or `date=YYYY-MM-DD`** (or neither full season), rejecting both 422. Use **the same Europe/London date/DST predicate as map**; include HIGH/MEDIUM/LOW and **UNKNOWN as neutral unresolved** with basis INSUFFICIENT_DATA, no scenarios, caveat; exclude NONE and favorite-team fixtures. Maintain selection-bound stable pagination and ordering.
- [ ] Assign relevance deterministically: on an own-team fixture `HIGH` if standings permit, else UNKNOWN; for other-team fixtures compute minimum of absolute *pre-match* points gap to the two participants (`<=3 HIGH`, `4..6 MEDIUM`, `7..9 LOW`, `>=10 NONE`). When both qualify choose smallest gap, keep BOTH individual GapEffects, then break equal distances by team UUID if choosing a primary for copy. Insufficient trusted standings => UNKNOWN, not NONE.
- [ ] Generate clear template explanations as guaranteed fallback; optional AI reformulation may *only* use calculated input and must pass numeric/name verification before display.
- [ ] Explicitly handle stale/incomplete/absent standings with `UNKNOWN`, `basis=INSUFFICIENT_DATA`, empty scenarios, nonempty caveat; do not claim UNKNOWN as important or certainty about rank from points-only hypothetical result. Provide deterministic inputs for FE-06 Phase 1 lightweight recommendations (next team match + HIGH/MEDIUM/LOW only).

**Acceptance tests:** favorite 5 ahead and opponent win causes delta -3; draw -1; ties with unresolved goal difference => null position; minimum pre-match distance >=10 => NONE even if the gap still changes; missing snapshot => UNKNOWN (verified final score may still set actual_outcome); correct hypothetical vs confirmed; no arithmetic performed by AI.

- [ ] **CT-02 Map/Impact subset semantics:** Map and Impact use identical Europe/London date/matchday *candidate selection*, but Map contains all selected fixture IDs across `stadiums[].fixtures` and `unmapped_matches`, whereas Impact excludes favorite-team and `NONE` matches and includes UNKNOWN unresolved. Test every Impact match is a Map-selected match with matching team IDs/kickoff/status, not equality of both result sets. Include BST/GMT boundaries and explicit matchday selection.
- [ ] Add cross-page Impact integration tests for **matchday/date selection parity with Map (incl. DST)**, UNKNOWN inclusion vs NONE exclusion, stable cursor snapshot/filter binding and stale/cross-filter cursor 422; provide `limit=100` corpus, same-season selection and relevant-only overlays.

- [ ] **BE-05 contract tests CT-06/CT-07:** `NONE` (10+ points distance) is below recommendation threshold yet may retain nonzero `GapEffect`; FINISHED verified score sets `actual_outcome` even when historical standings are unavailable (`UNKNOWN`, `scenarios=[]`, `basis=INSUFFICIENT_DATA`); unverified score -> null. Do not call no-recommendation “no calculable impact.”

## Phase 1 v2.4 — additional binding backend tasks (all required)

**BE-06 / G2 CT-19, CT-20:** Keep full persistent, body-free per-room UPSERT/REMOVE change history with zero pruning and non-reused sequence numbers until DEMO baseline reset; test replay from `after_seq=0` after DB/API restart, no hidden-content leakage, and session/epoch invalidation on reset. Expose authoritative `GET /rooms/{id}` metadata so a clock-only kickoff makes `status=READ_ONLY` and `can_post=false` despite unchanged match status and no message event; always reject stale posts with 409.


## BE-06 — Community, permissions, moderation (P0)

- [ ] Seeded POST_MATCH templates remain HIDDEN (not in lists; hidden UUID returns identical 404 on `GET /rooms/{id}`, `GET /rooms/{id}/messages`, `GET /rooms/{id}/changes`, and `POST /rooms/{id}/messages`; post_match_room=false) until verified FINISHED; seeded already-FINISHED fixtures start with OPEN post-match rooms; publication to OPEN for newly completed fixtures is atomic with match transition; only then may PREMIUM create an additional POST_MATCH room. PRE_MATCH archives remain discoverable READ_ONLY after cutoff. Tests for discoverability vs write permissions across phases.

- [ ] **G2 CT-19 stable historical redaction:** preserve stored event rows and their original room-scoped `seq` when projecting hidden historical UPSERTs to content-free REMOVE; page by underlying stored rows (limit before projection), maintain original `next_after_seq`/`has_more` semantics, and tolerate later genuine REMOVE events without duplicate UI effects. Test restart, all-hidden full pages, seq=0 replay, multi-page catch-up, and reset/epoch invalidation.
- [ ] **Authoritative room change feed CT-08/CT-16:** Return `RoomMessagesPage.sync_after_seq` atomically with initial visible window and add `GET /rooms/{id}/changes?after_seq=N` delivering ordered UPSERT/REMOVE events (limit, `has_more`, `next_after_seq`), including an empty initial room. Always resolve current visibility before emitting UPSERT so historical changes cannot leak hidden text; moderation HIDDEN appends a body-free REMOVE and removes every cached historical ID. Run 45+ message empty-room burst and 120+ message old-hide tests using shared edge corpus.
- [ ] **Effective PRE_MATCH status CT-17:** compute public READ_ONLY and `can_post=false` when current persisted DEMO clock is at/past kickoff even if fixture remains SCHEDULED; enforce same predicate transactionally on posting 409, never change match status from clock alone.
- [ ] **Bidirectional room-message contract CT-08:** implement initial latest N, opaque older `cursor`, and forward `after_id` (earliest N strictly after anchored `(created_at,id)`); mutually exclusive params. Forward `next_cursor=null`, caller continues by last ID. A hidden anchor remains resolvable by stored sort key; no visible HIDDEN rows, public message count excludes them, FLAGGED stays visible. Integration test 45+ messages with `limit=20` between polls, equal timestamps, unknown/wrong-room anchor 422, and deletion/moderation catch-up without gaps.

**Dependencies:** BE-02/03/04. **Unblocks:** FE-07 Community (G2).

- [ ] **Room-feed cache-control CT-08/CT-12:** All `GET /rooms/{id}/messages` and `GET /rooms/{id}/changes` (200 and error/hidden-parent 404) send `Cache-Control: private, no-store` and `Vary: Cookie` through the Next.js proxy. Moderation CLI hides a previously cached post; confirm no proxy/CDN stale body or author metadata and safe REMOVE replay. No undocumented moderation API route.
- [ ] **Contextual permission caching CT-08:** For all GET responses with `RoomSummary` including `/rooms`, `/matches/{id}/rooms`, `/rooms/{id}`, send `Cache-Control: private, no-store` and `Vary: Cookie`; never allow proxy/CDN cache to reuse permission flags across users. Compute `can_post` and `can_create` from each current session/plan/status. Test PREMIUM → FREE → guest transitions, plan changes and write enforcement.
- [ ] Implement `GET /rooms/{id}` returning `RoomSummary` for direct links; align room lists/detail with `match` fields and `can_post/can_create` contextual authorization.
- [ ] `GET /matches/{id}/rooms` and global `GET /rooms?competition=PL` with pagination and `RoomSummary` including related MatchSummary.
- [ ] Seed at least one PRE_MATCH and one POST_MATCH system-created room so FREE users can join without a premium creator; keep POST_MATCH locked until FINISHED.
- [ ] `POST /matches/{id}/rooms` restricted to PREMIUM/EDITOR and rate-limited; PRE_MATCH creation requires SCHEDULED plus authoritative server time strictly < kickoff, POST_MATCH creation requires verified FINISHED. Reject phase/cutoff mismatch with 409 `ROOM_CLOSED` regardless of SCHEDULED clock-only status; FREE gets `PREMIUM_REQUIRED` 403. Contextual `can_create` describes creating a NEW room of the SAME kind now. Test before/at/after kickoff and unverified FINISHED, with backend checks inside a transaction.
- [ ] `GET /rooms/{id}/messages` and `GET /rooms/{id}/changes` remain public ONLY for discoverable parent rooms; hidden/unactivated room UUID must return 404 `NOT_FOUND` on detail, messages, changes and message POST before evaluating any cursor, message or permission state. `POST /rooms/{id}/messages` permits logged-in FREE/PREMIUM only when OPEN; pre-match write cutoff = earlier of official live state and UTC kickoff. Test authenticated random unknown UUID vs hidden UUID with the same 404 envelope and no room metadata leaks; unauthenticated message POST returns 401 regardless of room existence.
- [ ] Validate/sanitize messages, escape public content, rate limit, basic abuse flagging and `POST /reports`. Implement **only** the guarded backend CLI `python -m app.jobs.moderate_room_message --message-id <UUID> --action hide --reason "<reason>"` in a privileged backend environment (`MATCHLINE_MODERATION_CLI_ENABLED=true` and nonempty protected `MATCHLINE_MODERATION_OPERATOR`, fail closed otherwise); **do not add an editor/owner moderation HTTP route** in Phase 1. Transactionally set HIDDEN, write append-only `moderation_actions` operator/reason/audit record, append content-free room CHANGE REMOVE, and exclude message body from public pages. Test forbidden/disabled CLI, authorized hide, resulting REMOVE and unmodified endpoint catalog.
- [ ] Return author public badges and accurate `can_post`, `can_create` flags; server always enforces regardless of UI.

**Acceptance tests:** CT-08 hidden room routes uniformly return 404 and local-only demo FREE/PREMIUM logins are available by G2; CT-17 PRE_MATCH creation before/at/after cutoff returns 201/409/409, POST_MATCH creation blocked until verified FINISHED; `can_create` matches kind/time predicate. CT-16 empty first-room snapshot plus 45+ change events and old cached hidden post removal, CT-17 effective clock cutoff; FREE posts but cannot create; PREMIUM creates; guest can read but not write; pre-match locks at kickoff; post-match only FINISHED; room ID/match ID stable; report and abuse cases; paginate many messages without dropping chronology.

- [ ] **BE-06 history/legacy compatibility CT-08:** `GET /rooms/{id}/messages` keeps keyset older `next_cursor` and optional `after_id` ascending by `(created_at,id)` for existing consumers, while the **primary frontend forward-sync uses `/changes?after_seq`**, not `after_id`. Test 45+ arrivals from an empty initial snapshot, concurrent inserts, timestamp ties, old hidden-message REMOVE, HIDDEN content-safe replay, no missed/duplicate IDs, bad `after_seq` 422, and backward cursor compatibility.

## BE-07 — Structured predictions, settlement, profile history (P0)

- [ ] **BE-07 / G3 CT-18 HTTP acceptance (not BE-02):** Implement `POST /matches/{id}/predictions` schema/service validation so only both-null or both-nonnegative integer score pairs aligned to HOME/DRAW/AWAY are accepted. Invalid one-sided, fractional, negative, outcome-mismatched, and malformed fields return HTTP 422, with **no** prediction, revision, or idempotency record written. Validate atomicity with real PostgreSQL and frontend MSW at G3.

**Dependencies:** BE-02/03/04; can run in parallel with BE-06. **Unblocks:** FE-08 Predictions/Profile (G3).

- [ ] Require UUID `Idempotency-Key` for prediction POST; same key+same body replays **even after cutoff**, key+different body 409. Meaningful edit changes `submitted_at` and records revision; same-body is a no-op. **Old POST replay is an immutable historical snapshot**, so tests assert current `GET /matches/{id}/predictions/me` returns newest accepted revision (and later settled status).
- [ ] **Prediction history privacy CT-12:** `/users/me/predictions`, `/matches/{id}/predictions/me` and prediction mutations/errors use `Cache-Control: private, no-store` and `Vary: Cookie`; assert old users' predictions/replays are never visible to subsequent logins through proxy/query caches.
- [ ] Publish `PredictionHistoryItem={prediction,match}` for profile; `GET /users/me/profile` returns direct `UserProfile` (never envelope).
- [ ] `POST /matches/{id}/predictions` atomically **upserts** user's one prediction while SCHEDULED and server time < kickoff. Exact-score request fields must be both null or both nonnegative integers agreeing with HOME/DRAW/AWAY; reject one-sided, non-integer, negative, or mismatched pairs 422 with no persisted prediction/revision/idempotency row (CT-18); response `PredictionView`.
- [ ] `GET /matches/{id}/predictions/me` returns `{prediction:null|PredictionView}` and preserves submitted_at/lock semantics, as defined in Appendix A.
- [ ] Enforce cutoff inside DB transaction (client clock is informational); rescheduled fixtures do not silently re-open already locked predictions.
- [ ] Score only verified FINISHED results using +3 outcome +2 additional exact score (else 0); idempotent settlement and void handling. Allow triggered settlement on demo fixture advance via CLI.
- [ ] `GET /matches/{id}/leaderboard` with deterministic sorted ranks + user badge metadata; `GET /users/me/predictions` paginated profile history.
- [ ] `GET /users/me/badges` and profile summary: PREDICTOR_BRONZE after ≥5 SCORED, ≥60% correct among latest 20 **by `scored_at DESC, prediction.id DESC`**; never include VOID/PENDING or speculative What-if points.

**Acceptance tests:** 1 s before vs after kickoff; edit before cutoff; 409 on late post; duplicated settlement stable; exact result awarded 5; wrong result 0; badge threshold edge and history intact after favorite change.

- [ ] **BE-07 gate test:** after BE-07 implementation, run baseline → upcoming_live → upcoming_finished against the real settlement hook and assert FREE prediction 4/2→5/3, earned bronze and idempotent rerun; then baseline reset and verify prediction/score/badge state reverts, with zero orphaned revisions/requests. This test MUST NOT be claimed in BE-02.

## BE-08 — Multi-turn private user ↔ AI What-if (P0)

- [ ] **What-if privacy headers CT-12:** On user-owned thread list/detail, What-if POST/replay/202/503/409/429 and unauthorized 401/404, require `Cache-Control: private, no-store` and `Vary: Cookie`. Verify private turns never survive logout/account switching in proxy/shared caches.

**BE-08 / G4 CT-21, CT-22:** Transactionally cap each private AI thread at 40 distinct admitted USER turns and return 409 `WHATIF_THREAD_LIMIT` on new submissions after the cap with no quota charge; preserve exact-key replay, in-flight serialization and retry rules. Thread-detail GET remains unpaginated because history is bounded at 80 messages. Validate evidence refs solely against the returned typed allowlist; omit unsupported types, describe missing evidence under `unknowns`, and use HTTP 200 `INSUFFICIENT_DATA` when no reliable directional conclusion is possible. Test mixed available/unavailable sources and new unscripted remote-model two-turn analysis.

- [ ] **G4 CT-21 error catalog and 40-slot semantics:** implement `WHATIF_THREAD_LIMIT` HTTP 409 with required `details.limit` and `details.admitted_turns`, no slot or quota charge for over-limit new turns; count each distinct admitted FAILED/PENDING/COMPLETE USER turn once against lifetime 40, while only completed replies consume daily quota. Exact-key retries at the cap preserve original outcomes. Test 39→40 concurrent race, failed attempts, and 40-slot view.

- [ ] Chronology constraint: a FAILED user turn can be retried with its original key only if it is the latest USER turn in that thread; after any later accepted USER turn, old FAILED retries get 409 `WHATIF_TURN_SUPERSEDED` before quota check and no new AI response. Completed same-key replay stays 200. Build AI context from chronological completed USER+AI pairs only; do not ground AI in unanswered failed USER turns.

**Dependencies:** BE-02/03/04; event-rich and event-poor finished fixtures; may start adapter/model schemas earlier in parallel. **Unblocks:** FE-09 What-if (G4).

- [ ] Enforce What-if **200 completed / 202 pending / 503 unavailable** with exact A3 response shapes; retry SAME key and client ID/body; expose `client_message_id` in persisted USER turns for frontend reconciliation resumes failed/pending request and never duplicates USER turn.
- [ ] Resolve persisted same-key requests **before** quota/admission/status checks; COMPLETE replay returns original HTTP 200 after quota exhaustion/restart; mismatch 409. FAILED same-key retry must **reacquire a released quota slot for current retry-day** under lock, else 429; preserve same USER record/key and never rerun model if 429. Test privacy 404 for second user.
- [ ] Add only FINISHED-match creation `POST /matches/{id}/whatif/threads` and per-match owner list `GET /matches/{id}/whatif/threads`.
- [ ] Add cross-match private `GET /users/me/whatif/threads` for Profile; owner-only `GET /whatif/threads/{thread_id}` containing persisted full available turn history.
- [ ] Implement real `POST /whatif/threads/{thread_id}/messages` multi-turn flow; 10–2,000 chars; strict same-thread context, reference-safe evidence snapshot, Pydantic structured analysis, source version. Under a locked thread row enforce **at most one PENDING different-key request**: second different key returns 409 `WHATIF_THREAD_BUSY` with active-client ID/retry-after before quota or USER persistence; same-key 200/202 replay still works. Next accepted turn includes previous completed AI reply.
- [ ] Detect demonstrably false premise and classify `INVALID_PREMISE`; no supporting source => `INSUFFICIENT_DATA` and transparent uncertainty; never invent a substitution, player, event, or alternative result.
- [ ] Configure mock AI returning explicitly labelled `DEMO_AI` context-aware canned responses **AND implement the working configurable remote-model adapter as mandatory P0** with `AI_BASE_URL`, `AI_MODEL`, backend-only `AI_API_KEY`. No remote-AI credentials → G4 real-model CT-11 BLOCKED (never PASSED), but offline mock tests still run. Do not portray scripted demo as real reasoning.
- [ ] Build and emit canonical `WhatifEvidenceItem[]` (event, trusted FINAL_SCORE, match metadata, verified standings snapshot, verified player-season stat) with source versions, validation timestamps and typed details; every `supports/challenges[].evidence_refs` joins an item in the SAME AI response. Do not add source-lookup APIs or infer score at minute from final score. Test citation resolve/unresolved case CT-14.
- [ ] Validate every evidence ref against provided match source set; check claimed scores, minutes, player names, and factual event IDs; safe fallback on invalid model JSON/evidence; treat user messages/provider text as untrusted instructions.
- [ ] Implement `whatif_requests` with immutable request_hash, response snapshot/status, original acceptance, **reassignable quota_day_utc only on FAILED released retry re-admission**, `reservation_active`, lease owner/expiry, attempts/backoff and PENDING/FAILED/COMPLETE; same-key 429/retries/replays across restart never duplicate USER turn or charge twice.
- [ ] Implement designated DB-backed recovery command `python -m app.jobs.recover_whatif`: expired lease reclamation by conditional update, bounded retry/backoff, after 3 automatic attempts stop background retries, preserve FAILED state, and permit user-triggered same-key retry after cooldown or operator recovery, and exactly-once AI/response persistence under transactional ownership check.
- [ ] Enforce FREE 3/PREMIUM 30 completed turns per UTC **current reservation/charge day** (first acceptance unless FAILED reservation released then reassigned at successful same-key retry); count pending under row lock, charge once at COMPLETE, release on terminal FAILED, 429 for new requests **and failed retries unable to re-reserve**. Test A fail → B/C/D use three slots → retry A 429 same day → next day A re-reserves and completes, plus concurrency/restart/midnight.
- [ ] Return canonical `WhatifTurnResponse` and owner-protected conversation; no automatic publication or fan-fan room substitution.
- [ ] Assert `/meta.capabilities.whatif_sharing=false` for all Phase 1, no public share/revoke endpoints, no auto publication. Document Phase 2 excerpt lifecycle requiring consent + prepublication editorial approval and revocation.

**Acceptance tests:** race two different keys on same thread -> one admission, one `WHATIF_THREAD_BUSY`, only one quota slot and USER turn; at 39 admitted turns, 40th becomes PENDING and another distinct key returns BUSY, then **after** turn 40 terminal a new distinct key returns `WHATIF_THREAD_LIMIT`; existing 40th exact-key replay returns its persisted state; complete first turn then send second and verify its prompt includes the first validated AI answer; same-key retry after FAILED release cannot bypass quota; old COMPLETED replay always free; 2+ sequential questions with context retention; another user gets exactly 404 (NOT 403) to avoid information leak; invalid event corrected; event missing => insufficient data; provider timeout + retry same key yields one user turn; concurrent duplicates exactly one model/charged turn; quota boundary and UTC reset; demo/real AI label accurate; private default.

- [ ] **BE-08 gate test:** complete an AI turn and simulate failed+superseded earlier turn in the same thread (A FAILED, B COMPLETE, retry A returns 409 `WHATIF_TURN_SUPERSEDED` before quota); a different thread A remains latest and can retry subject to quota. Then invoke baseline reset after a private AI exchange and verify private threads/messages/quotas/sessions are removed/restored according to the manifest; BE-09 repeats this full-state test across both services.

- [ ] **BE-08 remote AI is mandatory for Phase 1:** build a functional model adapter configured by AI_BASE_URL/AI_MODEL/AI_API_KEY (server-side only) in addition to honest `DEMO_AI` mock; implement and run **CT-11** against an unscripted new hypothesis plus a challenging follow-up in same persistent thread. Verify allowed evidence refs, both sides of argument, uncertainty, `AI_ANALYSIS` label, no invented events; if credentials absent, report G4 **BLOCKED** and do not claim acceptance. Mock-only CT-10 is necessary but insufficient.

## BE-09 — Integration hardening and optional live provider (P0 core / P1 real feed)

- [ ] **G5 CT-12 privacy-cache matrix:** Integration-test `private, no-store` plus `Vary: Cookie` on auth, profile, badges, prediction history, prediction detail/mutations, private What-if threads/responses/errors, rooms/room message/change feeds; verify Next.js proxy never strips headers or caches private data. Test two accounts and logout/demo reset and moderation-hidden messages.

**Dependencies:** BE-00 and BE-01 to BE-08. **Unblocks:** G5 release.

- [ ] Ensure `/openapi.json` conforms to frozen Appendix A including auth payloads, map filtering, global room list, Impact feed, profile history, AI retries and 409/429 errors.
- [ ] Run complete Postgres unit/integration/contract tests; assert model and migrations match fixture data.
- [ ] Add structure logs without credentials, sessions, private AI prompts, or personal messages; add health/readiness and stale-data visibility.
- [ ] Confirm provider disconnect and AI outage leave app usable with correct source/uncertainty labels.
- [ ] Integration-test `baseline` destructive reset against active sessions/prediction history/settlement/badges/What-if messages/requests/quotas/reports; verify 401 and re-login, clean reminted demo state, app_runtime_state epoch/revision bump, no stale worker commits and new browser caches.
- [ ] Provide tested protected `demo_transition` command with **three atomic manifest-defined status/score/standings/clock scenarios**, seed/reset, settlement, demo premium accounts; clock-only injection leaves statuses unchanged. Explain how to reset seed, reject transitions for LIVE_PROVIDER.
- [ ] Publish API reference and independent FE integration quickstart: curl examples for each primary feature, headers and response fixtures; **verify** the BE-03 local-only FREE/PREMIUM credentials were already handed to FE before G2 and keep secrets exclusively in gitignored config or secure test-runner environment (no new G5-first credential handoff).
- [ ] **Optional P1 external sports feed (NOT a Phase 1 P0/G0–G5 gate):** implement football-data.org adapter and rate-aware sync *only if* football data rights and credentials are provided; otherwise leave provider feature disabled and document the limitation. The synthetic demo + PL-compatible internal schema are mandatory; the working **remote AI adapter** remains mandatory P0 independently. Never invent missing substitutions.
- [ ] Run G1–G5 with frontend agent, resolve only documented contract deviations, do not add ad-hoc aliases.

**Acceptance tests:** happy path across whole MVP; stale provider; AI outage; mismatched or expired session; 401/403/409/429; no raw secrets in logs; no synthetic result mislabelled live.

### Mandatory backend executable contract matrix

- [ ] Implement formal Appendix A6 **CT-19–CT-22 rows** at G2/G4, not merely narrative instructions; ensure the tested error catalog includes `WHATIF_THREAD_LIMIT` and pagination cursor safety.
- [ ] Implement Appendix A6 CT-01–CT-22 at their designated gates (backend pieces in `backend/tests/contract/`); record PASS/FAIL/BLOCKED and commands. G4 CT-11 requires network credentials; mock-only results never count as remote-AI acceptance.

## Parallel integration handoffs (what frontend can rely on)

| Gate | Required backend handoff | Exact frontend consumers |
|---|---|---|
| G0 | **BE-00** expected OpenAPI, authoritative manifest + validated BE-G0 | **FE-00** typed MSW shell, manifest mirror, validated FE-G0 |
| G1 | Meta, auth/me, teams, favorite, Journey, matches, demo manifest | FE-02/03/04 |
| G2 | Matchdays, venue map, standings, impact/relevant, global rooms, messages | FE-05/06/07 |
| G3 | Prediction upsert/cutoff, leaderboard, badges and prediction history (BE-07 only) | FE-08/profile **excluding private What-if list** |
| G4 | BE-08 threads, history, turn retry/idempotency, quota + labeling | FE-09 private chat AND private-thread Profile subsection |
| G5 | Final conforming OpenAPI + docker/seed/test scripts | FE full CI/E2E |

## Completion checklist — backend owner's final report

- [ ] Exact 4 spec/task Markdown filenames left unchanged; no unilateral API edits.
- [ ] All BE-00–08 P0 tasks checked, tests executed with output; BE-09 P0 hardening checked.
- [ ] `/openapi.json` exported and type generation tested by frontend agent.
- [ ] Free contribution & premium room creation demonstrated; no fake premium payment.
- [ ] What-if genuinely supports user↔AI two-turn interaction and clearly labels scripted mock vs real model.
- [ ] Deterministic football arithmetic verified without LLM; private thread ownership enforced.
- [ ] Synthetic data and missing-venue coordinates handled honestly; real API usage blocked pending rights if needed.
- [ ] Known defects and optional P1 features documented explicitly, not silently marked done.

### Paste into Codex — backend startup prompt

```text
You own backend/** plus root docker-compose.yml and root README.md only; frontend/** belongs to the other agent. Read all four specs/*.md Matchline Phase 1 files, especially the identical Appendix A and Matchline_Phase1_Backend_Tasks.md. Execute BE-00 pre-gate bootstrap, then jointly sign G0 with FE-00/FE-G0, then BE-01 and BE-02 only. Build Python/FastAPI/async SQLAlchemy/PostgreSQL/Alembic with contract-first Pydantic schemas, synthetic/demo fixture manifest, `/api/v1/health`, `/meta`, stable UUIDs, and tests. Do not modify frontend files. Do not change endpoints/DTOs unilaterally. Run migrations, unit tests and lint before reporting. Report complete/incomplete task checkboxes, commands, results, files touched, and any cross-stack handoffs. The AI What-if feature later in BE-08 MUST be a private multi-turn user↔AI debate grounded in verified match evidence; community rooms are separate. Never claim credentials/data licensing that you do not have.
```
