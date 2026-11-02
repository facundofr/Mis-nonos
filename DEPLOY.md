# Despliegue en un VPS (guía para un agente LLM)

Instrucciones paso a paso para poner **Mis Nonos (Residencia360)** en un VPS con Ubuntu y Docker,
publicado en **https://www.mis-nonos.facundofr.com**. Están escritas para que las siga un agente LLM
con acceso por SSH al servidor, pero las puede seguir cualquier persona.

- Repositorio: `https://github.com/facundofr/Mis-nonos.git` (rama `main`).
- Más detalle: [docs/runbooks/vps.md](docs/runbooks/vps.md) (preparación del servidor),
  [docs/runbooks/despliegue.md](docs/runbooks/despliegue.md) (actualizar y volver atrás),
  [docs/runbooks/restauracion.md](docs/runbooks/restauracion.md) (copias de seguridad) y
  [docs/decisions/0006-despliegue.md](docs/decisions/0006-despliegue.md).

---

## 0. Reglas para el agente

1. **Nunca** subas secretos al repositorio ni los muestres completos en la salida. Los secretos viven
   solo en `/etc/residencia360/*.env` (permisos `600`).
2. **Nunca** uses las contraseñas de desarrollo (`app_dev`, `owner_dev`, `postgres_dev`, etc.): generá
   claves nuevas con `openssl rand` (paso 4).
3. **Antes de cualquier acción destructiva** (borrar volúmenes, `docker system prune`, `DROP`, reinstalar),
   detenete y pedí confirmación. El volumen `residencia360_pgdata` tiene la base de datos.
4. Si el VPS ya tiene otros servicios (por ejemplo, otro proxy en los puertos 80/443), **no los toques**:
   avisá y pedí instrucciones (sección 9, "Puerto 80/443 ocupado").
5. No cargues datos reales de residentes hasta completar la lista de la sección 8.
6. Ejecutá los pasos en orden y verificá cada uno antes de seguir. Si algo falla, mirá la sección 9.

## 1. Cómo es la instalación

Todo corre con Docker Compose ([infra/compose/production.yaml](infra/compose/production.yaml)):

