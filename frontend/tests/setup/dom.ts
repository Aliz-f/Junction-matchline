/**
 * Test setup.
 *
 * DOM-only concerns are registered behind a `document` check so the
 * Node-environment contract tests (which hash fixtures and read files) are
 * unaffected.
 *
 * Testing Library's automatic cleanup hooks into a global `afterEach`, which
 * only exists when Vitest runs with `globals: true`. This project does not, so
 * cleanup is registered explicitly — otherwise renders leak between tests and
 * role queries find duplicate elements.
 */
import { afterEach } from "vitest";

if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
  });
}

export {};
