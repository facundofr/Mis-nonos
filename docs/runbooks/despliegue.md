# Desplegar y volver atrás

Cada versión es una imagen `ghcr.io/<organizacion>/<repositorio>:sha-<commit>`
con la app, el worker y las herramientas. Se despliega en staging, se
prueba, y después en producción con aprobación manual (10.10).

## Despliegue normal

1. El cambio entra a `main` por un PR con la CI en verde (`ci.yml`).
2. En GitHub: **Actions → Deploy → Run workflow**, entorno `staging`.
   - Construye y publica la imagen, la analiza con Trivy y corre en el VPS
     `infra/deploy/deploy.sh <commit>`.
   - `deploy.sh` aplica las migraciones y reinicia la app y el worker.
3. Probar en staging los flujos tocados: ingresar, la pantalla cambiada,
   `/api/ready`.
4. Repetir con el entorno `production`. GitHub pide la aprobación de un
   revisor antes de ejecutar.

Desde el VPS, sin GitHub (por ejemplo, si GitHub no responde):

```sh
bash /opt/residencia360/infra/deploy/deploy.sh <commit>
```

La imagen de ese commit tiene que estar publicada en GHCR.

## Verificar

```sh
cd /opt/residencia360
compose="docker compose --env-file /etc/residencia360/compose.env -f infra/compose/production.yaml"
$compose ps                              # app y worker "healthy"
curl -fsS https://<APP_DOMAIN>/api/ready  # {"status":"ok",…}
$compose logs --since 15m app worker      # sin errores nuevos
tail /opt/residencia360/deploys.log       # qué se desplegó y cuándo
```

## Volver atrás

1. Buscar el commit anterior en `/opt/residencia360/deploys.log`.
2. Desplegarlo: `deploy.sh <commit-anterior>` (o el workflow con ese `ref`).

Las migraciones solo agregan (expandir y después contraer, 10.16): la
versión anterior sigue funcionando con la base nueva. **Nunca se deshace
una migración a mano.** Si una migración dañó datos, se sigue
`restauracion.md` (recuperación a un punto en el tiempo, antes del
despliegue).

## Reglas

- Nunca se despliega a producción sin pasar por staging ni sin aprobación.
- Una migración que borra o renombra va en dos despliegues: primero el
  código deja de usar la columna; después se quita.
- No se cambian versiones mayores durante el piloto sin una decisión
  registrada (docs/decisions/0001).