| Servicio   | Qué hace                                                                                 | Puertos         |
| ---------- | ---------------------------------------------------------------------------------------- | --------------- |
| `caddy`    | Proxy con HTTPS automático (Let's Encrypt), compresión y límite por IP                   | 80, 443 (único) |
| `app`      | La aplicación Next.js (pantallas, Server Actions, landing pública)                       | interno 3000    |
| `worker`   | Trabajos en segundo plano (pg-boss): avisos, emails, abono diario, limpieza              | ninguno         |
| `postgres` | PostgreSQL 18 con RLS y los roles `r360_owner`, `r360_app`, `r360_worker`, `r360_public` | ninguno         |
| `migrate`  | Herramienta (perfil `tools`): migraciones y alta de residencias                          | ninguno         |
| `backup`   | Copias cifradas fuera del VPS (perfil `backups`, se activa después)                      | ninguno         |

- La app, el worker y las herramientas salen de **una sola imagen** ([Dockerfile](Dockerfile)). En esta
  guía la imagen se **construye en el VPS** (`IMAGE_SOURCE=build`), sin registro de imágenes.
- El dominio `www.mis-nonos.facundofr.com` sirve todo:
  - `/` sin sesión → la landing pública (`/residencia/mis-nonos`), por `HOME_LANDING_SLUG`;
  - `/ingresar` → ingreso del personal;
  - `/residencia/mis-nonos/solicitar` → formulario para las familias (es opcional: las solicitudes
    también se cargan a mano en la app).
- Datos persistentes en volúmenes de Docker: `pgdata` (base), `storage` (fotos del legajo),
  `caddy_data` (certificados).

## 2. Requisitos

- **VPS:**
  - Ubuntu 22.04 o 24.04, arquitectura **amd64 (x86_64)**: las herramientas de copia de la imagen de
    PostgreSQL son para amd64;
  - Docker Engine con el plugin Compose v2;
  - mínimo 2 vCPU, 4 GB de RAM (recomendado 4 vCPU y 8 GB) y 40 GB libres de disco. Con menos de 8 GB,
    agregá swap antes de construir (paso 3).
- **DNS:** un registro `A` de `www.mis-nonos.facundofr.com` con la IP pública del VPS (y `AAAA` si
  tiene IPv6). Lo configura quien administra `facundofr.com`.
- **Puertos:** 80 y 443 (TCP) y 443 (UDP) abiertos desde internet. También en el firewall del
  proveedor, si tiene uno.
- **Email:** credenciales SMTP de un proveedor transaccional (Brevo, Resend, Mailgun, Amazon SES,
  etc.). En producción la app **exige** SMTP para:
  - invitaciones y recuperación de contraseña;
  - avisos del abono;
  - el acuse a las familias.
    El remitente necesita SPF, DKIM y DMARC en su dominio.
- **Un email para Let's Encrypt** (avisos de certificados) y **el email de la persona de
  Administración** que va a crear la cuenta inicial.

Si falta el DNS, el SMTP o el email de Administración, pediselo a la persona antes de seguir.

## 3. Verificar el servidor

```sh
uname -m                        # tiene que decir x86_64
. /etc/os-release && echo "$PRETTY_NAME"
docker --version && docker compose version   # Compose v2
free -h && df -h /
sudo ss -tlnp | grep -E ':(80|443)\s' || echo "80/443 libres"
getent hosts www.mis-nonos.facundofr.com     # debe devolver la IP de este VPS
curl -4 -s https://ifconfig.me; echo           # IP pública del VPS, para comparar
```

- Si `getent` no devuelve la IP del VPS, **pará**: el certificado HTTPS no se va a poder emitir. Pedí que
  configuren el DNS y esperá a que propague.
- Si 80/443 están ocupados, ver la sección 9.

**Swap** (si hay menos de 8 GB de RAM; la compilación de Next.js usa bastante memoria):

```sh
if ! swapon --show | grep -q .; then
  sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
```

**Firewall** (si `ufw` está disponible y no hay reglas que lo contradigan):

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
sudo ufw --force enable
```

Endurecimiento recomendado (usuario `deploy` sin contraseña, SSH solo con claves, actualizaciones
automáticas): [docs/runbooks/vps.md](docs/runbooks/vps.md), sección 1. Si lo aplicás, hacelo con
cuidado de no perder el acceso SSH.

## 4. Código y secretos

### 4.1 Código

```sh
sudo install -d -m 755 -o "$USER" -g "$USER" /opt/residencia360
git clone https://github.com/facundofr/Mis-nonos.git /opt/residencia360
cd /opt/residencia360 && git log -1 --oneline
```

El usuario que despliega tiene que poder usar Docker (`sudo usermod -aG docker "$USER"` y volver a
entrar por SSH) y escribir en `/opt/residencia360`.

### 4.2 Secretos

Este bloque crea los cinco archivos de configuración con **claves nuevas y aleatorias**. Antes de
correrlo, reemplazá los cuatro valores marcados con `<...>`:

- `ACME_EMAIL`, el email para Let's Encrypt;
- los cinco `SMTP_*`;
- `EMAIL_FROM`, el remitente.

No muestres el contenido de los archivos después.

```sh
sudo install -d -m 700 -o "$USER" -g "$USER" /etc/residencia360
cd /etc/residencia360
umask 077

gen() { openssl rand -base64 48 | tr -d '/+=\n' | cut -c1-40; }
PG_SUPER=$(gen); PG_OWNER=$(gen); PG_APP=$(gen); PG_WORKER=$(gen); AUTH_SECRET=$(gen)

DOMAIN=www.mis-nonos.facundofr.com

cat > compose.env <<EOF
# Datos para Compose (sin secretos).
IMAGE_SOURCE=build
APP_DOMAIN=$DOMAIN
ACME_EMAIL=<email-para-lets-encrypt>
PG_ARCHIVE_MODE=off
# Cuando las copias estén configuradas (sección 7): COMPOSE_PROFILES=backups
EOF

cat > app.env <<EOF
APP_URL=https://$DOMAIN
LOG_LEVEL=info
DATABASE_URL=postgres://r360_app:$PG_APP@postgres:5432/residencia360
DATABASE_URL_WORKER=postgres://r360_worker:$PG_WORKER@postgres:5432/residencia360
BETTER_AUTH_SECRET=$AUTH_SECRET
SMTP_HOST=<smtp.proveedor.com>
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USER=<usuario-smtp>
SMTP_PASSWORD=<clave-smtp>
EMAIL_FROM="Mis Nonos <avisos@<dominio-verificado>>"
STORAGE_DIR=/data/storage
HOME_LANDING_SLUG=mis-nonos
EOF

cat > owner.env <<EOF
APP_URL=https://$DOMAIN
DATABASE_URL_OWNER=postgres://r360_owner:$PG_OWNER@postgres:5432/residencia360
EOF

cat > postgres.env <<EOF
POSTGRES_DB=residencia360
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$PG_SUPER
R360_OWNER_PASSWORD=$PG_OWNER
R360_APP_PASSWORD=$PG_APP
R360_WORKER_PASSWORD=$PG_WORKER
EOF

cat > backup.env <<EOF
# Se completa en la sección 7 (copias fuera del VPS).
EOF

chmod 600 *.env
unset PG_SUPER PG_OWNER PG_APP PG_WORKER AUTH_SECRET
ls -l /etc/residencia360
```

Comprobá que no quedó ningún `<...>`:

```sh
grep -l '<' /etc/residencia360/*.env && echo "FALTA COMPLETAR" || echo "OK"
```

Notas:

- Las contraseñas de los roles se aplican **una sola vez**, cuando se crea la base. Si después las
  cambiás en los `.env`, también hay que cambiarlas en PostgreSQL (`ALTER ROLE ... PASSWORD`).
- `BETTER_AUTH_SECRET` firma las sesiones y cifra los secretos del 2FA. Si cambia, se cierran todas las
  sesiones y hay que rehacer los 2FA. Guardalo en el gestor de contraseñas de la persona responsable.
- Con SMTP en el puerto 465, usá `SMTP_PORT=465` y `SMTP_SECURITY=tls`.

## 5. Primer arranque

```sh
cd /opt/residencia360
compose="docker compose --env-file /etc/residencia360/compose.env -f infra/compose/production.yaml"
export APP_IMAGE="residencia360-app:sha-$(git rev-parse --short=12 HEAD)"

# 1. Imagen de la app (5 a 15 minutos la primera vez).
docker build --pull -t "$APP_IMAGE" .

# 2. Base de datos: la primera vez crea los roles (db/init/01-roles.sh).
$compose up -d --build postgres
$compose ps postgres            # esperar "healthy"

# 3. Migraciones (con el rol dueño).
$compose run --rm migrate       # termina con "Migraciones aplicadas."

# 4. Alta de la residencia y de la primera persona de Administración.
$compose run --rm migrate node dist/tools/create-organization.cjs \
  --residencia "Mis Nonos" --sede "Mis Nonos" \
  --email <email-de-administracion> --nombre "<Nombre Apellido>"
#    Muestra un enlace de invitación (vence en 72 h): dáselo a esa persona.

# 5. Todo lo demás: app, worker y proxy (Caddy pide el certificado).
$compose up -d --build
$compose ps                     # app y worker "healthy"; caddy "running"
```

**Guardá el enlace de invitación** del paso 4 y entregáselo a la persona de Administración por un canal
privado. No lo dejes en logs públicos.

Desde la segunda vez, para actualizar, usá la sección 6 (no repitas el paso 4: crearía otra residencia).

### 5.1 Verificar

```sh
curl -fsS https://www.mis-nonos.facundofr.com/api/health     # {"status":"ok"...}
curl -fsS https://www.mis-nonos.facundofr.com/api/ready      # base de datos y cola OK
curl -sI https://www.mis-nonos.facundofr.com/ | grep -i location   # → /residencia/mis-nonos (cuando esté publicada) o /ingresar
$compose logs --since 10m caddy | grep -i -E 'certificate|error' | tail
$compose logs --since 10m app worker | tail -n 50
```

### 5.2 Configuración inicial en la app (la hace la persona de Administración)

1. Abre el enlace de invitación, crea su contraseña y activa el 2FA (obligatorio para Administración y
   Dirección).
2. **Configuración › Residencia:** nombre, dirección, teléfono, servicio de emergencias.
3. **Configuración › Turnos** y **Usuarios:** invitar al personal.
4. **Configuración › Formulario público:** dirección `mis-nonos` (la misma que `HOME_LANDING_SLUG`),
   una presentación breve y "Publicar el formulario". Desde ese momento,
   `https://www.mis-nonos.facundofr.com/` muestra la landing a quien no tiene sesión.
   - Hasta que esté publicado, la raíz redirige a `/residencia/mis-nonos`, que da 404. Si se prefiere
     que la raíz lleve al ingreso mientras tanto, dejar `HOME_LANDING_SLUG=` vacío en `app.env` y
     reiniciar la app (`$compose up -d app`).
   - **El aviso de privacidad es un borrador:** antes de compartir la dirección con familias, tiene que
     revisarlo un abogado ([features/public-intake/privacy.ts](features/public-intake/privacy.ts)).

## 6. Actualizar a una versión nueva

```sh
bash /opt/residencia360/infra/deploy/deploy.sh origin/main
```

El script ([infra/deploy/deploy.sh](infra/deploy/deploy.sh)) hace, en orden:

1. pone el código en ese commit;
2. construye la imagen (`IMAGE_SOURCE=build`);
3. aplica las migraciones;
4. reinicia la app y el worker;
5. anota el despliegue en `/opt/residencia360/deploys.log`.

Cada despliegue deja una imagen nueva; de vez en cuando se pueden borrar las viejas con
`docker image prune` (solo imágenes, nunca volúmenes).

**Volver atrás:** `bash infra/deploy/deploy.sh <commit-anterior>`, con el commit anterior tomado de
`deploys.log`. Las migraciones solo agregan: la versión anterior sigue funcionando con la base nueva.
Nunca deshagas una migración a mano.

Alternativa con GitHub Actions y GHCR, con imágenes construidas en la nube y aprobación manual:
[docs/runbooks/despliegue.md](docs/runbooks/despliegue.md) y
[.github/workflows/deploy.yml](.github/workflows/deploy.yml). En ese caso, `IMAGE_SOURCE=registry`
e `IMAGE_REPO=ghcr.io/facundofr/mis-nonos` en `compose.env`.

## 7. Copias de seguridad (antes de cargar datos reales)

Hace falta un almacenamiento compatible con S3, **fuera del VPS**: Backblaze B2, Cloudflare R2,
Wasabi, AWS S3, etc.

1. Completar las variables `WALG_*` y `AWS_*` en `postgres.env`, y `backup.env` con:
   - las mismas `WALG_*` y `AWS_*`;
   - `PGHOST=postgres`, `PGUSER=postgres` y `PGPASSWORD` (la de `POSTGRES_PASSWORD`);
   - `RESTIC_REPOSITORY` y `RESTIC_PASSWORD`;
   - `TZ=America/Argentina/Buenos_Aires`.

   Todas las variables están en [docs/runbooks/vps.md](docs/runbooks/vps.md), "postgres.env" y
   "backup.env".

2. En `compose.env`: `PG_ARCHIVE_MODE=on` y `COMPOSE_PROFILES=backups`.
3. `$compose up -d --build` (reinicia PostgreSQL con el archivado de WAL y arranca `backup`).
4. Probar una restauración siguiendo [docs/runbooks/restauracion.md](docs/runbooks/restauracion.md).
5. Guardar `WALG_LIBSODIUM_KEY` y `RESTIC_PASSWORD` **fuera del servidor**: sin ellas, las copias no se
   pueden leer.

Copia manual rápida mientras tanto (no reemplaza lo anterior):

```sh
$compose exec -T postgres pg_dump -U postgres -Fc residencia360 > ~/residencia360-$(date +%F).dump
```

## 8. Lista antes de cargar datos reales

- [ ] HTTPS funcionando y `/api/ready` en 200 desde afuera.
- [ ] SMTP probado: una invitación llega y no cae en spam.
- [ ] Copias configuradas y **una restauración probada** (sección 7).
- [ ] Monitoreo externo de `https://www.mis-nonos.facundofr.com/api/ready` (por ejemplo UptimeRobot o
      healthchecks.io).
- [ ] SSH solo con claves; firewall activo; actualizaciones de seguridad automáticas.
- [ ] Aviso de privacidad revisado por un abogado y ubicación de los datos definida (DC-25).
- [ ] Archivos de `/etc/residencia360` con permisos `600`.

## 9. Problemas comunes

| Síntoma                                                      | Causa probable y qué hacer                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Caddy no obtiene el certificado (`acme`, `challenge failed`) | El DNS no apunta al VPS, o los puertos 80/443 están cerrados en el firewall del proveedor. Verificar con `getent hosts` y `curl -I http://www.mis-nonos.facundofr.com` desde otra máquina. Caddy reintenta solo.                                                                                                                           |
| Puerto 80/443 ocupado                                        | Hay otro servidor web (nginx, apache, otro Caddy o Traefik). **No lo detengas sin permiso.** Opciones: usar ese proxy para reenviar `www.mis-nonos.facundofr.com` a la app (quitar el servicio `caddy` y publicar `127.0.0.1:3000:3000` en `app` con un archivo `compose.override.yaml`), o liberar los puertos si la persona lo autoriza. |
| `docker build` se corta o la máquina se cuelga               | Falta memoria: agregar swap (sección 3) y reintentar.                                                                                                                                                                                                                                                                                      |
| `app` no queda `healthy`                                     | `$compose logs app`. Si dice "Variables de entorno inválidas", revisar `app.env`. Si no conecta a la base, revisar que las claves de `app.env` coincidan con `postgres.env` (se aplican solo al crear la base).                                                                                                                            |
| `password authentication failed` después de reinstalar       | El volumen `pgdata` ya existía con claves viejas. **No lo borres sin confirmación** (tiene los datos). Si la base está vacía y la persona lo autoriza: `$compose down` y `docker volume rm residencia360_pgdata`, y repetir la sección 5.                                                                                                  |
| Los emails no llegan                                         | `$compose logs worker                                                                                                                                                                                                                                                                                                                      | grep -i email`. Revisar `SMTP_*`y que el dominio de`EMAIL_FROM`esté verificado en el proveedor. Los trabajos fallidos se reintentan y después quedan en la cola`dead-letter`. |
| La raíz da 404                                               | El formulario público todavía no se publicó (sección 5.2, paso 4), o la dirección no coincide con `HOME_LANDING_SLUG`.                                                                                                                                                                                                                     |
| `/residencia/mis-nonos` da 404                               | El formulario no está publicado en Configuración › Formulario público, o la dirección elegida es otra.                                                                                                                                                                                                                                     |
| Migración falla                                              | `$compose run --rm migrate` muestra el error. No edites la base a mano: revisar el error, corregir en el repositorio y desplegar de nuevo.                                                                                                                                                                                                 |

## 10. Comandos útiles

```sh
cd /opt/residencia360
compose="docker compose --env-file /etc/residencia360/compose.env -f infra/compose/production.yaml"
export APP_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$($compose ps -q app)")   # imagen en uso

$compose ps                                  # estado
$compose logs -f --since 30m app worker      # logs (JSON, sin datos personales)
$compose restart app worker                  # reiniciar
$compose exec postgres psql -U postgres residencia360   # consola SQL (con cuidado)
tail /opt/residencia360/deploys.log          # historial de despliegues
```

(`APP_IMAGE` hace falta para cualquier comando de Compose: el archivo de producción lo exige.)
