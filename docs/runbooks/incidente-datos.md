# Incidente con datos personales

Por ejemplo:

- acceso indebido;
- un enlace o un archivo expuesto;
- un dispositivo perdido con una sesión abierta;
- credenciales filtradas;
- datos que se ven desde otra residencia.

Los datos de salud son datos sensibles (Ley 25.326, 12.2): se actúa
enseguida y se deja todo documentado.

## 1. Contener (en la primera hora)

Según el caso:

**Cerrar las sesiones de una persona**, por ejemplo por un teléfono perdido:

```sh
cd /opt/residencia360
compose="docker compose --env-file /etc/residencia360/compose.env -f infra/compose/production.yaml"
$compose exec postgres psql -U postgres -d residencia360 -c \
  "delete from sessions where user_id = (select id from users where email = '<email>')"
```

**Quitarle el acceso a la residencia:** desactivar su usuario desde
"Usuarios y roles" (Administración), o en la base, marcar su membresía como
`disabled`.

**Cerrar todas las sesiones:** rotar `BETTER_AUTH_SECRET` (secretos.md).

**Credenciales filtradas:** rotarlas (secretos.md).

**Falla de la app:** si no hay un arreglo inmediato, apagar la app
(`$compose stop app`) y avisar a la residencia que use el procedimiento en
papel.

**No borrar nada:** logs, auditoría y registros del servidor son la
evidencia. Copiarlos antes de cualquier cambio:

```sh
$compose logs --since 72h app worker > /root/incidente-$(date +%F).log
```

## 2. Evaluar (en las primeras 24 horas)

La auditoría (`audit_events`) dice quién vio o cambió qué y cuándo,
incluidas las aperturas de la ficha de emergencia y de las fotos. Por
ejemplo, lo que hizo una persona en un período:

```sql
select occurred_at, action, entity_type, entity_id, metadata
from audit_events
where actor_user_id = '<id-del-usuario>'
  and occurred_at between '<desde>' and '<hasta>'
order by occurred_at;
```

**Responder:**

- qué datos se expusieron (identificación, salud, contactos, documentos,
  pagos);
- de cuántas personas y de qué residencias;
- desde cuándo y hasta cuándo;
- si sigue abierto.

## 3. Avisar

- **A la dirección de la residencia afectada**, siempre, con lo que se sabe
  y lo que no.
- **Al abogado**, que define si corresponde avisar a la Agencia de Acceso a
  la Información Pública (AAIP) y a las personas afectadas, y con qué texto.
- **A las personas afectadas**, si el abogado lo indica, con un mensaje
  claro: qué pasó, qué datos, qué se hizo y a quién consultar.

Nunca se manda el detalle de los datos por email ni por WhatsApp.

## 4. Cerrar

- **Arreglo:** corregir la causa, con una prueba que la cubra. Por ejemplo,
  una prueba negativa de autorización (17.1).
- **Informe del incidente:**
  - cronología, alcance y causa;
  - qué se hizo y a quién se avisó;
  - qué cambia para que no vuelva a pasar.
- **Revisar este manual** si algo no sirvió.
