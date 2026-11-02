# Guía para agentes de programación

- Antes de cambiar algo, leer `RESIDENCIA360_CONTEXT.md` (sección 19:
  convenciones; Apéndice F: decisiones pendientes) y `docs/decisions/`.
- Se construye solo el MVP (fase 1), por etapas. Al cerrar cada etapa,
  informar con el formato de la sección 20 y actualizar el checklist del
  Apéndice A.
- Comandos: usar `corepack pnpm <script>` (pnpm no está instalado global).
  Antes de cerrar una tarea: `corepack pnpm check` y, si se tocó la base,
  `corepack pnpm test:integration` (requiere Docker).
- Base de datos: toda consulta de una residencia pasa por `withTenant`
  (`lib/db/tenant.ts`). Cada tabla nueva lleva políticas RLS
  (`tenantPolicies`) y sus `GRANT` explícitos en una migración a mano; sin
  `DELETE`.
- Acceso: cada pantalla con sesión llama a `requirePermission()` o
  `requireAppContext()`, y cada Server Action vuelve a verificar con
  `can()` (`lib/auth/`). Cada cambio se audita con `recordAudit()` en la
  misma transacción (`lib/audit`). La matriz de permisos está en
  `lib/auth/permissions.ts` y en una migración: se cambian juntas.
- Trabajos en segundo plano: la app solo escribe eventos con
  `emitDomainEvent()`; el worker (`worker/`) los pasa a la cola y los
  procesa con `withSystemTenant`. El worker no importa módulos con
  `server-only` (corre fuera de Next.js).
- Logs: usar `lib/logger` (en la app, `lib/logger/server`); nunca loguear
  datos de pacientes, familias, emails ni tokens.
- Las versiones están fijadas (`docs/decisions/0001`): no cambiar versiones
  mayores sin registrar la decisión.
- Next.js 16 cambió APIs respecto de versiones anteriores: consultar la
  documentación de la versión instalada en `node_modules/next/dist/docs/`
  (ver `AGENTS.md`, que genera `next dev`).
- `project/` es el diseño de referencia: no se modifica ni se importa.
- Nunca datos reales de residentes; nunca secretos en el repositorio.
