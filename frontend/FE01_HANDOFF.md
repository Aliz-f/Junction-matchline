# FE-01 handoff — Next.js scaffold, app shell and UX foundation

Branch `frontend`. Scope: `frontend/**` only. No shared, protected, backend or
`.github/**` file was edited.

## Gate status, stated plainly

- **FE-01: built, and now partly verified against the REAL BE-01 backend.**
- **G0: still BLOCKED.** G1–G9, D1–D4 and Q1 / Q3 in `FE00_HANDOFF.md` are
  unchanged. BE-01 did not touch `demo_manifest.json` or
  `openapi.expected.json` (both still hash-identical to the FE-00 mirrors), so
  every manifest and OpenAPI gap stands. **Q2 is now ANSWERED** — see below.
- **G1: NOT PASS.** Partial integration evidence exists (see the proxy-mode
  table), but two auth endpoints 500 and three new drift items are open.

`CONTRIBUTING.md` allows independently mocked work to continue while a gate is
blocked, provided its integrated status is not reported as PASS. No gate is
reported PASS here.

The task board lists joint G0 sign-off as a dependency of FE-01. This work was
started ahead of that sign-off on the repository owner's explicit instruction,
with backend-dependent items deferred to an integration phase. Recording it here
so the sequencing is visible rather than implied.

## Verified against the real BE-01 backend

BE-01 (`origin/main` `0e40aa5`) landed after FE-00 was written and implements
real `/health`, `/meta` and cookie-backed `/auth/*`. It was run locally and the
frontend proxy was pointed at it.

**Harness caveat, because it affects what the results mean.** Docker is not
installed on this machine and there is no local PostgreSQL, so the documented
Compose environment could not be used. The backend was run from a scratchpad
checkout of `origin/main` under Python 3.13 with the pinned `requirements.lock`
versions, against **SQLite** (`sqlite+aiosqlite`) with tables created from
`Base.metadata`. Results that depend on the database engine are flagged below.
Nothing in `backend/**` was edited.

| Check through the Next.js `/api/v1` proxy | Result |
|---|---|
| `GET /meta` | **PASS** — real backend response, byte-equal to demo mode |
| `GET /health` | **PASS** — `{"status":"ok","database":"ok"}` |
| `GET /auth/me` as guest | **PASS** — `{"user":null}` |
| `POST /auth/register` with `Origin` | **PASS** — 201 + `UserPublic`, `HttpOnly` session cookie set through the proxy |
| `POST /auth/register` without `Origin` | **PASS** — 403 `CSRF_ORIGIN_INVALID`, matching A1 |
| Rewrite precedence over the demo handler | **PASS** — demo handler correctly never runs when `MATCHLINE_API_BASE_URL` is set |
| Upstream header passthrough | **PASS** — backend `X-Request-ID` arrives intact |
| Build with the env var set | **PASS** — all routes become dynamic, as the README requires |
| `GET /auth/me` **with** a session cookie | **FAIL** — 500 (see B1) |
| `POST /auth/logout` | **FAIL** — 500 (see B1) |
| `Cache-Control` / `Vary` on private proxied routes | **FAIL** — backend sends none (see B2) |

### Q2 is answered, and one of my values was wrong

BE-01's `/meta` is authoritative. It returns `demo_epoch: 1`,
`scenario_revision: 1`, `whatif_sharing: false`, `live_updates: false`,
`events: **false**`, and `server_now_utc` from `settings.demo_clock_iso`, which
equals the manifest `demo_clock` (`2026-10-24T12:00:00Z`).

Four of my five placeholders matched. **`capabilities.events` did not**: I
derived it from the manifest fixtures, which yields `true`, because some
fixtures do advertise event data. The backend owns feature flags, so demo mode
now hardcodes `false` to match, and the test asserts the backend's value rather
than re-deriving it. Had this shipped, demo mode and the real backend would have
disagreed on a feature flag.

## New items for the backend lead

**B1 — `current_user()` crashes on any authenticated request.**
`backend/app/api/v1/auth.py:45` compares `stored_session.expires_at` with
`datetime.now(UTC)` and raises
`TypeError: can't compare offset-naive and offset-aware datetimes`. Both
`GET /auth/me` with a cookie and `POST /auth/logout` return 500. **BE-01's own
`tests/test_be01_foundation.py::test_auth_contract_sets_cookie_and_logout_is_empty`
fails this way** (5 passed, 1 failed) — and that test hardcodes SQLite itself,
so this is not an artifact of my harness choice.

