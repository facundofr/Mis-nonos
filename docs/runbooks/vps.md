# Preparar el VPS (producción o staging)

Etapa A del plan (10.17 y Apéndice F, F.8). Se hace una vez por servidor.
Staging es otro VPS chico con el mismo procedimiento, otra base y otros
secretos.

## Antes de empezar

- **Ubicación del VPS y de las copias:** definirla con el abogado antes de
  cargar datos reales (DC-25, 12.2).
- **Servidor:**
  - Ubuntu 24.04 LTS, arquitectura amd64 (x86_64): los binarios de las
    copias son para amd64;
  - al menos 4 vCPU y 8 GB de RAM;
  - disco para la base, las fotos y las imágenes de Docker (empezar con
    80 GB).
- **Dominio:** un registro A (y AAAA si hay IPv6) del subdominio de la app
  apuntando al VPS (DC-09).
- **Almacenamiento para las copias:** compatible con S3 y fuera del VPS. Es
  otro proveedor o, como mínimo, otra región.
- **Email transaccional:** el proveedor con SPF, DKIM y DMARC configurados
  en el dominio del remitente.

## 1. Sistema y acceso (10.8)

```sh
# Como root, una sola vez.
apt update && apt full-upgrade -y
apt install -y unattended-upgrades ufw git
dpkg-reconfigure -plow unattended-upgrades     # actualizaciones de seguridad automáticas

adduser --disabled-password --gecos "" deploy   # usuario de despliegue, sin contraseña
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# Copiar en /home/deploy/.ssh/authorized_keys las claves públicas autorizadas
# (la personal y la de GitHub Actions, cada una en su línea).
chmod 600 /home/deploy/.ssh/authorized_keys && chown deploy:deploy /home/deploy/.ssh/authorized_keys
```

En `/etc/ssh/sshd_config.d/residencia360.conf`:

```text
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
AllowUsers deploy
```

Después, `systemctl reload ssh`. **Antes de cerrar la sesión de root,
probar que `deploy` entra con su clave.**

Firewall: solo SSH y web. La base no tiene puertos publicados.

```sh
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # mejor aún: ufw allow from <IP fija> to any port 22
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw enable
```

> Docker publica los puertos de Caddy por su cuenta (iptables), pero solo
> Caddy publica puertos en `infra/compose/production.yaml`.

## 2. Docker

Instalar Docker Engine y el plugin de Compose desde el repositorio oficial
de Docker (docs.docker.com/engine/install/ubuntu). Después:

```sh
usermod -aG docker deploy
```

El grupo `docker` equivale a root en el servidor: solo `deploy` lo tiene, y
`deploy` solo entra con clave.

## 3. Código y secretos

```sh
# Como root
install -d -m 755 -o deploy -g deploy /opt/residencia360
install -d -m 700 -o deploy -g deploy /etc/residencia360

# Como deploy: el repositorio, con una "deploy key" de solo lectura.
git clone git@github.com:<organizacion>/<repositorio>.git /opt/residencia360

# Imágenes privadas en GHCR: un token con permiso read:packages.
docker login ghcr.io -u <usuario-de-github>
```

