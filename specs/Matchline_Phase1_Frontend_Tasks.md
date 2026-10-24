# MATCHLINE — Phase 1 Frontend Tasks (Codex Execution Board)

**ID:** ML-FE-TASKS-P1  
**Version:** 2.4 · 24 October 2026  
**Owner:** Frontend Codex agent  
**Specification:** `specs/Matchline_Phase1_Frontend_Codex_Spec.md` (v2.4)  
**Cross-check:** `specs/Matchline_Phase1_Backend_Codex_Spec.md` (v2.4)  
**Shared contract:** frozen *Appendix A v2.4* in both specs remains authoritative. Conforming FastAPI `/openapi.json` is type-generated after passing a contract-diff check, never treated as a unilateral replacement.  
**Scope:** Phase 1 only; Phase 2 deferred. Frontend owns `frontend/**`/`frontend/README.md`; backend owns root `README.md` and `docker-compose.yml`.

> **Execution contract:** Implement only `frontend/**` (including `frontend/README.md`); root README and compose are backend-owned. Do not alter backend contract or server code. When an API is unavailable, use MSW fixture handlers with the exact frozen contract and stable shared demo IDs, not placeholder endpoints or UI-only buttons. Main homepage is the Candy Crush-inspired **Match Journey**, not the geographic stadium map. What-if is a **private persistent user↔AI conversation**, distinct from fan discussion rooms. All public DEMO fixtures/results and mock AI outputs must be visibly labelled.

## FE-00 — Pre-G0 minimal typed mock/bootstrap (mandatory; BEFORE gate freeze)

**Dependencies:** Read four documents and consume backend's BE-00 authoritative manifest and expected schema snapshot; may create an initial frontend shell while BE-00 runs but cannot freeze mock IDs before receipt. **Ownership:** `frontend/**` only.

- [ ] Scaffold only the minimal TypeScript/MSW fixture structure under `frontend/**`, with canonical request/response schemas from Appendix A v2.4, before full FE-01.
- [ ] Copy/import generated `backend/app/seed/demo_manifest.json` data supplied by BE-00; validate UUID references, demo clock, fixture IDs/matchdays, unique team per round and snapshot keys **and 3 named status/score/standings/clock scenarios**. Never independently generate demo IDs or edit backend manifest.
- [ ] Mirror **`backend/tests/fixtures/contract_edge_cases.json`** byte-for-byte at `frontend/tests/fixtures/contract_edge_cases.json`, compare SHA-256, validate every A4 test-case ID and deterministic expected response; never manufacture frontend-only edge fixtures (CT-13).
- [ ] Freeze stable MSW handlers/error responses from the same expected contract and produce a field-by-field drift check; report hashes to backend owner.
- [ ] Sign G0 jointly with BE-G0. FE-01/02 implementations are **after** contract freeze; FE-00 is not FE-01.

**Acceptance:** mock seed/hash matches BE-00; contract schema checks pass without backend server running.

## 0. Parallel development protocol (both agents follow)

- [ ] **FE-G0.1** Read backend specification, frontend specification, backend task file and this frontend task file completely; verify the two Appendix A sections are identical. Flag contradiction before writing API-specific components.
- [ ] **FE-G0.2** Confirm paths, domain IDs, enum casing, all routes under `/api/v1`, same-origin Next.js proxy to backend port 8000, session cookie, and required Origin checks for register/login/logout and authenticated writes.
- [ ] **FE-G0.3** Verify pre-G0 FE-00 MSW handlers/client fixtures against BE-00 authoritative demo manifest AND contract-edge corpus, confirming both SHA-256 hashes, complete A4 cases and expected contract. Never generate substitute IDs or invent transitions; report structural differences and stop.
- [ ] **FE-G0.4** Define generated types flow: `openapi-typescript` (or maintained equivalent), script to regenerate `lib/api/types.ts` from backend OpenAPI. Replace temporary DTOs with generated types only when backend OpenAPI conforms to frozen Appendix A; fail CI on drift.
- [ ] **FE-G0.5** Validate the canonical **demo manifest** includes all BE-02 required seeded status cases (SCHEDULED/LIVE/HALFTIME/FINISHED/POSTPONED/CANCELLED, event-rich and event-poor FINISHED, non-relevant fixture) with stable shared IDs, as well as five extra FINISHED historical synthetic fixtures, seeded PREMIUM 5/3 active bronze and FREE 4/2 then 5/3 after settlement; baseline restoration must reinitialize this evidence. Agree shared demo scenario and URLs: guest → favorite Arsenal → Journey → upcoming match room+prediction → relevant opponent match Impact → stadium map → completed match → two-turn What-if → Profile.

**G0 deliverables (created in FE-00, frozen now):** typed fixtures/MSW baseline, API client plan, auth/proxy plan, contract drift checklist, actual stable demo IDs (with no ad hoc placeholders).


**Integration ordering:** FE-05/06/07 deliver G2, FE-08 delivers G3, FE-09 delivers G4, and FE-10 is G5. Each screen may be completed using MSW earlier; the gate is passed only against the running backend.

## FE-01 — Next.js scaffold, app shell and UX foundation (P0)

- [ ] **Same-origin-only browser networking:** all browser requests target relative `/api/v1`; no direct cross-origin base URL or `NEXT_PUBLIC_API_BASE_URL`. Configure server-side rewrite for local backend and test cookie + exact Origin policy with a browser.

