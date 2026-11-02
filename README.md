# Residencia360 — piloto Mis Nonos

Plataforma web para residencias de adultos mayores: residentes, ficha de
emergencia, novedades, traspaso de turno y auditoría, construida por fases.

- **Plan completo:** [RESIDENCIA360_CONTEXT.md](RESIDENCIA360_CONTEXT.md)
  (leerlo antes de cambiar algo; el Apéndice F lista lo que falta decidir).
- **Diseño de referencia:** carpeta `project/` (canvas "Mis Nonos — Diseño
  del MVP"). Es solo referencia visual, no código de la app.
- **Decisiones técnicas:** [docs/decisions/](docs/decisions/).

## Requisitos

- Node.js 24 (ver `.nvmrc`).
- pnpm 12 mediante corepack, que viene con Node: `corepack pnpm …`.
- Docker Desktop, para la base de datos local y las pruebas de integración.

## Primeros pasos

```sh
corepack pnpm install
cp .env.example .env.local     # valores de desarrollo; completar BETTER_AUTH_SECRET
corepack pnpm db:up            # PostgreSQL 18 y Mailpit (infra/compose/dev.yaml)
corepack pnpm db:migrate       # aplica db/migrations con el rol dueño
corepack pnpm dev              # http://localhost:3000
corepack pnpm worker           # en otra terminal: trabajos en segundo plano
```

Con Docker andando, los emails de desarrollo se ven en Mailpit
(http://localhost:8025) si se descomentan las variables `SMTP_*` de
`.env.local`; si no, aparecen en la consola del servidor.

Para ingresar hace falta una residencia y su primer administrador (DC-12).
El script muestra un enlace de invitación; en desarrollo, los emails
aparecen en la consola del servidor.

```sh
corepack pnpm org:create --residencia "Residencia de prueba" --sede "Sede central" \
  --email administracion@ejemplo.com --nombre "Nombre Apellido"
```

Con el rol Administración, al primer ingreso se activa la verificación en
dos pasos (hace falta una app como Google Authenticator).

## Comandos

| Comando                           | Qué hace                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ |
| `corepack pnpm dev`               | App en modo desarrollo                                                   |
| `corepack pnpm build`             | Compilación de producción (`output: "standalone"`)                       |
| `corepack pnpm check`             | Linter, tipos y pruebas unitarias                                        |
| `corepack pnpm test:integration`  | Pruebas contra PostgreSQL real (requiere Docker)                         |
| `corepack pnpm test:e2e`          | Flujos completos en un teléfono emulado (Playwright; base y app locales) |
| `corepack pnpm format`            | Formatea el código con Prettier                                          |
| `corepack pnpm db:up` / `db:down` | Levanta o apaga la base local                                            |
| `corepack pnpm db:generate`       | Genera una migración a partir de `db/schema`                             |
| `corepack pnpm db:migrate`        | Aplica las migraciones pendientes                                        |
| `corepack pnpm org:create …`      | Alta de una residencia y su primer administrador                         |
| `corepack pnpm worker`            | Worker de la cola de trabajos (se reinicia solo)                         |
| `corepack pnpm worker:build`      | Compila el worker para producción (`dist/worker`)                        |

## Despliegue

Un VPS con Docker Compose (etapa A del plan): proxy Caddy con HTTPS, app,
worker, PostgreSQL 18 y copias de seguridad cifradas fuera del servidor.
Se despliega desde GitHub Actions, con aprobación manual para producción,
o construyendo la imagen en el mismo VPS.

- **Guía paso a paso (también para un agente LLM), para
  `www.mis-nonos.facundofr.com`: [DEPLOY.md](DEPLOY.md)**
- Preparar el servidor: [docs/runbooks/vps.md](docs/runbooks/vps.md)
- Desplegar y volver atrás: [docs/runbooks/despliegue.md](docs/runbooks/despliegue.md)
- Copias y restauración: [docs/runbooks/restauracion.md](docs/runbooks/restauracion.md)
- Demás manuales (caída de la base, secretos, incidentes):
  [docs/runbooks/](docs/runbooks/)

## Estructura

```text
app/                 Pantallas (Next.js App Router)
  (auth)/            Ingreso, 2FA, recuperar contraseña, invitaciones
  (app)/             Pantallas con sesión
  api/               Chequeos de salud (/api/health, /api/ready)
proxy.ts             Redirección al ingreso y CSP con nonce
instrumentation.ts   Errores del servidor al log, sin datos personales
components/          Componentes de interfaz
lib/                 Código compartido del servidor
  auth/              Better Auth, sesiones, permisos, límites de intentos
  audit/ events/     Auditoría y eventos de dominio
  db/                Conexión, withTenant y withSystemTenant
  email/             Envío de emails (SMTP, consola en desarrollo)
  jobs/              Colas de trabajos y suscriptores de eventos
  logger/            Logs en JSON y limpieza de datos personales
  security/          Content Security Policy
  storage/           Archivos privados y enlaces temporales
worker/              Worker de pg-boss (proceso aparte de la app)
scripts/             Scripts de operación (alta de residencias)
db/schema/           Tablas (Drizzle), con sus políticas RLS
db/migrations/       SQL generado y revisado; los permisos van a mano
db/init/             Script que crea los roles de la base
infra/compose/       Docker Compose de desarrollo y de producción
infra/caddy/         Proxy con HTTPS y límite de pedidos
infra/postgres/      PostgreSQL con WAL-G y restic (copias de seguridad)
infra/deploy/        Script de despliegue del VPS
.github/workflows/   CI y despliegue
docs/runbooks/       Manuales de operación
tests/unit/          Pruebas unitarias (Vitest)
tests/integration/   Pruebas con PostgreSQL 18 real (Testcontainers)
docs/decisions/      Registro de decisiones técnicas
```

## Reglas que no se negocian

- Toda consulta de datos de una residencia pasa por `withTenant`
  (`lib/db/tenant.ts`), que fija la residencia y el usuario en el servidor.
- Cada página y cada Server Action con sesión llama a `requireAppContext()`
  (`lib/auth/session.ts`); `proxy.ts` no alcanza. Los permisos se
  verifican con `requirePermission()` o `can()` (`lib/auth/authorization.ts`).
- Cada cambio se audita con `recordAudit()` en la misma transacción.
- La app se conecta con un rol sin `BYPASSRLS`; las migraciones, con el
  dueño; la cola de trabajos, con su propio rol (`r360_worker`).
- Los logs nunca llevan datos de pacientes ni de familias: se usa el logger
  de `lib/logger`, que además limpia los errores de la base.
- No hay borrados físicos: se anula, se desactiva o se versiona.
- Nunca datos reales de residentes en desarrollo, pruebas ni demos.
- Nada de secretos en el repositorio: `.env.local` no se sube.
