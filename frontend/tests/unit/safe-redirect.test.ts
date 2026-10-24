/**
 * Return-to path validation (FE-02).
 *
 * `?next=` is attacker-controllable, so this is open-redirect prevention rather
 * than a convenience. Anything that is not a plain same-origin path must fall
 * back to the default.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_RETURN_PATH, safeReturnPath } from "@/lib/safe-redirect";

describe("safeReturnPath", () => {
  it("accepts a plain same-origin path", () => {
    expect(safeReturnPath("/profile")).toBe("/profile");
    expect(safeReturnPath("/matches/30000000-0000-4000-8000-000000000003")).toBe(
      "/matches/30000000-0000-4000-8000-000000000003",
    );
  });

  it("keeps a query string and fragment", () => {
    expect(safeReturnPath("/matches/abc?tab=whatif")).toBe("/matches/abc?tab=whatif");
    expect(safeReturnPath("/impact#standings")).toBe("/impact#standings");
  });

  it("falls back when nothing is supplied", () => {
    expect(safeReturnPath(null)).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath(undefined)).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("")).toBe(DEFAULT_RETURN_PATH);
  });

  it("rejects an absolute URL", () => {
    expect(safeReturnPath("https://evil.example/phish")).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("http://evil.example")).toBe(DEFAULT_RETURN_PATH);
  });

  it("rejects a protocol-relative host", () => {
    expect(safeReturnPath("//evil.example/phish")).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("//evil.example")).toBe(DEFAULT_RETURN_PATH);
  });

  it("rejects a javascript or data scheme", () => {
    expect(safeReturnPath("javascript:alert(1)")).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("/javascript:alert(1)")).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("data:text/html,<script>")).toBe(DEFAULT_RETURN_PATH);
  });

  it("rejects a backslash, which some parsers treat as a separator", () => {
    expect(safeReturnPath("/\\evil.example")).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("\\\\evil.example")).toBe(DEFAULT_RETURN_PATH);
  });

  it("rejects a path that is not rooted", () => {
    expect(safeReturnPath("profile")).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("../admin")).toBe(DEFAULT_RETURN_PATH);
  });

  it("rejects embedded control characters", () => {
    expect(safeReturnPath("/profile\n")).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("/\u0000/evil")).toBe(DEFAULT_RETURN_PATH);
    expect(safeReturnPath("/\u001f")).toBe(DEFAULT_RETURN_PATH);
  });
});
