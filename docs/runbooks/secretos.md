# Rotación de secretos

Los secretos viven solo en `/etc/residencia360/*.env` (permisos 600) y en
los secretos de GitHub. Nunca en el repositorio ni en un log.

**Cuándo rotar:**

- si una persona con acceso deja el proyecto;
- si se sospecha una filtración (`incidente-datos.md`);
- las claves de la base y del email, una vez por año.

En todos los casos, después de rotar: `/api/ready` en 200, ingresar a la
app y revisar los logs del worker.

```sh
cd /opt/residencia360
compose="docker compose --env-file /etc/residencia360/compose.env -f infra/compose/production.yaml"
```

## Contraseñas de los roles de la base

Ejemplo con el de la app; igual para `r360_worker` y `r360_owner`.

```sh
$compose exec postgres psql -U postgres -c "ALTER ROLE r360_app PASSWORD '<nueva>'"
# Cambiarla en app.env (DATABASE_URL); para el dueño, en owner.env.
$compose up -d app worker
```

`postgres.env` guarda las contraseñas iniciales, que solo se usan al crear
la base: actualizarlas igual, para no confundir.

## BETTER_AUTH_SECRET

Firma las sesiones, cifra los secretos del 2FA y genera los enlaces
temporales a las fotos. Rotarlo:

- cierra todas las sesiones;
- **obliga a Administración y Dirección a volver a activar el 2FA**, porque
  los secretos viejos ya no se pueden leer.

Solo ante una sospecha de filtración:

1. Avisar al personal que va a tener que volver a ingresar.
2. Generar el nuevo valor (vps.md) y ponerlo en `app.env`.
3. Borrar los 2FA viejos, que quedaron ilegibles:
   `$compose exec postgres psql -U postgres -d residencia360 -c "delete from two_factors; update users set two_factor_enabled = false"`.
4. `$compose up -d app worker`.

## Email (SMTP)

1. Crear la credencial nueva en el proveedor.
2. Cambiar `SMTP_USER` y `SMTP_PASSWORD` en `app.env` y reiniciar
   (`$compose up -d app worker`).
3. Probar con "¿Olvidaste tu contraseña?" desde una cuenta de prueba.
4. Revocar la credencial vieja.

## Copias de seguridad

**Contraseña de restic** (`RESTIC_PASSWORD`): restic permite varias claves,
así que no hace falta volver a cifrar.

```sh
$compose run --rm --entrypoint restic backup key add      # pide la nueva
$compose run --rm --entrypoint restic backup key list
$compose run --rm --entrypoint restic backup key remove <id-de-la-vieja>
```

Después, actualizar `backup.env` y la copia guardada fuera del servidor.

**Clave de WAL-G** (`WALG_LIBSODIUM_KEY`): las copias viejas siguen
necesitando la clave vieja.

1. Guardar la clave vieja junto con la fecha del cambio.
2. Poner la nueva en `postgres.env` y `backup.env`.
3. `$compose up -d postgres backup` y hacer en seguida una copia completa
   (`backup-db.sh`).
4. La clave vieja se descarta cuando la retención (14 copias) ya no tiene
   copias suyas.

**Credenciales del almacenamiento** (`AWS_*`): crear las nuevas en el
proveedor, cambiarlas en `postgres.env` y `backup.env`, reiniciar
`postgres` y `backup`, y revocar las viejas.

## Acceso al VPS y a GitHub

- **Clave SSH de despliegue:**
  1. Generar una nueva (`ssh-keygen -t ed25519`).
  2. Agregar la pública en `/home/deploy/.ssh/authorized_keys`.
  3. Cambiar `DEPLOY_SSH_KEY` en GitHub.
  4. Quitar la vieja de `authorized_keys`.
- **Token de GHCR del VPS:** crear uno nuevo con `read:packages`, hacer
  `docker login ghcr.io` en el VPS y revocar el viejo.
- **Persona que deja el proyecto:**
  - quitar su clave de `authorized_keys`;
  - quitarle el acceso al repositorio y a los entornos de GitHub;
  - rotar los secretos que pudo ver.
