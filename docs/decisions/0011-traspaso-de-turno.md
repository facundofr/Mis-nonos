# 0011 — Traspaso de turno

- **Fecha:** 02/11/2026
- **Estado:** aceptada. Reglas de F.4 confirmadas el 01/11/2026
  (confirmación opcional por sede).
- **Contexto:** Etapa 3.5. Secciones 7.3-G, 13.2; Apéndice F (F.4, F.5,
  F.6).

## Decisiones

1. **Qué traspaso se muestra:** en la última hora del turno en curso, el
   de ese turno (se prepara la entrega); si no, el del turno que terminó
   último (lo recibe el entrante). Todo sale del reloj y de los turnos de
   la sede; el turno noche se identifica por la fecha en que empieza.

2. **Una entrega por turno y por sede** (`shift_handovers`, única por
   sede, turno y fecha). Se entrega desde 1 h antes hasta 2 h después del
   fin. Si otra persona la completa, es una versión nueva
   (`shift_handover_versions`, solo se agregan). La nota es opcional.

3. **Sin entrega:** no hay fila; el turno siguiente ve igual el resumen,
   marcado "Sin entrega" cuando se cerró la ventana.

4. **Confirmación:** solo si la sede la pide
   (`handover_requires_confirmation`). Confirma cualquiera con
   `handover.confirm`, desde la entrega hasta que termina el turno
   entrante (sin turno siguiente, hasta 8 h después). Confirmada, la
   entrega ya no se cambia.

5. **Resumen:** novedades creadas dentro del horario del turno, seguimientos
   abiertos al momento de la entrega (o ahora, si todavía no se entregó) y
   resueltos dentro del turno. No se guarda una copia: se calcula con las
   fechas de creación y de resolución de cada novedad.

6. **Auditoría:** `handover.delivered` (versión, si tiene nota) y
   `handover.confirmed`, sin copiar la nota.

7. **Navegación:** "Turno" en la barra del teléfono e "Historial" de los
   últimos 7 días. El Inicio pasa a "Más" en el teléfono (13.2).

## Arreglo en el camino

- `formValues` (lib/forms.ts) descartaba cualquier campo con "confirm" en
  el nombre, pensado para contraseñas. Por eso la casilla "El turno
  entrante confirma la recepción" de Configuración no se guardaba. Ahora
  solo descarta campos de contraseña (prueba en `tests/unit/forms.test.ts`).

## Consecuencias

- Pruebas: `tests/unit/handover.test.ts` (ventanas, turno noche,
  historial), `tests/integration/handover.test.ts` (versiones,
  confirmación, permisos de la base, aislamiento) y
  `tests/e2e/turno.spec.ts` (los turnos se corren para que el actual
  termine en 30 minutos).
