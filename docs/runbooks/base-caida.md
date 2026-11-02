# La base no responde

**Síntomas:**

- `/api/ready` devuelve 503 con `"database":"error"`;
- la app muestra "Algo salió mal";
- el monitor externo avisa.

Objetivo de recuperación: menos de 1 hora (RTO, 10.16).

## 1. Avisar

Avisarle a la dirección de la residencia que el sistema no está disponible
y que usen el procedimiento en papel de emergencias y traspaso. El sistema
no reemplaza el protocolo de emergencias (6.9).

## 2. Mirar

```sh
cd /opt/residencia360
compose="docker compose --env-file /etc/residencia360/compose.env -f infra/compose/production.yaml"
$compose ps postgres
$compose logs --since 30m postgres
df -h /                 # ¿disco lleno?
docker system df        # espacio de imágenes y volúmenes
```

## 3. Causas frecuentes

**El contenedor está caído:**

```sh
$compose up -d postgres
```

Si no arranca, el log dice por qué; casi siempre es disco o configuración.

**Disco lleno:**

1. Liberar imágenes viejas: `docker image prune -a` (no borra volúmenes).
2. Si `pg_wal` creció, casi siempre es porque `archive_command` falla: el
   WAL no se sube a las copias y se acumula.
   - Verlo con
     `$compose exec postgres psql -U postgres -c "select * from pg_stat_archiver"`.
   - Arreglar las credenciales o el acceso al almacenamiento de las copias
     (`postgres.env`).
3. **Nunca borrar archivos de `pg_wal` a mano**: se pierde la base.
4. Si no alcanza, agrandar el disco del VPS desde el proveedor.

**Demasiadas conexiones o consultas trabadas:**

```sh
$compose exec postgres psql -U postgres -c \
  "select pid, application_name, state, now() - query_start as duracion from pg_stat_activity order by duracion desc nulls last limit 20"
```

`application_name` dice si es la app, el worker o una migración. Cortar una
consulta trabada con `select pg_cancel_backend(<pid>)`.

**Los datos están dañados o se borró algo por error:** restaurar a un punto
en el tiempo (`restauracion.md`).

## 4. Después

- Verificar `/api/ready` y que la app y el worker estén `healthy`.
- Revisar que el WAL se esté subiendo otra vez (`pg_stat_archiver`:
  `last_failed_time` viejo y `last_archived_time` reciente).
- Anotar qué pasó, cuánto duró y qué se cambió para que no vuelva a pasar.
