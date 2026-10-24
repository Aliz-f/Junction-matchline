import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // The FE-00 contract tests run in Node (they hash files and read fixtures).
    // FE-01 component tests need a DOM, so only those switch to jsdom.
    environment: "node",
    environmentMatchGlobs: [["tests/unit/**", "jsdom"]],
    setupFiles: ["tests/setup/dom.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