**Dependencies:** FE-00 and joint G0 sign-off. **Can run in parallel:** BE-01/BE-02. **Code:** `frontend/app/**`, `frontend/components/layout/**`, tokens, reusable shared components.

- [ ] Next.js App Router + strict TypeScript, Tailwind, stable pinned dependency lockfile, ESLint, Vitest/Testing Library/MSW and Playwright project setup.
- [ ] Primary navigation: Journey, Map, My Team Impact, Community, Profile. `/` routes Journey, not Map; `/matches/[id]` and **`/community/rooms/[id]`** are direct-linkable/reload-safe, plus login, register, premium and profile.
- [ ] Build responsive shell, football theme, reusable loading/error/empty source badges, generic accessible icons with no copyrighted competition logo use.
- [ ] Implement competition tokens: PL blue, Champions League purple/star-inspired original motif, FA Cup orange/cup; competition visual motif independent from status.
- [ ] Implement status indicators for SCHEDULED, LIVE, HALFTIME, FINISHED, POSTPONED, CANCELLED, SUSPENDED, UNKNOWN; honor reduced motion and accessible textual labels.
- [ ] Add `DEMO DATA` and `DEMO AI` labels, source-stale banner pattern, responsive 360px layout, keyboard focus, document title, sensible Not Found UI.
- [ ] Implement no-op prevention: every visible action navigates, mutates valid mock/API, or is explicitly disabled with explanation; no clickable decorative controls.

**Acceptance tests:** dev server runs; all navigation routes load; Journey default; competition color never conveys status alone; reduced-motion supported; no official logo assumptions; automated lint/typecheck pass.

## FE-02 — Contract API client, auth, team onboarding (P0)

**Dependencies:** FE-01; API Appendix A; no backend implementation needed for initial MSW. **Backend integration:** BE-01/02/03.

- [ ] Configure same-origin `/api/v1` reverse proxy; `fetch` credentials included, JSON parsing with typed error `{error:{code,message,details,request_id}}`, browser Origin validated for register/login/logout **and** all authenticated writes; no invented CSRF header.
- [ ] MSW handlers covering ALL endpoints used by FE pages; real mocked DTO fields/enums, HTTP statuses, room initial `sync_after_seq` and `/rooms/{id}/changes` ordered UPSERT/REMOVE (and retained older `cursor`/legacy `after_id`), including 45-message empty-room burst and hidden-history removal, provenance, latency/empty/error states. Never use `any` to conceal mismatch.
- [ ] `GET /auth/me` always `{user:null|UserPublic}`, register 201 `{user}`, login 200 `{user}`, logout 204 empty body; safe return-to path, session cache invalidation and private cache cleared at logout.
- [ ] Team picker from `GET /teams?competition=PL`: searchable cards, optional licensed crest, accessible fallback; one team at a time.
- [ ] Guest favorite saved under `matchline:favorite_team_id:v1`; authenticated preference via PUT `/users/me/favorite-team`; after login use the authenticated server favorite (including null) regardless of stale guest local choice; when a guest favorite differs, explicitly ask consent for import via `PUT /users/me/favorite-team`, with no silent fallback and no change if declined.
- [ ] **G2 demo-account precondition:** FE-02 may test auth with mocked user data, but FE-07 integration may not pass G2 until BE-03 has handed off local-only FREE and PREMIUM login credentials out of band (not in source, console screenshots or browser bundles); the Playwright runner reads them from gitignored local/CI secret env and authenticates with real backend.
- [ ] **Private/room response HTTP caching CT-12:** `cache:'no-store'` on all `/auth/me`, own profile/badges/predictions, current prediction, private What-if list/detail/turn requests and all room messages/changes (including 404/errors); preserve backend `Cache-Control: private, no-store` and `Vary: Cookie` through `/api/v1` Next.js rewrite. Disallow server fetch caching, ISR, CDN/service-worker persistence and browser storage for these bodies. Partition TanStack Query caches by identity/session and evict on logout, login, user switch, plan change, 401, moderation removal and demo reset. Test PREMIUM→FREE→guest and different users' private histories.
- [ ] **Permission cache CT-08:** Partition `RoomSummary` responses by authenticated user ID/session identity (and an explicit guest partition), never cross-account shared cache. On login/logout/user switch/plan change/demo reset invalidate room metadata and contextual `can_post`/`can_create`, and ensure same-origin requests respect server `Cache-Control: private, no-store; Vary: Cookie`. Test PREMIUM → FREE → guest switching and backend 403/409 enforcement.
- [ ] Set query keys and invalidation correctly (team ID, competition, season, matchday, date). Do not hide nonfavorite teams or clear profile prediction/badge history on team change.
- [ ] `/meta` always exposes `whatif_sharing=false` throughout Phase 1 and accurately describes demo/live capabilities; no real payment charge or user-upgrade endpoint.

**Acceptance tests:** guest team retained across refresh; login favorite retained by server; guest/auth preference conflict handled; unauthorized write prompts sign-in; session logout clears private queries; cookie auth works through proxy after G1.
- [ ] `/meta` supplies `server_now_utc` and `demo_clock_frozen`; in DEMO show a fixed as-of indicator and suppress real-time ticking countdown. In LIVE, time-sensitive UI is advisory and backend controls cutoff.
- [ ] Assert OpenAPI generated types conform to contract and that mock IDs, provider labels, venue and scenario data reference the shared manifest.


## FE-03 — Match Journey screen and competition-colored nodes (P0)

**Dependencies:** FE-01/02 mock. **Backend integration:** BE-04. **Code:** `components/journey/**`, `/journey`.

