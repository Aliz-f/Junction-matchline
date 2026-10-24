# Matchline frontend

Next.js App Router frontend for the Matchline Phase 1 demo. FE-00 (contract
shell) and FE-01 (scaffold, app shell and UX foundation) are in place; the
feature screens land in FE-02 onwards.

## Run it

```sh
corepack pnpm install
corepack pnpm dev          # http://localhost:3000
```

Checks:

```sh
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## Data modes

The browser only ever calls the relative path `/api/v1`. There is no
`NEXT_PUBLIC_API_BASE_URL`, so no backend origin reaches the browser bundle.
One server-only variable selects where those calls go:

| `MATCHLINE_API_BASE_URL` | Behaviour |
|---|---|
| unset (default) | **Demo mode.** `app/api/v1/[...path]/route.ts` replays the frozen BE-00 demo manifest. Everything it serves is labelled `DEMO DATA`. Endpoints the manifest does not fully determine return a `PROVIDER_UNAVAILABLE` envelope naming the blocking gap — never invented data. |
| e.g. `http://localhost:8000` | **Proxy mode.** A `beforeFiles` rewrite in `next.config.ts` proxies `/api/v1/*` to the real backend and the demo handlers never run. |

Switching to the real backend is an environment change, not a code change.
Copy `.env.example` to `.env.local` and set the variable.

> Demo mode exists so the shell is navigable before the backend is deployed. It
> is not a backend, is not authoritative, and passing against it never
> constitutes a gate PASS — see `FE01_HANDOFF.md`.

## Layout

| Path | Contents |
|---|---|
| `app/` | Routes. `/` is the Journey (never the map); `/matches/[id]` and `/community/rooms/[id]` are direct-linkable and reload-safe. |
| `app/api/v1/[...path]/` | Demo-mode handler. Server-only. |
| `components/layout/` | Shell, header, primary navigation, demo clock indicator. |
| `components/ui/` | Status and competition badges, provenance labels, loading/error/empty states, generic icons. |
| `lib/api/` | Appendix A DTOs as Zod schemas (`contract.ts`) and inferred types. |
| `lib/design/` | Competition tokens (colour + motif) and status tokens (icon + tone + label), kept strictly separate. |
| `lib/demo/` | Manifest-derived demo responses and data-mode resolution. Server-only. |
| `mocks/` | Typed fixture access and frozen MSW handlers. |
| `tests/fixtures/` | Byte-for-byte copies of backend-owned JSON. Never edit; re-copy. |
| `tests/contract/` | CT-13 mirror, manifest, edge-case and drift checks. |
| `tests/unit/` | FE-01 token, time, navigation, demo-mode and component tests. |

## Conventions worth knowing before you edit

- **Competition sets colour and motif; status sets icon, tone, animation and
  label.** The two scales share no CSS custom property, and every status always
  renders a text label, so colour and motion are never the only signal.
- **Times** are stored and transported as UTC and rendered in Europe/London with
  an explicit timezone cue via `lib/time.ts`.
- **Provenance is mandatory.** Synthetic data is labelled `DEMO DATA`, scripted
  AI `DEMO AI`. Do not suppress these to make a demo look better.
- **No root `app/loading.tsx`.** It wraps the segment in Suspense, so the
  response streams with a 200 before the page renders and a later `notFound()`
  returns 200 instead of 404. Put loading boundaries on leaf segments that do
  not call `notFound()`.
- **No no-op controls.** Every visible action navigates, mutates real state, or
  is genuinely `disabled` with an explanation. The auth forms are inert and say
  so, rather than faking a session.
- **`.npmrc` pins the public npm registry** so the committed lockfile resolves
  identically locally, in CI and on the deploy builder.

## Deploying (Vercel)

Set the Vercel project's **Root Directory** to `frontend`. Next.js and pnpm are
detected from `package.json` (`packageManager` is pinned), and `vercel.json`
adds the security headers.

Leave `MATCHLINE_API_BASE_URL` unset to deploy in demo mode. Set it — at build
time as well as runtime, so the pages build as dynamic — to point a deployment
at a reachable backend.

## Gate status

FE-00 and FE-01 are built against mocks, and FE-01 is additionally part-verified
against the real BE-01 backend. **G0 is still BLOCKED** on the backend
items in [FE00_HANDOFF.md](FE00_HANDOFF.md); mocked work may continue while a
gate is blocked, but no integrated status is PASS until the real backend is
verified. See [FE01_HANDOFF.md](FE01_HANDOFF.md).
