# 0010 — Novedades y seguimiento

- **Fecha:** 02/11/2026
- **Estado:** aceptada. Reglas de F.4 confirmadas el 01/11/2026; DC-03
  confirmada (sin responsable asignado).
- **Contexto:** Etapa 3.4. Secciones 7.3-F, 7.3-I, 11.2 (`resident_notes`),
  13.2; Apéndice F (F.4, F.5, F.6).

## Decisiones

1. **Dos tablas:** `resident_notes` guarda la versión vigente y la
   resolución; `note_versions` guarda todas las versiones, desde la
   primera. Las versiones solo se agregan: la app no tiene `UPDATE` ni
   `DELETE` sobre ellas. Sobre `resident_notes` la app solo puede cambiar
   la versión vigente y la resolución (`GRANT UPDATE` por columna): el
   autor, la fecha, el paciente y el turno quedan fijos.

2. **Corregir (F.4):** solo el autor, hasta 24 h después de crearla y
   mientras no esté resuelta. El plazo lo controla la base (`now()`), no
   el reloj del servidor de la app. Se usa la versión para no pisar
   cambios.

3. **Resolver (F.4):** cualquiera con `notes.resolve`, con comentario
   opcional; se guardan quién y cuándo. Solo se resuelve lo que pide
   seguimiento, una sola vez. "Resolver" de un toque en la lista;
   con comentario, desde el detalle.

4. **"General"** es la primera opción fija al elegir el paciente. Solo se
   registran novedades de pacientes activos o internados fuera.

5. **Turno:** cada novedad guarda el turno en que se registró según el
   reloj de la sede (`shift_id`, `shift_date`). Lo usa el traspaso.

6. **Auditoría sin el texto:** `note.created`, `note.corrected` y
   `note.resolved` registran categoría, seguimiento, versión y si hubo
   comentario, pero no copian el texto (ya está en `note_versions`). La
   Actividad del paciente incluye las de sus novedades; "Ver cambios"
   muestra las versiones a quien tiene `audit.read_resident`.

7. **Navegación (13.2):** "Novedades" en la barra del teléfono, con
   "Pendientes" primero, y el botón central "+" para registrar. Pestaña
   "Novedades" en la ficha. Lista paginada por cursor (fecha e id).

## Consecuencias

- La ficha de emergencia y la hoja de derivación siguen sin novedades
  (DC-06).
- Pruebas: `tests/unit/notes.test.ts`, `tests/integration/notes.test.ts`
  (reglas, versiones, permisos de la base, aislamiento) y
  `tests/e2e/novedades.spec.ts`.
