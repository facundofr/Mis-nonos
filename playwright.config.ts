import { tmpdir } from "node:os";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

/*
 * Pruebas de punta a punta (sección 10.10 y F1-QA-03): flujos completos en
 * un teléfono emulado, contra la app y una base reales. Cada prueba crea su
 * propia residencia con datos ficticios (tests/e2e/support).
 *
 * Requisitos: corepack pnpm db:up && corepack pnpm db:migrate. La app la
 * levanta Playwright si no está corriendo.
 * Localmente usa el Edge instalado (sin bajar navegadores); en CI, Chromium.
 */
export default defineConfig({
  testDir: "tests/e2e",
  // Fuera del proyecto: si no, el servidor de desarrollo ve los archivos
  // nuevos de cada prueba como cambios y recarga la página sin parar.
  outputDir: path.join(tmpdir(), "residencia360-e2e"),
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "movil",
      use: { ...devices["Pixel 7"], channel: process.env.CI ? undefined : "msedge" },
    },
  ],
  webServer: {
    command: "corepack pnpm dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
