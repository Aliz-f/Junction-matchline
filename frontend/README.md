# Matchline frontend

Pre-G0 FE-00 contract shell: Appendix A v2.4 schemas, mirrored BE-00
fixtures and frozen MSW handlers. The Next.js app arrives in FE-01, after G0.

```sh
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
```

- `lib/api/contract.ts` — Appendix A DTOs as Zod schemas; `lib/api/types.ts` infers types.
- `mocks/` — typed fixture access and MSW handlers.
- `tests/fixtures/` — byte-for-byte copies of backend-owned JSON; never edit.
- `tests/contract/` — CT-13 mirror/manifest/edge-case checks and drift checks.

Gate status and open backend items: [FE00_HANDOFF.md](FE00_HANDOFF.md).
