# 0001 — Stack y versiones fijadas

- **Fecha:** 01/11/2026
- **Estado:** aceptada
- **Contexto:** la sección 10.10 pide fijar la versión exacta de cada
  herramienta al crear el repositorio y no cambiar versiones mayores en
  medio del piloto. Las versiones se consultaron en npm ese día.

## Versiones

| Herramienta       | Versión                         | Nota                                                            |
| ----------------- | ------------------------------- | --------------------------------------------------------------- |
| Node.js           | 24 (local: 24.16.0)             | LTS, como pide el plan                                          |
| pnpm              | 12.16.1                         | Se usa con corepack (`corepack pnpm …`), sin instalación global |
| Next.js           | 16.4.3                          | App Router, `output: "standalone"`                              |
| React / React DOM | 19.3.1                          |                                                                 |
| TypeScript        | 6.0.3                           | Ver desvío 1                                                    |
| Tailwind CSS      | 4.3.3                           | Con `@tailwindcss/postcss` 4.3.3                                |
| next-themes       | 0.4.6                           | Claro, oscuro y sistema                                         |
| lucide-react      | 1.61.0                          | Ver desvío 3                                                    |
| Zod               | 4.6.7                           |                                                                 |
| ESLint            | 9.39.5                          | Ver desvío 2; `eslint-config-next` 16.4.3                       |
| Prettier          | 3.9.10                          | Con `prettier-plugin-tailwindcss` 0.8.1                         |
| Vitest            | 5.0.5                           |                                                                 |
| PostgreSQL        | 18.6 (`postgres:18.6-bookworm`) | Etapa 2.2; `uuidv7()` nativo. Fijada en la 18.6 en la Etapa 2.6 |
| Drizzle ORM       | 0.45.4                          | Etapa 2.2; la 1.0 sigue en RC. `drizzle-kit` 0.31.11            |
| node-postgres     | 8.23.1                          | Etapa 2.2 (`pg`, con `@types/pg` 8.23.1)                        |
| Testcontainers    | 12.2.1                          | Etapa 2.2 (`@testcontainers/postgresql` 12.2.1)                 |
| tsx               | 4.23.15                         | Etapa 2.2; corre los scripts de `db/`                           |
| Better Auth       | 1.7.14                          | Etapa 2.3; ver desvío 4 y docs/decisions/0003                   |
| uqr               | 0.1.2                           | Etapa 2.3; QR del 2FA, sin dependencias                         |
| pg-boss           | 12.38.0                         | Etapa 2.5; cola de trabajos del worker (docs/decisions/0005)    |
| pino              | 10.4.0                          | Etapa 2.5; logs en JSON                                         |
| nodemailer        | 10.2.1                          | Etapa 2.5; email por SMTP. Ver desvío 5                         |
| esbuild           | 0.28.2                          | Etapa 2.5; compila el worker (la misma que trae tsx)            |
| Mailpit (imagen)  | `axllent/mailpit:v1.32.0`       | Etapa 2.5; emails de desarrollo. Ver desvío 5                   |

Playwright: 1.64.1 (`@playwright/test`, Etapa 3.1; docs/decisions/0007). Las
herramientas de las etapas siguientes (generación de PDF)
se fijan cuando se incorporan, y se agregan a esta tabla.

## Desvíos respecto de "la última versión"

1. **TypeScript 6.0.3 y no 7.0.2.** TypeScript 7 es la reescritura
   nativa del compilador y `typescript-eslint` (8.72.1) solo admite
   TypeScript `< 6.1`. Se revisa cuando el linter lo soporte.
2. **ESLint 9.39.5 y no 10.** `eslint-plugin-react` 7.37.5, que usa la
   configuración de Next.js, admite ESLint hasta 9. npm ya marca la 9
   como deprecada; como es una herramienta de desarrollo (no llega a
   producción), se acepta hasta que el plugin admita la 10.
3. **lucide-react 1.61.0 y no 1.66.0.** La 1.66.0 se publicó un día
   antes y pnpm la bloquea por su política de antigüedad mínima
   (protección contra paquetes comprometidos recién publicados). Se
   elige una versión de más de una semana en lugar de exceptuarla.
4. **Better Auth 1.7.14 y no 1.7.15.** La 1.7.15 salió el mismo día
   (01/11/2026) y pnpm la bloquea por antigüedad. Las notas de la 1.7.14
   y la 1.7.15 no traen arreglos de seguridad que afecten a esta
   configuración; se actualiza con Renovate.
5. **nodemailer 10.2.1 y Mailpit 1.32.0, no las últimas.** nodemailer
   10.3.x y Mailpit 1.33 tenían menos de una semana el 01/11/2026. Se
   eligió la última versión con más de una semana, como en el desvío 3.
   El registro de cambios de nodemailer no marca arreglos de seguridad
   posteriores a la 10.1.2, que ya está incluida.

## Seguridad de la cadena de dependencias

- pnpm 12 solo ejecuta scripts de instalación de los paquetes aprobados
  en `pnpm-workspace.yaml` (`allowBuilds`). Cada aprobación nueva se
  revisa en el PR.
  - Aprobados: `unrs-resolver` (linter) y `esbuild` (lo usan `tsx` y
    `drizzle-kit`).
  - Rechazados: `ssh2`, `cpu-features` y `protobufjs`. Llegan por
    Testcontainers y solo sirven para conectarse a Docker por SSH, que no
    se usa.
- No se agregan excepciones a la antigüedad mínima de versiones.

## Consecuencias

- Las actualizaciones las propone Renovate (Etapa 2.6) y se revisan en
  cada PR; las versiones mayores no cambian durante el piloto.
