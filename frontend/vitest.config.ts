import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    // Existing suites exercise the live-backend path with a mocked fetch. Demo-mode tests opt in via vi.stubEnv.
    env: { NEXT_PUBLIC_DEMO_MODE: "false" },
  },
});
