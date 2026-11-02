# Copias de seguridad y restauración

Qué se copia (10.16, F.8, DC-08). Todo va cifrado y fuera del VPS:

- **Base de datos (WAL-G):**
  - WAL continuo, con un segmento al menos cada 5 minutos;
  - una copia completa por día (02:30);
  - se conservan las últimas 14 copias completas.
  - Permite volver a cualquier momento de las últimas dos semanas.
- **Fotos del legajo (restic):** todos los días a las 03:00. Se conservan
  14 diarias, 8 semanales y 12 mensuales.
- Los domingos se borran las copias viejas y se verifica el repositorio de
  las fotos.

Objetivos: pérdida máxima de datos de 5 minutos (RPO) y recuperación en
menos de 1 hora (RTO).

## Puesta en marcha (una vez)

Con `postgres.env` y `backup.env` completos (vps.md):

```sh
cd /opt/residencia360
compose="docker compose --env-file /etc/residencia360/compose.env -f infra/compose/production.yaml"

# 1. Repositorio de las fotos.
$compose run --rm --entrypoint restic backup init

# 2. WAL continuo: PG_ARCHIVE_MODE=on en compose.env y reiniciar la base.
$compose up -d postgres

# 3. Primera copia completa, sin esperar a la noche.
$compose exec backup /usr/local/share/residencia360-backup/backup-db.sh
$compose exec backup /usr/local/share/residencia360-backup/backup-files.sh

# 4. Ver que estén.
$compose exec backup wal-g backup-list
$compose exec backup restic snapshots
```

Después, **probar una restauración completa en staging** (abajo). Hasta
que no haya una restauración probada, no se cargan datos reales
(F1-PROD-02).

## Restaurar la base a un momento

Se restaura sobre un volumen nuevo: el actual queda intacto hasta confirmar
que la restauración está bien.

```sh
# 1. Frenar la app y el worker (que nadie escriba).
$compose stop app worker

# 2. Volumen nuevo con la copia completa más reciente.
docker volume create residencia360_pgdata_restore
docker run --rm --env-file /etc/residencia360/backup.env \
  -v residencia360_pgdata_restore:/var/lib/postgresql \
  --entrypoint bash residencia360-postgres:18.6 -c '
    set -e
    mkdir -p /var/lib/postgresql/18/docker
    wal-g backup-fetch /var/lib/postgresql/18/docker LATEST
    touch /var/lib/postgresql/18/docker/recovery.signal
    chown -R postgres:postgres /var/lib/postgresql
    chmod 700 /var/lib/postgresql/18/docker'
```

3. Recuperar hasta un momento (hora UTC). Se arranca un PostgreSQL
   temporal sobre el volumen restaurado, con el WAL del almacenamiento:

```sh
docker run -d --name r360-restore --env-file /etc/residencia360/postgres.env \
  -v residencia360_pgdata_restore:/var/lib/postgresql residencia360-postgres:18.6 \
  postgres -c "restore_command=wal-g wal-fetch %f %p" \
           -c "recovery_target_time=2026-11-01 13:45:00+00" \
           -c "recovery_target_action=promote"
docker logs -f r360-restore   # esperar "database system is ready to accept connections"
```

4. Revisar los datos, por ejemplo con
   `docker exec r360-restore psql -U postgres -d residencia360 -c "select count(*) from audit_events"`.
5. Si están bien:
   - `docker stop r360-restore && docker rm r360-restore`;
   - renombrar volúmenes, o cambiar `pgdata` en el Compose por el volumen
     restaurado;
   - `$compose up -d`.
6. El volumen viejo se conserva unos días por si hace falta comparar.

## Restaurar las fotos

```sh
$compose stop app worker
# Todas las fotos de la última copia, sobre el volumen de fotos:
docker run --rm --env-file /etc/residencia360/backup.env \
  -v residencia360_storage:/data/storage \
  --entrypoint restic residencia360-postgres:18.6 restore latest --target /
$compose up -d app worker
```

Para una sola foto o una fecha: `restic snapshots` para elegir la copia y
`restic restore <id> --target /tmp/rescate --include /data/storage/<ruta>`.
La ruta de cada foto está en la tabla `files` (`storage_key`).

## Prueba mensual (en staging)

1. Restaurar en staging la última copia de producción (base y fotos), con
   los pasos de arriba.
2. Ingresar y abrir algunas fichas y fotos.
3. Comparar la cantidad de residentes y de eventos de auditoría con
   producción.
4. Anotar en `docs/runbooks/registro-restauraciones.md`: fecha, copia usada,
   tiempo total, resultado y problemas.

Staging queda con datos reales después de la prueba. Se borra al terminar
(`docker compose down -v` en staging), salvo que staging tenga las mismas
protecciones que producción.

## Las claves

`WALG_LIBSODIUM_KEY` y `RESTIC_PASSWORD` cifran las copias. Se guardan en
dos lugares fuera del VPS (gestor de contraseñas y papel sellado). **Si se
pierden, las copias no sirven.** Cambiarlas: `secretos.md`.
