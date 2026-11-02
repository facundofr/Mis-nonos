# 0002 — Multi-residencia con Row Level Security

- **Fecha:** 01/11/2026
- **Estado:** aceptada (DC-07 aceptada el 01/11/2026; ver 0003)
- **Contexto:** secciones 10.9 (E1, E2, E4, E6, E7, E8), 10.12 y 10.13 del
  plan. La app es para Mis Nonos ahora y SaaS después (DT-02): los
  cimientos multi-residencia se construyen desde el inicio.

## Decisiones

1. **Roles de base de datos** (tres desde la Etapa 2.5).
   - `r360_owner`: dueño de la base y de las tablas. Corre las migraciones
     y los scripts de alta (`scripts/migrate.ts`). No está sujeto a RLS.
   - `r360_app`: con el que se conecta la app. `NOSUPERUSER`,
     `NOBYPASSRLS`, sin ser dueño de ninguna tabla. Lo verifica una prueba.
   - `r360_worker` (desde la Etapa 2.5): el de la cola de trabajos. Es
     dueño solo del esquema `pgboss` y en las tablas de la app solo lee y
     marca los eventos de dominio (docs/decisions/0005).
   - En desarrollo los crea `db/init/01-roles.sh`; en producción, el manual
     de base de datos (Etapa 2.6).

2. **Contexto por transacción.** `withTenant` (`lib/db/tenant.ts`) abre una
   transacción y fija `app.org_id` y `app.user_id` con
   `set_config(..., true)`. El valor vale solo dentro de esa transacción, así
   que no queda en la conexión cuando el pool la reutiliza (hay una prueba).
   Las funciones `app.current_org_id()` y `app.current_user_id()` devuelven
   `NULL` sin contexto: sin contexto no se ve ninguna fila.

3. **Políticas.** Toda tabla operativa tiene políticas de `SELECT`,
   `INSERT` y `UPDATE` con `organization_id = app.current_org_id()`
   (`tenantPolicies`), solo para `r360_app`. Para cualquier otro rol sin
   políticas, RLS niega todo.
   - Excepción de lectura: cada persona ve sus propias membresías y las
     organizaciones donde trabaja, para elegir residencia al entrar
     (`withUserContext`).

4. **Permisos explícitos y sin borrados.** No hay privilegios por defecto:
   cada migración otorga lo justo a `r360_app`. Ninguna tabla tiene `DELETE`
   (E6). La auditoría y los eventos de dominio solo admiten `INSERT` y
   `SELECT`.

5. **Integridad entre sede y organización.** `sites` tiene una restricción
   única sobre `(id, organization_id)` y las tablas que apuntan a una sede
   usan una clave foránea compuesta `(site_id, organization_id)`: no se
   puede mezclar una sede con otra organización (11.4).

6. **Identificadores UUIDv7** generados por PostgreSQL 18 (`uuidv7()`).

7. **Excepciones a RLS, documentadas:**
   - `users`: la identidad es global (una persona puede trabajar en varias
     residencias) y el ingreso la busca por email antes de conocer la
     residencia. No contiene datos de residentes.
   - `permissions`: catálogo global, de solo lectura para la app.
   - Las demás tablas de identidad (`accounts`, `sessions`,
     `verifications`, `two_factors`) siguen la misma excepción: ver 0003.

8. **DC-07 (Better Auth).** Better Auth solo para identidad, sesiones y
   2FA. Organizaciones, membresías, invitaciones y roles van en tablas
   propias, porque encajan con RLS y con permisos como datos (E4). Aceptada
   el 01/11/2026; el detalle está en 0003.

9. **Particionado postergado.** `audit_events` y `domain_events` no se
   particionan en el piloto (~0,5 GB por año; Apéndice F, F.8). Los índices
   ya empiezan por `organization_id`. Si el volumen lo pide, se pasa a
   particionado nativo con un trabajo mensual, sin `pg_partman`.

## Consecuencias

- Toda consulta de datos de una residencia pasa por `withTenant`; las
  pantallas nunca usan la conexión sin contexto.
- Una tabla nueva sin su `GRANT` es inaccesible para la app: el error
  aparece en desarrollo, no en producción.
- Las pruebas de `tests/integration/rls.test.ts` corren contra un
  PostgreSQL 18 real (Testcontainers) con los mismos roles y políticas.