Likely engine-dependent: the columns are `DateTime(timezone=True)`, which is
`TIMESTAMPTZ` on PostgreSQL where asyncpg returns aware datetimes, so this may
not reproduce on the supported stack. Either way the committed test is red on
`main`. Backend to confirm on PostgreSQL and decide whether to normalise the
comparison or drop the SQLite test path. **Frontend FE-02 auth work is blocked
on this**, since every authenticated read goes through `current_user()`.

**B2 — no cache headers on private routes (A1 / CT-12).** BE-01 sends no
`Cache-Control` and no `Vary` on `/auth/me` or any private route. CT-12 requires
`private, no-store` + `Vary: Cookie`. The frontend's obligation is only to
preserve them, and it does — verified by header passthrough — but there is
nothing to preserve yet.

**D5 — error codes outside the frozen A1 table.** `backend/app/core/errors.py`
emits `NOT_IMPLEMENTED` (501), `HTTP_ERROR` and `INTERNAL_ERROR`. None is in the
Appendix A error-code table, and A1 defines no 501. The frontend's
`ErrorCodeSchema` is a closed `z.enum` over the A1 table, so it **rejects these
envelopes at parse time**. Needs either A1-conformant codes or a coordinated
change request.

**D7 — contract endpoints are 501 stubs.** `/competitions`, `/teams`,
`/competitions/{code}/matchdays`, `/journey`, `/matches` and the rest return 501
`NOT_IMPLEMENTED`. Expected at this stage; noted because demo mode serves three
of them from the manifest, so proxy mode is currently *less* capable than demo
mode. Not a defect.

### Integration note for deployment

BE-01 enforces `Origin` against `CORS_ALLOWED_ORIGINS` (default
`http://localhost:3000`) on every write. A deployed frontend therefore needs its
own origin added to that backend allowlist, or every write returns 403
`CSRF_ORIGIN_INVALID`. The session cookie is `HttpOnly`, `SameSite=Lax`, with
`secure` off by default — it must be enabled for any HTTPS deployment.

## What was built

