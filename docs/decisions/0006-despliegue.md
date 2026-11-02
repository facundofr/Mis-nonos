# 0006 — Despliegue en el VPS, copias de seguridad y CI

- **Fecha:** 01/11/2026
- **Estado:** aceptada. Escrita y sin probar: en esta máquina Docker no
  funciona y el repositorio todavía no está en GitHub.
- **Contexto:** Etapa 2.6. Secciones 10.8, 10.10, 10.14, 10.16 y 10.17;
  Apéndice F, F.8 (perfil de VPS de la etapa A) y DC-08 (fotos en el disco
  del VPS con copia cifrada fuera del servidor).

## Decisiones

1. **Una sola imagen** (`Dockerfile`), igual en staging y producción.
   - Contiene:
     - la app (Next.js `standalone`);
     - el worker y las herramientas, compilados con esbuild
       (`dist/worker`, `dist/tools`);
     - las migraciones.
   - Base `node:24.22.1-bookworm-slim`, la última versión de Node 24 con
     arreglos de seguridad que tiene más de una semana.
   - El proceso corre como `node`, sin privilegios. El código es de solo
     lectura y solo se escribe en `/data/storage` y en la caché.
   - La imagen se etiqueta `sha-<commit>`: volver atrás es desplegar el
     commit anterior.

2. **Compose de producción** (`infra/compose/production.yaml`). Servicios:
   - `caddy`: proxy con HTTPS automático;
   - `app` y `worker`;
   - `postgres`: PostgreSQL 18.6, sin puertos publicados;
   - `backup`: copias de seguridad;
   - `migrate`: herramientas, que solo corren a pedido.

   Medidas comunes:
   - Contenedores de solo lectura, sin capacidades de Linux y con rotación
     de logs.
   - Healthchecks: `/api/health` para la app y un archivo de latido para el
     worker.
   - **Secretos repartidos por necesidad**, en `/etc/residencia360/*.env`
     con permisos 600:
     - `app.env` no tiene el rol dueño (que no pasa por RLS);
     - `owner.env` lo usan solo las migraciones y el alta de residencias.
   - **Staging:** otro VPS chico con el mismo Compose (F.8). En el mismo
     VPS chocarían los puertos 80 y 443.

3. **Caddy 2.11.7 con el módulo de límite de pedidos.** El Caddy oficial no
   lo trae; el módulo es del autor de Caddy y está fijado por commit
   (`infra/caddy/Dockerfile`).
   - Límites por IP: 600 pedidos y 60 envíos de formulario por minuto.
     Los límites de la app (ingreso, recuperación) siguen igual
     (docs/decisions/0003).
   - Archivos de hasta 12 MB.
   - **Sin registro de accesos en el proxy:** las URL pueden llevar tokens y
     la actividad de cada persona ya queda en la auditoría de la app. Los
     errores del proxy sí se registran.

4. **Copias de seguridad cifradas fuera del VPS** (10.16, DC-08). Todo en
   una imagen de PostgreSQL con WAL-G 3.0.9, restic 0.19.1 y supercronic
   0.2.51 (`infra/postgres/Dockerfile`), cada binario verificado con su
   SHA-256.
   - **Base:**
     - PostgreSQL sube el WAL continuo con WAL-G; `archive_timeout=300`
       da una pérdida máxima de 5 minutos;
     - el servicio `backup` hace una copia completa diaria;
     - se cifra con libsodium.
   - **Fotos:** restic, diario, cifrado.
   - **Retención:** 14 copias completas de la base; para las fotos, 14
     diarias, 8 semanales y 12 mensuales.
   - El WAL continuo se activa con `PG_ARCHIVE_MODE=on` una vez configurado
     el almacenamiento. Si se activara sin almacenamiento, el WAL se
     acumularía en el disco.
   - El servicio `backup` corre como root sin capacidades, salvo
     `DAC_READ_SEARCH` (leer archivos ajenos), con todo montado en solo
     lectura.
   - Un monitor externo avisa si una copia no llega (`BACKUP_PING_URL`).
   - El destino (proveedor y país) se define con DC-25, antes de cargar
     datos reales.

5. **CI con GitHub Actions** (`.github/workflows/ci.yml`):
   - formato, linter, tipos y pruebas unitarias;
   - `drizzle-kit check` y `pnpm audit` de producción;
   - pruebas de integración con PostgreSQL real (Testcontainers usa el
     Docker del runner);
   - compilación;
   - imágenes analizadas con Trivy 0.76.1.

   Las acciones van fijadas por commit. Trivy corre desde su imagen
   oficial, sin una acción de terceros.

6. **Despliegue manual** (`.github/workflows/deploy.yml`):
   - construye y publica la imagen en GHCR, la analiza y corre por SSH
     `infra/deploy/deploy.sh <commit>`;
   - el script deja el repositorio del VPS en ese commit, aplica las
     migraciones y reinicia;
   - producción exige la aprobación de un revisor (entorno protegido de
     GitHub);
   - los secretos pasan por variables de entorno, no dentro de los scripts.

7. **Renovate** (`renovate.json`): semanal, solo versiones con más de 7
   días, versiones mayores con aprobación y acciones fijadas por commit.
   Las alertas de seguridad no esperan.

8. **PostgreSQL 18.6 en todos lados:** desarrollo, pruebas y producción
   usan la misma versión menor.

9. **Manuales de operación** en `docs/runbooks/` (F1-PROD-05):
   - preparación y endurecimiento del VPS;
   - despliegue y vuelta atrás;
   - caída de la base;
   - restauración, con un registro mensual;
   - rotación de secretos;
   - incidente con datos personales.

## Pendientes

- Probar todo esto cuando haya Docker:
  - las tres imágenes y el Compose completo;
  - una restauración en staging antes de cargar datos reales (F1-PROD-02).
- **Hace falta del usuario o de la residencia:**
  - el repositorio en GitHub (todavía sin commits, por decisión del
    usuario);
  - el VPS y el dominio (DC-09);
  - el proveedor de email;
  - el almacenamiento de las copias y su ubicación (DC-25).
- Errores en Sentry o GlitchTip, cuando se elija el servicio.
- Si los binarios de copias necesitan una versión nueva, se cambia la
  versión y su SHA-256 juntas. Renovate no puede calcular las sumas.
