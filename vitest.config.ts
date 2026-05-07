import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Sprint v9 STREAM-E3: separate vitest config to keep vite.config.ts focused
// on the dev server / bundler concerns. The dev middleware in vite.config.ts
// reads the host filesystem and is not needed for unit tests.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Force React to use the development build so testing-library's `act` is
  // available (the optimizeDeps block in vite.config.ts does the same for
  // the dev server; we duplicate it here for the vitest runner).
  define: {
    "process.env.NODE_ENV": '"development"',
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "community-forum-rs", ".git"],
    server: {
      deps: {
        inline: ["@testing-library/jest-dom"],
      },
    },
  },
});