- [ ] Implement a Candy Crush-*inspired* winding vertical match path, not a copy of proprietary artwork. Each node maps to ONE match and has independent competition color/motif vs status icon/ring/label.
- [ ] Use `GET /journey?team_id=UUID&season=YYYY`, chronological stable IDs; center/highlight next UPCOMING fixture, show past/current/future with null-safe scores.
- [ ] Display opponent, home/away, kickoff in Europe/London (with timezone cue), final score when source FINISHED, competition and provenance.
- [ ] Match node links to `/matches/[id]` with same UUID as map/impact; action links to pre-match rooms/prediction or completed What-if, based on backend `features`, not client guesses.
- [ ] Add All/League/Cup filter but explain unavailable competitions when only PL data exists; never fabricate Champions League fixtures to populate path.
- [ ] Support mobile vertical layout, SVG connector decoration behind focusable HTML links, keyboard navigation, unknown competition neutral style, readable status legend and reduced-motion.

**Acceptance tests:** PL and synthetic UCL motif samples distinguish from status; FINISHED score correct; UNKNOWN not silently scheduled; no favorite prompts team picker while browse still allowed; consistent deep-link IDs; accessible node controls.

## FE-04 — Match details and evidence-limited football UI (P0)

**Dependencies:** FE-02/03; backend BE-02/04. **Code:** `/matches/[id]`, `components/match/**`.

- [ ] Fetch canonical `MatchDetail` with `events`, `statistics|null`, `data_capabilities`, full source metadata, and feature flags.
- [ ] Show competition, teams, stadium, kickoff, status/score, round, source label and last-synced/stale warning; defensive rendering for missing crest, score and venue.
- [ ] Accessible tabs Overview / Discuss / Predict / Impact / What-if / Events, appearing according to verified match state and capability; direct-link `?tab=whatif` works on refresh.
- [ ] Pre: room CTA, predictions and impact. Live/HT: observed score/source, prediction closed, no what-if before finished. Finished: confirmed score, event timeline when available, post-match AI entry, read-only pre-match room. Postponed/cancelled: warning not fake result.
- [ ] If detailed substitution/player stats are not in provider data, show `Not available in this feed` rather than fabricated football analysis.
- [ ] Implement `GET /matches` all-matches browse accessible independently of preferred club.

**Acceptance tests:** every enum state, partial data, missing events, direct link, source labels, API error/retry, unknown UUID 404.

- [ ] **FE-02 / shared header regression:** read `/meta` to show `Demo as of <server_now_utc>` dynamically; on scenario_revision change update label and invalidate dependent query caches. Never access `/meta.demo_epoch` as a URL or hardcode baseline time.

## FE-05 — England stadium discovery map (P0)

**Dependencies:** FE-01/02/03, Appendix A v2.4 mock data; backend BE-04 for G2. No dependence on AI or predictions. **Code:** `/map`, Leaflet client-only component + fixture list.

