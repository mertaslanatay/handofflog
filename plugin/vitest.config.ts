import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The core diff engine is pure TypeScript and must run without the Figma
    // global or a DOM. A plain node environment guarantees that isolation.
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
