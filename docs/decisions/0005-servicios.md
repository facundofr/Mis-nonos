# 0005 — Servicios: worker, email, archivos, logs y seguridad HTTP

- **Fecha:** 01/11/2026
- **Estado:** aceptada. DC-08 confirmada el 01/11/2026 (disco del VPS con
  copia cifrada fuera del servidor).
- **Contexto:** Etapa 2.5. Cimientos E8 (eventos de dominio), E12
  (archivos), E15 (trabajos programados) y E16 (observabilidad); secciones
  10.5, 10.14 y 10.16 del plan; Apéndice F (F.8 y F.9).

## Decisiones

1. **Worker aparte con pg-boss 12.** Un proceso distinto de la app
   (`worker/index.ts`) corre la cola de trabajos sobre PostgreSQL: no hace
   falta otra infraestructura.
   - Reintentos con espera creciente, cola `dead-letter` para los trabajos
     que agotan sus reintentos y apagado ordenado (espera hasta 30 s los
     trabajos en curso) (10.16).
   - Trabajos programados con zona horaria. El primero borra todos los días,
     a las 03:15, las sesiones y los enlaces de un solo uso vencidos.
   - En producción corre como un solo archivo compilado con esbuild
     (`corepack pnpm worker:build` → `dist/worker/index.cjs`).

2. **Un rol de base propio para el worker (`r360_worker`).**
   - Es dueño solo del esquema `pgboss`, donde pg-boss crea sus tablas.
     Lo crea el script de roles (`db/init/01-roles.sh`), no las migraciones,
     porque hace falta un superusuario.
   - En las tablas de la app solo puede leer `domain_events` y cambiar
     `processed_at` de los que siguen pendientes (políticas RLS y permiso
     por columna, migraciones 0006 y 0007).
   - El trabajo de cada residencia (avisos, emails) lo hace con el rol de la
     app y `withSystemTenant`: las mismas políticas RLS que la app, con el
     sistema como autor en la auditoría.
   - La app no puede leer ni escribir la cola.

3. **Eventos de dominio → cola en una sola transacción (outbox).** La app
   solo escribe en `domain_events`, en la misma transacción que el cambio.
   Cada 5 segundos, el worker:
   - toma los eventos pendientes con `FOR UPDATE SKIP LOCKED` (dos workers
     no toman el mismo);
   - crea un trabajo por suscriptor con la misma transacción
     (`fromDrizzle` de pg-boss);
   - marca los eventos como procesados.

   Si algo falla, no queda nada a medias. La app no depende de pg-boss.
   Los suscriptores de cada evento están en `lib/jobs/queues.ts`.

4. **Email por SMTP con nodemailer 10.** Cambiar de proveedor es cambiar
   variables de entorno.
   - En desarrollo: Mailpit (`infra/compose/dev.yaml`, http://localhost:8025)
     o, sin `SMTP_HOST`, la consola del servidor.
   - En producción `SMTP_HOST` es obligatorio y el canal tiene que ir
     cifrado: STARTTLS exigido o TLS directo.
   - Los emails de autenticación (invitación, recuperar contraseña) los
     envía la app en el momento, porque llevan un enlace secreto que no
     debe quedar en la cola. Los avisos (abono, solicitudes) los enviará el
     worker y no llevan nombres ni montos (12.10).
   - El proveedor real y el dominio (SPF, DKIM, DMARC) se eligen con DC-09.

5. **Archivos en el disco local, detrás de una interfaz (DC-08).**
   - `FileStorage` con un adaptador de disco (`lib/storage/local-disk.ts`):
     carpetas 700, archivos 600, y nunca se pisa un archivo existente.
   - Claves sin nombre ni extensión (`residencia/año/mes/aleatorio`),
     validadas contra salidas de la carpeta.
   - El tipo se detecta por los primeros bytes. Se aceptan JPG, PNG, WebP
     y PDF, hasta 10 MB; HTML, SVG y ejecutables se rechazan.
   - **Enlaces temporales:** HMAC de 5 minutos, atados al archivo y a la
     persona, con una clave derivada del secreto de la app (HKDF).
   - La tabla `files` y la ruta que entrega los archivos (sesión, permiso y
     auditoría de cada apertura) llegan con el legajo, en la Etapa 3.
   - Copia cifrada fuera del servidor: Etapa 2.6.
   - En la etapa B se cambia el adaptador por uno compatible con S3, sin
     tocar la app.

6. **Logs en JSON con pino 10, sin datos personales.**
   - `lib/logger/scrub.ts` limpia los errores antes de registrarlos:
     - quita los parámetros de las consultas de Drizzle y el `detail` de
       PostgreSQL, que traen valores (por ejemplo, un email);
     - reemplaza emails y tokens de cualquier mensaje;
     - conserva el código, la tabla y la restricción, que alcanzan para
       diagnosticar.
   - Los campos `password`, `token`, `secret`, `email`, `phone`,
     `nationalId`, `cookie` y `authorization` se ocultan en cualquier log.
   - `instrumentation.ts` registra los errores de pantallas, acciones y
     rutas con la ruta del pedido, sin la query y sin el token de las
     invitaciones.
   - En producción, la consola pasa por la misma limpieza, porque Next.js
     escribe ahí sus propios errores.
   - La pantalla de error muestra el `digest`, que también figura en el log,
     para buscar el caso sin datos.

7. **Chequeos de salud** (10.14). Son públicos y no devuelven detalles.
   - `/api/health`: el proceso responde.
   - `/api/ready`: la base y el almacenamiento responden; si no, devuelve 503.
   - El pool de la base corta a los 5 s si no consigue conexión, para fallar
     rápido en lugar de colgarse. Ya no se cae el proceso si la base corta
     una conexión inactiva.

8. **CSP estricta con nonce** (10.16, F1-STK-07).
   - `proxy.ts` genera un nonce de 128 bits por pedido. Next.js lo agrega a
     sus scripts y el layout se lo pasa a next-themes.
   - En producción no hay `unsafe-inline` ni `unsafe-eval`, ni scripts o
     conexiones a otros dominios.
   - Las rutas `/api/*` llevan `default-src 'none'`.
   - Consecuencia: todas las pantallas se renderizan por pedido. Ya lo eran
     casi todas, porque dependen de la sesión.
   - Se verificó con el build de producción en Edge: hidrata, aplica el tema
     y no hay violaciones en la consola.

## Consecuencias y pendientes

- **Pendiente de Docker:**
  - las pruebas de integración de esta etapa
    (`tests/integration/worker.test.ts`), que cubren el rol del worker, el
    paso a la cola, que la app no vea la cola y la limpieza diaria;
  - Mailpit.
- **Etapa 2.6:** el proxy (límite de pedidos por IP), las imágenes, el
  Compose del VPS, las copias de seguridad de la base y de las fotos, y el
  monitoreo externo.
- **Errores en Sentry o GlitchTip:** esperan la elección del servicio. No se
  mandan datos a terceros sin aprobación.
- **Variables nuevas:** ver `.env.example`.
