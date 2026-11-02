import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pruebas contra un PostgreSQL 18 real en Docker (Testcontainers), con los
// mismos roles, extensiones y políticas RLS que producción (sección 10.10).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