**Toolchain.** Next.js 15.5.28 App Router, React 19, strict TypeScript
(`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), Tailwind 3.4,
ESLint 9 flat config, Vitest with jsdom + Testing Library for component tests
alongside the existing Node-environment contract tests. All dependencies pinned
to exact versions; `pnpm-lock.yaml` committed.

**Same-origin networking.** The browser only calls relative `/api/v1`. There is
no `NEXT_PUBLIC_API_BASE_URL`. `next.config.ts` adds a `beforeFiles` rewrite to
`MATCHLINE_API_BASE_URL` when that server-only variable is set; when it is
unset, requests fall through to the demo handler. Integration is an env change,
not a code change.

**Demo mode.** `app/api/v1/[...path]/route.ts` + `lib/demo/responses.ts` replay
the frozen BE-00 manifest for `/health`, `/meta`, `/auth/me`, `/competitions`,
`/teams` and `/competitions/{code}/matchdays` — the same endpoint set as the
frozen MSW handlers, derived from the same mirrored bytes. Every other route
returns `PROVIDER_UNAVAILABLE` naming the blocking gap. There are no demo
writes: register/login/predictions/room posts/What-if turns are refused rather
than faked.

**Routes.** `/` (Journey), `/map`, `/impact`, `/community`,
`/community/rooms/[id]`, `/matches/[id]`, `/profile`, `/login`, `/register`,
`/premium`, plus Not Found and a route error boundary. `/` is the Journey, never
the map. The two dynamic routes are direct-linkable and reload-safe; a malformed
UUID 404s, and in demo mode an id absent from the manifest 404s.

**Design tokens.** `lib/design/competitions.ts` (PL blue / UCL purple+star /
FA Cup orange+cup / neutral fallback, original motifs only — no licensed logo or
third-party game artwork) and `lib/design/status.ts` (all eight A1 statuses
including SUSPENDED and UNKNOWN). The two scales share no CSS custom property,
every status renders a text label, and the pulse animation is removed under
`prefers-reduced-motion`. An unrecognised status degrades to UNKNOWN, never to
SCHEDULED.

**Shell and a11y.** Responsive to 360px with no horizontal scroll (nav moves to
a bottom bar below `sm`), skip link, visible focus rings, `aria-current` on the
active nav item, light and dark themes, per-route document titles.

**Provenance.** `DEMO DATA` / `DEMO AI` badges, a stale-source banner, and a
`Not available in this feed` component for data a provider does not supply.

**Honest states.** Shared loading/error/empty components; the error state
surfaces the contract `request_id`. Feature screens not yet built say which task
delivers them and which endpoints they need. The auth forms are genuinely
`disabled` with an explanation, so nothing can imply a session exists.

## Commands run (macOS, Node 22.22.2, pnpm 9.15.0 via corepack)

| Command | Result |
|---|---|
| `corepack pnpm install` | PASS |
| `corepack pnpm lint` | PASS — 0 errors, 0 warnings |
| `corepack pnpm typecheck` | PASS |
| `corepack pnpm test` | PASS — 11 files, 133 tests (76 pre-existing FE-00 contract tests still pass, 57 added) |
| `corepack pnpm build` | PASS — 12 routes |
| `corepack pnpm start` + HTTP checks | PASS — see below |
| Playwright e2e | **BLOCKED** — not set up in FE-01; needs the real backend and out-of-band demo credentials (FE-02 / G2) |
| Real-backend integration | **PARTIAL** — BE-01 run locally on SQLite; see the proxy-mode table |

Observed HTTP behaviour against `pnpm start`:

| Request | Result |
|---|---|
| `/`, `/map`, `/impact`, `/community`, `/profile`, `/login`, `/register`, `/premium` | 200 |
| `/does-not-exist` | 404 |
| `/matches/<manifest id>`, `…?tab=whatif` | 200 |
| `/matches/<valid uuid not in manifest>` | 404 |
| `/matches/not-a-uuid` | 404 |
| `/community/rooms/<manifest id>` | 200 |
| `/community/rooms/xyz` | 404 |
| `/api/v1/health`, `/meta`, `/auth/me`, `/competitions`, `/teams?competition=PL` | 200 |
| `/api/v1/teams?competition=XX` | 422 `INVALID_INPUT` |
| `/api/v1/competitions/PL/matchdays?season=1999` | 422 `INVALID_INPUT` |
| `/api/v1/journey` | 502 `PROVIDER_UNAVAILABLE`, naming the gap |
| `Cache-Control` / `Vary` on `/api/v1/*` | `private, no-store` / `Cookie` |

Checked for leakage into `.next/static`: no occurrence of `demo_manifest`,
`VERIFIED_SYNTHETIC`, `MATCHLINE_API_BASE_URL`, `localhost:8000` or team names.

## API / schema impact

**None.** No shared or protected file changed. No contract, manifest, fixture or
Appendix A artifact was edited, and no endpoint was added to the contract. The
demo handler implements a subset of the existing contract; it does not extend it.

## Decisions a reviewer should check

1. **Demo `/meta` now mirrors BE-01 exactly** (Q2 answered). Values are no
   longer placeholders and `capabilities.events` is hardcoded `false` to match
   the backend rather than derived from the manifest. See the Q2 section above.
2. **App code imports `tests/fixtures/` via `mocks/fixtures.ts`.** Deliberate:
   it guarantees demo mode and the CT-13 contract tests use identical bytes. The
   alternative — a second copy of the manifest — could drift.
3. **`.npmrc` pins `registry.npmjs.org`.** The lockfile had been generated
   through a personal mirror, which baked mirror-specific tarball URLs into it
   that a deploy builder cannot fetch. The lockfile was regenerated.
4. **Next.js 15.5.28, not 15.1.6.** 15.1.6 is flagged with a published
   advisory (CVE-2025-66478). Staying on the 15.x line avoids a Next 16
   migration inside the scaffold task.
5. **No root `app/loading.tsx`.** It made `notFound()` return 200 instead of
   404, because the Suspense boundary starts streaming the response first. Noted
   in `lib/demo/mode.ts` and the README so it is not reintroduced.

## Deployment

Vercel, project **Root Directory = `frontend`**. `frontend/vercel.json` sets
`nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` and
`X-Robots-Tag: noindex, nofollow` — the demo should not be indexed.

Deployed with `MATCHLINE_API_BASE_URL` unset, so the live site runs in demo mode
and every fact on it is labelled `DEMO DATA`. To point a deployment at a
backend, set that variable at **build** time as well as runtime so the pages
build as dynamic rather than being prerendered against the demo manifest.

No deployment has been created from this machine; nothing was pushed to a
hosting provider as part of this change.

## Next steps

- Backend: fix **B1** (blocks all FE-02 auth work), add the **B2** cache
  headers, resolve **D5**, and resolve or reject G1–G9, D1–D4 and Q1 / Q3 so
  FE-00 can freeze the remaining handlers and the three roles can run joint G0.
- Frontend (FE-02, after G0): typed API client over the proxy, cookie auth with
  Origin checks on writes, TanStack Query cache partitioned by identity with
  `no-store` on private and room routes, team picker, guest/authenticated
  favourite-team conflict consent, and `openapi-typescript` codegen replacing
  the hand-maintained `lib/api/types.ts`.
- Integration/QA: Playwright project and CI wiring for `lint`/`typecheck`/
  `test`/`build` (`.github/**` is not frontend-owned).