En `/etc/residencia360/` van cinco archivos, todos `chmod 600` y de
`deploy`. Para generar contraseñas y claves:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
# o, sin Node: openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
```

**compose.env**: datos para Compose, sin secretos.

```sh
IMAGE_SOURCE=registry   # "build": la imagen se construye en el VPS, sin GHCR (DEPLOY.md)
IMAGE_REPO=ghcr.io/<organizacion>/<repositorio>   # en minúsculas (solo con registry)
APP_DOMAIN=app.ejemplo.com.ar
ACME_EMAIL=sistemas@ejemplo.com.ar
PG_ARCHIVE_MODE=off   # "on" cuando las copias estén configuradas (restauracion.md)
# COMPOSE_PROFILES=backups   # arranca el servicio de copias (con backup.env completo)
```

**app.env**: la app y el worker.

```sh
APP_URL=https://app.ejemplo.com.ar
LOG_LEVEL=info
DATABASE_URL=postgres://r360_app:<clave-app>@postgres:5432/residencia360
DATABASE_URL_WORKER=postgres://r360_worker:<clave-worker>@postgres:5432/residencia360
BETTER_AUTH_SECRET=<32 bytes aleatorios>
SMTP_HOST=<proveedor>
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USER=<usuario>
SMTP_PASSWORD=<clave>
EMAIL_FROM="Mis Nonos <avisos@ejemplo.com.ar>"
STORAGE_DIR=/data/storage
# Landing en la raíz del dominio para quien no tiene sesión (docs/decisions/0016).
HOME_LANDING_SLUG=
```

**owner.env**: solo para migraciones y alta de residencias.

```sh
APP_URL=https://app.ejemplo.com.ar   # para el enlace de invitación del alta
DATABASE_URL_OWNER=postgres://r360_owner:<clave-dueno>@postgres:5432/residencia360
```

**postgres.env**: la base. Las contraseñas de los roles se usan una sola
vez, cuando se crea la base (`db/init/01-roles.sh`).

```sh
POSTGRES_DB=residencia360
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<clave-superusuario>
R360_OWNER_PASSWORD=<clave-dueno>
R360_APP_PASSWORD=<clave-app>
R360_WORKER_PASSWORD=<clave-worker>
# WAL-G: lo usa PostgreSQL para subir el WAL (ver backup.env).
WALG_S3_PREFIX=s3://<bucket>/residencia360/base
AWS_ACCESS_KEY_ID=<clave-de-acceso>
AWS_SECRET_ACCESS_KEY=<secreto>
AWS_ENDPOINT=https://<endpoint-s3-del-proveedor>
AWS_REGION=<region>
AWS_S3_FORCE_PATH_STYLE=true
WALG_LIBSODIUM_KEY=<64 caracteres hex: openssl rand -hex 32>
WALG_LIBSODIUM_KEY_TRANSFORM=hex
WALG_COMPRESSION_METHOD=brotli
```

**backup.env**: el servicio de copias. Lleva las mismas variables `WALG_*`
y `AWS_*` que `postgres.env`, y además:

```sh
PGHOST=postgres
PGUSER=postgres
PGPASSWORD=<clave-superusuario>
RESTIC_REPOSITORY=s3:<endpoint-s3-del-proveedor>/<bucket>/residencia360/fotos
RESTIC_PASSWORD=<32 bytes aleatorios>
# Opcional: monitor externo que avisa si una copia no llega (p. ej. healthchecks).
BACKUP_PING_URL=
TZ=America/Argentina/Buenos_Aires
```

**Las claves `WALG_LIBSODIUM_KEY` y `RESTIC_PASSWORD` se guardan también
fuera del servidor**, en el gestor de contraseñas de la dirección y en una
copia en papel sellada. Sin ellas, las copias no se pueden leer.

## 4. Primer arranque

```sh
cd /opt/residencia360
export APP_IMAGE=$(grep IMAGE_REPO /etc/residencia360/compose.env | cut -d= -f2-):sha-<commit>
compose="docker compose --env-file /etc/residencia360/compose.env -f infra/compose/production.yaml"

$compose up -d postgres                 # crea la base y los roles
$compose run --rm migrate               # aplica las migraciones
$compose run --rm migrate node dist/tools/create-organization.cjs \
  --residencia "Mis Nonos" --sede "Sede central" \
  --email <email-de-administracion> --nombre "<Nombre Apellido>"
$compose up -d                          # app, worker, proxy y copias
```

El alta muestra el enlace de invitación (vence en 72 h): la persona crea su
contraseña y activa el 2FA. Desde ahí, cada despliegue es `deploy.sh`
(despliegue.md).

## 5. Monitoreo (F.8)

- **Disponibilidad:** un chequeo externo, fuera del VPS, contra
  `https://<APP_DOMAIN>/api/ready` cada minuto, con aviso por email o
  teléfono. Puede ser un servicio de uptime o Uptime Kuma en otro servidor.
- **Copias:** `BACKUP_PING_URL` apunta a un monitor que alerta si una copia
  no llega en 26 horas.
- **Disco:** alerta al 80 % (la del proveedor del VPS o un chequeo del
  monitor externo).
- **Logs:** `docker compose … logs --since 1h app worker`. Son JSON y no
  llevan datos personales (docs/decisions/0005).
- Errores en Sentry o GlitchTip: cuando se elija el servicio, con borrado de
  datos personales.

## Lista final antes de cargar datos reales

- [ ] SSH solo con claves; root sin acceso; firewall activo.
- [ ] Actualizaciones de seguridad automáticas.
- [ ] Los archivos de `/etc/residencia360` con permisos 600.
- [ ] HTTPS funcionando y `/api/ready` en 200 desde afuera.
- [ ] Copias configuradas (`PG_ARCHIVE_MODE=on`) y **una restauración probada**
      en staging (restauracion.md, F1-PROD-02).
- [ ] Monitoreo externo de disponibilidad, de copias y de disco.
- [ ] Ubicación de los datos definida con el abogado (DC-25).
