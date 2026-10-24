// CT-13 (frontend half): byte-for-byte mirror and SHA-256 of BE-00 fixtures.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXPECTED_FIXTURE_SHA256 } from "@/mocks/fixtures";
import { frontendPath, repoPath, sha256File } from "./helpers";

const MIRRORS = [
  { name: "demo_manifest.json", backend: "backend/app/seed/demo_manifest.json" },
  { name: "contract_edge_cases.json", backend: "backend/tests/fixtures/contract_edge_cases.json" },
] as const;

describe.each(MIRRORS)("$name mirror", ({ name, backend }) => {
  const mirror = frontendPath(`tests/fixtures/${name}`);

  it("matches the SHA-256 published in the BE-00 handoff", () => {
    expect(sha256File(mirror)).toBe(EXPECTED_FIXTURE_SHA256[name]);
  });

  it("is byte-identical to the backend source of truth", () => {
    const source = repoPath(backend);
    expect(existsSync(source), `missing backend source ${backend}`).toBe(true);
    expect(readFileSync(mirror).equals(readFileSync(source))).toBe(true);
  });
});
