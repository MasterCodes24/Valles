import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@engine": resolve(import.meta.dirname, "src/engine"),
      "@config": resolve(import.meta.dirname, "src/config"),
      "@api": resolve(import.meta.dirname, "src/api"),
    },
  },
  test: {
    // Vitest config — tests run without jsdom (engine is pure TS)
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});

