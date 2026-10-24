# FE-01 handoff — Next.js scaffold, app shell and UX foundation

Branch `frontend`. Scope: `frontend/**` only. No shared, protected, backend or
`.github/**` file was edited.

## Gate status, stated plainly

- **FE-01: built and verified against demo fixtures.**
- **G0: still BLOCKED** on the backend items G1–G9, D1–D4 and Q1–Q3 in
  `FE00_HANDOFF.md`. None of them is resolved by this change.
- **G1 and later: not started, not claimed.**

`CONTRIBUTING.md` allows independently mocked work to continue while a gate is
blocked, provided its integrated status is not reported as PASS. That is exactly
this change: the shell is real and tested, but nothing here has been run against
a FastAPI backend, so **no gate is PASS**.

The task board lists joint G0 sign-off as a dependency of FE-01. This work was
started ahead of that sign-off on the repository owner's explicit instruction,
with backend-dependent items deferred to an integration phase. Recording it here
so the sequencing is visible rather than implied.

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
| Real-backend integration | **BLOCKED** — no FastAPI instance was run |

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

1. **Demo `/meta` placeholders (Q2 still open).** `server_now_utc` is the
   manifest `demo_clock` and `demo_epoch` is 1 per A3b, but Appendix A does not
   specify the initial `scenario_revision` or `capabilities.events` /
   `live_updates` in DEMO mode. `scenario_revision: 1`, `live_updates: false`
   and `events` derived from the manifest fixtures are **demo-mode placeholders,
   not agreed contract values**, documented as such in `lib/demo/responses.ts`.
   They must be replaced by the backend's answer at G1.
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

- Backend: resolve or reject G1–G9, D1–D4 and Q1–Q3 so FE-00 can freeze the
  remaining handlers and the three roles can run joint G0.
- Frontend (FE-02, after G0): typed API client over the proxy, cookie auth with
  Origin checks on writes, TanStack Query cache partitioned by identity with
  `no-store` on private and room routes, team picker, guest/authenticated
  favourite-team conflict consent, and `openapi-typescript` codegen replacing
  the hand-maintained `lib/api/types.ts`.
- Integration/QA: Playwright project and CI wiring for `lint`/`typecheck`/
  `test`/`build` (`.github/**` is not frontend-owned).