- [ ] Read `default_season_start_year` field from `GET /meta` (2026) to select default league season; on first map entry default to the **Europe/London calendar date derived from `/meta.server_now_utc`**, load matchdays for explicit user selection, and send exactly one filter (`date` OR `matchday`) to map and Impact. Do not silently choose a round if the date has no matches. Date uses Europe/London semantics defined by backend.
- [ ] Load `GET /map/stadiums?...`; center England, pin **verified coords only**; no arbitrary fallback coords. Honor OSM tile attribution and network limits; map works with accessible fixture list if tiles fail.
- [ ] Stadium state visuals come only from backend aggregate state and `/meta.server_now_utc`: UPCOMING_ROUND light (future SCHEDULED), LIVE pulse, COMPLETED result, INACTIVE noninteractive, POSTPONED_OR_CANCELLED warning, UNKNOWN includes overdue still-SCHEDULED (no upcoming glow). **`home_team_ids` governs favorite-home stadium outline even with zero fixtures**. Never trust browser time or infer home ground from the selected match.
- [ ] When multiple fixtures share a venue, popup lists complete `StadiumFixture.match` records (teams, competition, status, score) with distinct fixture IDs/links; clickable selected-round fixtures open `/matches/[id]` matching Journey identity.
- [ ] **No favorite map CT-15:** If signed in and server favorite is null, fetch/render the public map and skip Impact queries **even if a stale guest-local favorite exists**; offer explicit consented import. Only unauthenticated guests may use an explicit guest-local verified favorite for Impact. A signed-in server favorite always wins over local choice. Clearing/changing invalidates personalized overlays only.
- [ ] Favorite-home venue outline uses `home_team_ids` membership; other-team HIGH/MEDIUM/LOW get Impact indicators from **ALL** `/impact/relevant` pages (limit≤100, follow `next_cursor` to null) using identical favorite/competition/season/**matchday OR date** as map. UNKNOWN gets neutral unresolved icon, **not** high/confirmed highlight; while loading/failure do not assert NONE. No invented standings math.
- [ ] Expose matched `unmapped_matches` in accessible fixture list with `Location unavailable`; visible source-stale and synthetic label. Provide zoom/pan, legend, and reduced motion.

**Acceptance tests:** coordinates absent => list only; valid coords pin and popup; live not confused with future round; completed-round navigation, multiple matches in same venue, tile outage list, map keyboard accessible via list.
- [ ] Render all verified venues including `INACTIVE` (fixtures=[]), and the complete `UnmappedMatch.match` accessible list; no extra GET per stadium fixture just to show teams.
- [ ] Highlight `UPCOMING_ROUND` without labeling live; backend `illumination_state` is authoritative even with demo frozen time.

**G2 criterion:** One map marker can list multiple real, correctly keyed MatchSummary objects; one selected fixture opens exactly its `/matches/{id}` and has identical team/kickoff values.


- [ ] **FE-05/FE-06 CT-02 selector/subset rule:** Map lists **all** date/matchday-selected fixtures (mapped and unmapped); relevant Impact returns only the filtered other-team subset, excluding `NONE` and favorite-team fixtures while including `UNKNOWN`. Compare common match fields for each Impact match ID against selected Map fixtures; never assert equal counts or equal sets. Test Europe/London DST boundaries and selector switching.
- [ ] **FE-05 map interaction contract CT-02–CT-05:** default `date=YYYY-MM-DD` computed by timezone-aware conversion of `/meta.server_now_utc` into Europe/London (DST tests); empty date stays selected until user chooses a next matchday. Render verified neutral venues; favorite home-stadium outline and independently favorite HOME/AWAY fixture indicators; every selected FINISHED fixture is clickable even in mixed-status venue, only fixture-empty INACTIVE venue disabled.

## FE-06 — Personalized Impact page and standings (P0; G2)

**Dependencies:** FE-01/02/03/04; backend BE-05 for G2. Does **not** depend on FE-08 prediction or FE-09 AI. Code: `frontend/app/(main)/impact/**`, `components/impact/**`.

- [ ] Implement `/impact` with `GET /impact/relevant?favorite_team_id=...&competition=PL&season=...` paginated and `GET /standings`; all ImpactInsight cards use their **embedded `match:MatchSummary`**, not an invented second match fetch.
- [ ] On match details, use `GET /matches/{id}/impact?...`; display HOME/DRAW/AWAY scenarios only when returned, and **one GapEffect per affected team** (both competing clubs when both matter).
- [ ] Preserve signed math without recomputation: `gap_delta=gap_after-gap_before`; positive improves favorite's relative points position. `position_change` null requires note.
- [ ] `relevance=NONE` means **below the points-gap recommendation threshold (not necessarily zero gap effect)**, and is omitted from relevant feed; `UNKNOWN` **is included** with `basis=INSUFFICIENT_DATA`, no scenarios and explicit caveat in neutral `Impact unverified` section, never a relevance endorsement; keep general match discovery intact.
- [ ] Label pre/live scenarios Hypothetical; after FINISHED **with trusted pre/post standings snapshots**, show **one actual CONFIRMED case and two clearly HYPOTHETICAL alternatives** (never rewrite historic results); if standings evidence is insufficient, show `UNKNOWN` plus a verified `actual_outcome` if available, with **zero scenarios**. Label the `/standings` table `Current standings (as of <StandingsResponse.as_of>)`; place historical `ImpactInsight` calculations and their sources/caveats in a **separate historical-effects area**. `GapEffect.position_change` refers to favorite team only; never suggest it is an opponent’s rank. Never assert numerical final position without full tiebreaks. Render snapshot citation/stale warnings and optional AI_EXPLANATION. Add deterministic `Recommended for your team`: next selected-team SCHEDULED fixture by kickoff/UUID, then HIGH→MEDIUM→LOW other-team fixtures, dates ascending; no ML recommendation claims; UNKNOWN is an unresolved section, not recommended.
- [ ] Respond to favorite-team changes by invalidating impact queries and recomputing map relevance IDs from **all cursor pages**, not merely the first 20. Show impact unavailable during partial pagination or API failure.
- [ ] Add unit tests for two-rival effects, missing source, hypothetical vs confirmed, one embedded match, signed gaps and favorites switching.

**G2 criterion:** Impact page and map reference the same embedded match UUIDs and team names; no frontend AI/arithmetic speculation; completed matches need verifiable pre/post snapshots or UNKNOWN; HIGH/MEDIUM/LOW thresholds verified at 3/6/7/9/10 and historical Impact is not mislabeled as current table or as “Current gap”.


- [ ] **FE-06 Impact correction CT-06/CT-07:** `NONE` is below recommendation threshold, not an assertion of no possible points-gap change. When a FINISHED result is verified but Impact snapshots are unavailable, render verified `actual_outcome`, `UNKNOWN`, `scenarios=[]`, with explicit unavailable-impact caveat (do not fabricate a confirmed scenario).

## Phase 1 v2.4 — additional binding frontend tasks (all required)

**FE-07 / G2 CT-19, CT-20:** Resume room events after disconnect by the durable `after_seq` cursor; server retains all event metadata for Phase 1, so do not assume expiry, silent resets or invented 410 errors. On baseline `demo_epoch` change, clear all cached messages and cursors and reauthenticate. Poll `GET /rooms/{id}` on entry, every 15 seconds while foreground and online, on focus/reconnect, changed `/meta` revision/clock, and after a 409 write; use the response for `status`/`can_post` (not a guessed status or message-event activity). Test a clock-only kickoff with no message events and an old-room replay following service restart.

**FE-09 / G4 CT-21, CT-22:** Render at most 40 USER turns (up to 80 history messages), clear `WHATIF_THREAD_LIMIT` 409 feedback with a new-thread CTA, and never create a new turn or re-charge on an idempotent replay. Render only typed evidence supplied in the AI message; hide unsupported/missing evidence categories and clearly display `INSUFFICIENT_DATA` alongside the missing-facts explanation, without fabricated data or links. Add shared CT-19–CT-22 to integration suite.

## FE-07 — Community, room details, permissions and reporting (P0; G2)

- [ ] Seeded POST_MATCH templates must be non-discoverable until verified FINISHED (`post_match_room=false`, index excludes, detail returns 404). For fixtures already FINISHED in the baseline seed, templates begin OPEN; newly FINISHED fixtures activate templates atomically and become OPEN/discoverable; PRE_MATCH archives remain visible READ_ONLY. Creation of POST_MATCH rooms only allowed to PREMIUM when FINISHED. Test match features vs room status/can_post independently.


**Dependencies:** FE-02/04; backend BE-06 (mock first). **Code:** `/community`, `components/community/**`.

- [ ] Global Community page calls `GET /rooms?competition=PL...` with cursor and related match summary. Match page calls `GET /matches/{id}/rooms`.
- [ ] **Room feed no-store and moderation CT-08/CT-12:** Request room messages and `/changes` with `cache:'no-store'`; never persist them in browser storage or shared Next caches. Consume only moderator-produced REMOVE events—Phase 1 has no editor moderation HTTP endpoint or dashboard. Immediately remove hidden messages from every local page and invalidate loaded room queries, while preserving sequence progression.
- [ ] Room details fetch paginated `GET /rooms/{id}/messages` and display author/badges, timestamps, report action, correct public moderation states (`VISIBLE`/`FLAGGED` only; HIDDEN excluded), chronological ordering and scroll preservation.
- [ ] FREE and PREMIUM user can post to any existing OPEN room (when time/status permit); don't put free user's message composer behind premium paywall. For G2, consume BE-03 local-only FREE/PREMIUM login handoff via test-runner/server environment, never `NEXT_PUBLIC_*` or committed manifests, and verify real backend credentials before declaring PREMIUM-create integrated.
- [ ] PREMIUM-only create-room form submits `{title,kind}` to match endpoint; FREE sees explanation and `/premium` link, while existing room contribution stays available. Before creating PRE_MATCH, display disabled/closed state when backend authoritative time is at/after kickoff or match status is not SCHEDULED; POST_MATCH create only after verified FINISHED. Treat `RoomSummary.can_create` as a SAME-kind, match-phase permission when available, never generic subscription entitlement. Backend 409 `ROOM_CLOSED` always wins, including stale screen/state.
- [ ] Pre-match rooms become read-only at cutoff, post-match only available after FINISHED; handle server 403 PREMIUM_REQUIRED and 409 ROOM_CLOSED without silent message loss.
- [ ] Report abusive posts, sanitize rendered content, preserve drafts and use modest active-tab polling (no WebSocket promise). Public feed excludes HIDDEN messages **entirely**, FLAGGED remains visible until hidden; remove cached newly hidden messages without content placeholders, and show only public-visible message counts.

**Acceptance tests:** FREE post successful, FREE create forbidden, PREMIUM create successful, guest read-only, cutoff 409 reflected, global room discovery works without selected favorite, reporting flow.
- [ ] Load a direct room link through **`GET /rooms/{id}`**, not by assuming the room is present in a paginated index; render `RoomSummary.match` header.
- [ ] Handle premium room-creation HTTP 201 and FREE 403 `PREMIUM_REQUIRED`; 409 `ROOM_CLOSED` for invalid PRE_MATCH creation at/after cutoff and POST_MATCH before verified FINISHED; successful room posting HTTP 201; closed rooms 409. Direct links to hidden rooms must render the same 404 not-found state for room details/messages/changes and never poll hidden room APIs or render template metadata.
- [ ] Treat flagged as publicly visible and HIDDEN as removed from the public DTO/count; implement signed-in `POST /reports` on `ROOM_MESSAGE`, no HIDDEN placeholders; backend/editor owns moderation decisions.

**G2 criterion:** Direct room URL works after refresh for discoverable rooms; hidden room UUID returns uniform 404 for detail/message/change/post; FREE posts existing rooms, PREMIUM creates only in valid match phases (PRE_MATCH strictly pre-kickoff, POST_MATCH verified FINISHED). Both accounts must authenticate using the local-only BE-03 credential handoff BEFORE G2; no credential values or login passwords in committed MSW fixtures or browser bundles.


- [ ] `/community/rooms/[id]` direct route MUST fetch `GET /rooms/{id}` independently of index, handle refresh/not-found, and return-to path for login when posting.

- [ ] **G2 CT-19 redaction-safe sync:** historical UPSERT projected as REMOVE retains its original event `seq`; paginate by stored event rows, not visible messages; always advance `next_after_seq` even for an all-REMOVE page. Apply duplicate REMOVE operations idempotently across old cached pages. Test 20 redacted original events plus a later valid UPSERT, refresh/restart, and demo-epoch reset.
- [ ] **FE-07 room synchronization CT-08/CT-16:** initial `RoomMessagesPage` returns latest N public messages ascending plus atomic `sync_after_seq` (also present when empty). Load older via `next_cursor` and prepend. Live poll via `GET /rooms/{id}/changes?after_seq=<last_seq>` and apply ordered UPSERT/REMOVE UUID operations to **all** loaded pages. Continue while `has_more` (possibly across poll cycles) without skipping events. Test empty room -> 45-message burst at limit 20, flagging remains visible, hide a previously cached message in page >5, no historical content leak, equal timestamps and no duplicates/gaps. Legacy `after_id` remains for compatibility only; don't use it as the primary UI sync.
- [ ] **FE-07 clock-driven room cutoff CT-17:** even if fixture stays SCHEDULED, server time at/past kickoff yields PRE_MATCH `RoomSummary.status=READ_ONLY` and `can_post=false`; handle server 409, don't infer room permission from fixture status alone.

## FE-08 — Predictions, badges and prediction-only profile history (P0; G3)

**Dependencies:** FE-02/04/07; backend BE-07 for G3 (MSW independent). **Code:** `components/prediction/**`, `/profile`.

- [ ] Three structured outcomes (HOME/DRAW/AWAY), optional exact score inputs; enforce **both scores null OR both nonnegative integers consistent with selected outcome** (not partial, negative, fractional, or mismatched) with clear client errors, and server-authoritative submission deadline. Test CT-18 invalid requests are rejected by server 422 without writes.
- [ ] `POST /matches/{id}/predictions` supports **edit/upsert** before cutoff; `GET /matches/{id}/predictions/me` returns `{prediction:null|PredictionView}`; don't assume standalone null.
- [ ] When source marks FINISHED, present scorer breakdown +3 outcome / +2 extra exact; if backend returns VOID, explicitly state void.
- [ ] Leaderboard `GET /matches/{id}/leaderboard`, accurate ranks and badge alongside displayed public authors; no fabricated rankings for new users.
- [ ] At G3 Profile shows favorite selection, plan (demo only), prediction summary, historical predictions via `GET /users/me/predictions`, and badges via `/users/me/badges`; **NO** private What-if thread list at G3. FE-09 adds that list only at G4 after BE-08 exists.
- [ ] Badge text `PREDICTOR_BRONZE: ≥5 SCORED predictions, ≥60% correct outcomes among latest 20 ordered by scored_at DESC, prediction UUID DESC`; no badge awarded for uncheckable alternate-match predictions.
- [ ] Session logout or user switch clears cached private predictions/threads; preserve historical stats after favorite change.

**Acceptance tests:** mutate until cutoff only, back end 409 wins over client countdown; post-match breakdown; exact-score consistency; history pagination; private profile requires auth; premium not mistaken for score boost.
- [ ] Send mandatory UUID `Idempotency-Key` for POST predictions; retry same key+body; a changed accepted edit has a fresh key, updates `submitted_at` and retains `created_at`. **After every 200/201 or uncertain network result, GET `/matches/{id}/predictions/me` and render that authoritative current state**, not the potentially stale replayed POST snapshot; if GET fails, label current prediction unverified. Test HOME→AWAY→replay HOME still renders AWAY.
- [ ] Verify the deterministic manifest starts PREMIUM with bronze (5 scored/3 correct), FREE with four scored/two correct and pending upcoming correct prediction; explicit upcoming_finished settlement yields FREE bronze at 5/3 and baseline clears it back to 4/2. No fabricated badges.
- [ ] Confirm first creation HTTP 201, updated/no-op HTTP 200, same key different body HTTP 409. Match history items contain `{prediction,match}`; profile is direct `UserProfile`, never envelope.
- [ ] Use backend `locked_at` and `/meta` demo time to represent cutoff; never tick against frozen time; server 409 always wins.

**G3 criterion:** Edits, same-body no-op, key replay, kickoff cutoff, result points and prediction-only profile history (no private What-if list) tested against backend and shared seed data, including FREE badge 4/2→5/3.


## FE-09 — Persistent private fan ↔ AI What-if debate (P0; G4)

- [ ] For old FAILED turns followed by any later accepted USER turn, show `Superseded—cannot retry`; same-key retry yields 409 `WHATIF_TURN_SUPERSEDED` **before quota**, with no resubmission or replacement key for old turn. New hypothesis can be sent as a new turn after the latest completed turn. Context should only include completed USER/AI pairs. Test A FAIL → B COMPLETE → retry A 409, while COMPLETE replay of B remains 200.


**Dependencies:** FE-02/04/08; backend BE-08 for G4 (MSW independent). **Code:** `components/whatif/**`.

- [ ] `WHATIF_THREAD_BUSY` 409 from second different-key simultaneous request shows a non-destructive “Finish the current AI response first” state and `retry_after_seconds`; do not allocate/submit a new key automatically; active same-key retry still works.
- [ ] Finished-match `What if?` CTA opens thread selector and private multi-turn chat; user can start thread `{title?}` and list/reopen per-match threads. **Add the private What-if thread list to `/profile` in FE-09 only (G4)**, using `GET /users/me/whatif/threads`, ownership-safe cache and login/account switching; G3 profile shows prediction history/badges only.
- [ ] **What-if typed evidence CT-14:** consume `AIWhatifMessage.evidence:WhatifEvidenceItem[]`; render MATCH_EVENT, FINAL_SCORE, STANDINGS_SNAPSHOT, MATCH_METADATA and verified PLAYER_SEASON_STAT details inline, join every `supports/challenges[].evidence_refs` only to evidence in its own AI message, and display unavailable/inconsistent refs as unsafe rather than invented details. No uncontracted source resolver or score-at-minute claim.
- [ ] Display USER hypotheses distinctly from `AI_ANALYSIS` or `DEMO_AI`. AI message sections: verdict, headline, reasoning, supports/challenges, assumptions, unknowns, qualitative confidence, source chips, follow-up question.
- [ ] Composer accepts 10–2,000 chars, Enter send / Shift+Enter newline, pending/sending state, scroll/focus management, accessible `aria-live` response announcement.
- [ ] `POST /whatif/threads/{thread_id}/messages` with same UUID Idempotency-Key, same client_message_id and byte-identical body for retries. COMPLETE snapshot replays despite quota/day; PENDING 202 waits; **FAILED re-reserves current retry-day slot or returns 429**. On error/refresh reconcile server USER turn by client ID before resending; never duplicate bubble/model request.
- [ ] On send save per-user/thread/client ID + idempotency key **and byte-identical original text** in **tab sessionStorage** until COMPLETE; after reload auth check + thread GET, reconcile saved USER `client_message_id`/content and use ORIGINAL key/body on retry. Clear attempts at COMPLETE/logout/account switch. Absent/blocked storage => safe unresumable message, **never mint replacement key for same saved USER**. Test refresh while PENDING and FAILED, missing attempt envelope and account change.
- [ ] Thread history persists after reload and allows disagreement/follow-up questions with same thread context. If verdict `INVALID_PREMISE`, show factual correction; `INSUFFICIENT_DATA`, show missing evidence; `AI_UNAVAILABLE` is transport error and preserves user draft/retry.
- [ ] Never claim AI can prove the alternative score/result. Do not display numerical counterfactual probabilities or award objective predictor points for speculative reasoning.
- [ ] Quota: FREE 3/day, PREMIUM 30/day (UTC current reservation/charge day; FAILED retry after release uses retry-day), failure not charged; display 429 `reset_at` for **initial and FAILED same-key retry**; use backend remaining count as response-time information (replayed snapshot may be historically stale), no frontend-only quota enforcement.
- [ ] Ensure no browser AI keys/model requests and never auto-publish conversation. Another user's thread cannot be loaded: render unauthorized state, clear cached private thread on user change.

**Acceptance tests:** ≥2 multi-turn replies, evidence chips, invalid/missing event, AI outage, same-key retry no duplicates, FAILED+exhausted quota 429, retry following UTC reset, reload PENDING/FAILED with sessionStorage, storage missing safe fallback, privacy/ownership, DEMO_AI label, no sharing.
- [ ] **G4 CT-21:** show `X of 40 questions used` based on distinct admitted USER turns, including FAILED and PENDING turns once. At 39, while newly admitted 40th is PENDING, a second distinct key shows `WHATIF_THREAD_BUSY`; only after 40th is terminal does a fresh key show `WHATIF_THREAD_LIMIT`. Exact-key replay never creates a new turn. Explain clearly that failed attempts count toward the lifetime 40-turn thread limit but not the daily completed-response quota; handle 409 `WHATIF_THREAD_LIMIT` with `details.limit`/`details.admitted_turns` and Create new thread CTA. Exact-key retry does not increment the display count.
- [ ] Model success **200 `WhatifTurnResponse`**, pending **202 `WhatifPendingResponse`** (poll/refetch, never a duplicate user bubble), and 503 `AI_UNAVAILABLE` (retain saved failed USER turn, retry same key); 409 IDEMPOTENCY_CONFLICT is a genuine client error.
- [ ] A second user's private thread must show not-found (404) without leaking existence; never persist private prompts into shared localStorage.
- [ ] `INSUFFICIENT_DATA` occurs when feed lacks event evidence; `INVALID_PREMISE` requires contradictory verified data; display each distinctly as normal HTTP 200 analysis.

**G4 criterion:** ≥2 context-aware turns, private-thread Profile subsection integrated, different-key simultaneous attempt returns 409 `WHATIF_THREAD_BUSY` without a duplicated USER turn or charge, exact resend/replay behavior (200/202/503/409/**429 after released FAILED**), **no double charge**, source-verified evidence only, refresh-safe request identity.


- [ ] **FE-09 G4 real AI acceptance CT-11:** use actual backend `AI_PROVIDER=remote` with credentials and submit a previously unseen hypothesis followed by a challenging reply in one saved What-if thread; confirm evidence chips and `AI_ANALYSIS` (not `DEMO_AI`). Without secrets, mark G4 BLOCKED; offline mock tests remain required separately.

## FE-10 — Contract conformance, integration and release QA (P0; G5)

**Dependencies:** FE-01 through FE-09, BE-09 and signed-off G0–G4. No other phase depends on this slice.

- [ ] Generate TypeScript types from **conforming** backend `/openapi.json`; compare actual paths/methods/required fields/enums/status codes against frozen Appendix A; reject drift in CI.
- [ ] **G5 CT-12 privacy/cache checks:** Assert `Cache-Control: private, no-store` and `Vary: Cookie` on private auth/profile/prediction/What-if and room messages/change-feed reads, relevant errors and authenticated mutations; verify same-origin proxy preserves headers, no server/shared/browser persistent caching, no stale permission/message after moderator hide and no cross-user history during role/account switches. Phase 1 moderator hide is tested by guarded backend CLI, not an undocumented API endpoint.
- [ ] Remove temporary MSW-only type definitions; all MSW fixture handlers must satisfy generated types without `any` casts or hidden missing fields.
- [ ] Run real browser session/cookie Origin tests (register/login/logout 201/200/204, guest 200, FREE room post, PREMIUM room create, predictions, private What-if).
- [ ] After `baseline` reset, assert older cookies receive 401, cached prediction/badge/thread data are cleared, user is asked to log in again, fields `demo_epoch` + `scenario_revision` from `GET /meta` cause cache invalidation, and no pre-reset pending What-if turn is shown as valid.
- [ ] Verify G0–G5 same IDs using canonical seed manifest: match_upcoming, match_live, match_finished; **baseline → upcoming_live → upcoming_finished** authoritative state/score/standings and clock-only no-status-change; date/matchday DST parity across Map and Impact; verified `home_team_ids` and favorite outline on inactive venue; map marker and room deep links; Impact match to Journey match.
- [ ] Test error catalog: 401, 403 CSRF/PREMIUM, 404 owned-thread privacy, 409 cutoff/idempotency, 422 bad selector/date, 429 UTC reset, 502 provider, 503 AI.
- [ ] Run responsive widths 360px/desktop; keyboard map list navigation, alt text, reduced-motion and accessible announcements; test map-tile offline without losing match list.
- [ ] Assert only correct provenance text `DEMO_SYNTHETIC` appears; mock AI label is `DEMO_AI`, and real unavailable data is null/unknown.
- [ ] Verify provider/AI outages; FAILED AI retry 429 after same-day exhaustion then success next day with same USER/key; browser reload sessionStorage resumption or safe fallback; stale prediction POST replay reconciled via current GET; cutoff and badge boundary from seed.
- [ ] Verify shared edge fixture hashes, CT-13–CT-18, guest map no favorite, initial-empty room burst and old hidden cache removal, clock-driven room cutoff, typed evidence chips, and invalid prediction score inputs against conforming backend.
- [ ] Run lint, typecheck, unit, integration, Playwright and build; record actual commands/results, coverage, unresolved blockers and evidence of passing joint gates.

**G5 criterion:** Both services running, no undocumented API routes, no consumer/provider real-data claims, all Phase 1 P0 demo path functioning on synthetic licensed/verified venue coordinates.


### Mandatory frontend contract and end-to-end matrix

- [ ] Implement formal Appendix A6 **CT-19–CT-22** assertions in MSW and integration tests, including timeline redaction cursor continuity, clock-only room read-only change, 40-turn failed-slot text, and missing-evidence UI.
- [ ] Implement Appendix A6 CT-01–CT-22 frontend coverage with strict MSW schemas, and Playwright against real API at G2–G5; report PASS/FAIL/BLOCKED with test commands. G4 live remote model credentials are required for CT-11 acceptance, never claim mocked reply fulfills real AI analysis.

## Parallel integration handoffs — both agents sign off

| Gate | Frontend builds independently with MSW | Backend prerequisite for joint PASS |
|---|---|---|
| G0 | **FE-00 pre-gate** typed MSW shell and mirrored BE-00 manifest, FE-G0 validation | **BE-00 pre-gate** minimal Pydantic/expected OpenAPI/manifest, BE-G0 validation; Appendix A exact identity |
| G1 | FE-02/03/04 favorites/Journey/Match | BE-02/03/04 real auth/teams/match/Journey |
| G2 | **FE-05 map + FE-06 Impact + FE-07 Community** | BE-04/05/06 map/impact/rooms |
| G3 | **FE-08 Predictions/Profile** | BE-07 revision-aware upsert, badge, history |
| G4 | **FE-09 What-if + private-thread Profile subsection** | BE-08 persistent 200/202/503 threads, retries/quota and owner-only thread list |
| G5 | **FE-10 integration QA** | BE-09 final contract conformance/test infra |

**No gate deadlocks:** G2 does NOT depend on FE-08/09/10. `implemented with MSW` does not mean `integrated`. A change to an endpoint requires coordinated updates of **all four documents**, Appendix A exact identity, backend schema+test and frontend mock+test.

## Final frontend owner checklist

- [ ] All FE-01 through FE-10 P0 tasks implemented or blocker recorded with evidence.
- [ ] Every required API type/endpoint is in Appendix A; frontend type generation checks conformance rather than adopting drift.
- [ ] FREE posts, PREMIUM creates rooms, favorite does not conceal unrelated matches, Journey is home.
- [ ] Stadium map uses verified coordinates, multiple per-venue fixtures and a list fallback; favorites/relevance overlays remain independent of status.
- [ ] Impact numerical facts only from backend; completed and hypothetical scenarios are never confused.
- [ ] Prediction revision/time/idempotency and result scoring verified; private profile is safe across login switching.
- [ ] Multi-turn AI What-if uses persistent private threads, verified evidence, safe retries and visibly speculative language.
- [ ] All demo screens say DEMO_SYNTHETIC / DEMO_AI; fixed demo clock governs display, no fake live countdown.
- [ ] Playwright against actual backend with canonical seed; G0–G5 jointly signed.

### Paste into Codex — frontend startup prompt

```text
You own frontend/** and frontend/README.md only; backend agent owns root `docker-compose.yml` and root `README.md`. Read all four Matchline Phase 1 v2.4 files; compare both Appendix A blocks exactly. Treat frozen Appendix A as the product contract before AND after backend OpenAPI appears. Complete FE-00 bootstrap, jointly sign G0 with BE-00/BE-G0, then FE-01/02 against canonical shared seed manifest and strict MSW handlers. Use Next.js App Router, TS strict, Tailwind, TanStack Query, same-origin /api/v1 rewrite, real HttpOnly session cookie, browser Origin and matching status/error responses. Implement FE-03/04, then FE-05 map + FE-06 Impact + FE-07 rooms for G2; FE-08 prediction/profile for G3; FE-09 private multi-turn user↔AI What-if for G4; FE-10 release verification for G5. Never change backend/ or contracts alone; never claim a mocked gate integrated. Run tests after each slice and report commands and results.
```
