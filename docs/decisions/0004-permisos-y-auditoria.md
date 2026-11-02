# 0004 — Permisos como datos, módulos y auditoría

- **Fecha:** 01/11/2026
- **Estado:** aceptada. DC-01 y DC-04 confirmadas el 01/11/2026.
- **Contexto:** Etapa 2.4. Cimientos E3 (módulos activables), E4 (permisos
  como datos), E7 (auditoría) y E8 (eventos de dominio); matriz F.3 del
  plan.

## Decisiones

1. **La matriz F.3 vive como datos.**
   - `permissions` tiene las 23 claves, cada una con su módulo.
   - `role_permissions` tiene los 65 pares de los 4 roles de sistema.
   - Los carga la migración 0005.
   - La misma matriz está en `lib/auth/permissions.ts`. Una prueba
     unitaria compara el SQL con el código y una de integración compara la
     base con el código.
   - Cambiar un permiso requiere una migración nueva y el mismo cambio en
     el código.

2. **`can()` en el servidor** (`lib/auth/authorization.ts`).
   - Permisos efectivos = los del rol que pertenecen a módulos activos de
     la residencia (`organization_modules`).
   - Se calculan una vez por pedido.
   - Las pantallas usan `requirePermission()`, que lleva a `/sin-permiso`.
   - Las Server Actions usan `can()` y devuelven un mensaje.
   - No se usa `forbidden()` de Next.js porque sigue siendo experimental.

3. **Roles de sistema:** `admin`, `direccion`, `enfermeria` y `cuidado`,
   con `organization_id` nulo. El modelo admite roles propios de cada
   residencia, pero el MVP no tiene pantalla para crearlos.

4. **Auditoría con valores anteriores y nuevos (DC-04).**
   - `recordAudit()` escribe en la misma transacción que el cambio: si el
     cambio se deshace, el registro también.
   - `changes` guarda `{ campo: { antes, despues } }` de los campos que
     cambiaron, calculado con `diffChanges()`.
   - Contraseñas, tokens y secretos se reemplazan por `[oculto]`.
   - Las acciones tienen la forma `módulo.verbo` (por ejemplo,
     `resident.updated`).
   - La base solo permite agregar registros (RLS y permisos, 0002).

5. **Eventos de dominio** (`lib/events`).
   - `emitDomainEvent()` escribe en la misma transacción que el cambio
     (patrón outbox).
   - El `payload` lleva identificadores, no datos personales completos.
   - Los procesa el worker de la Etapa 2.5.

6. **Módulos.** El script de alta activa `core` y `fees` (DT-05). La app
   solo los lee: los activa la plataforma.

## Consecuencias

- Cada pantalla de la Etapa 3 usa `requirePermission()` o `can()`, y cada
  cambio usa `recordAudit()`. Cada módulo suma pruebas de permisos por rol.
- Las pantallas que muestran el historial (`audit.read_resident` y
  `audit.read_all`) llegan con Actividad, en la Etapa 3.
- Las pruebas de integración (`tests/integration/permissions.test.ts`)
  están escritas y falta correrlas con Docker.
