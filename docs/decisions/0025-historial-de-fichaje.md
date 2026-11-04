# 0025 — Historial de fichaje y encabezado sin turno

- **Fecha:** 04/11/2026
- **Estado:** aceptada. Lo pidió el responsable del proyecto. Amplía 0020.

## Decisiones

1. **Historial de fichaje:** se arma con los registros que ya existen
   (`attendance_records`, solo se agregan). No hay tablas nuevas.
   - Una **estadía** es una entrada con su salida. La salida cierra la
     última entrada si pasaron menos de 36 h, así que una guardia de 24 h
     cuenta como una sola estadía, del día de la entrada.
   - Una entrada sin salida o una salida sin entrada quedan marcadas y no
     suman horas.
   - Una entrada de menos de 36 h sin salida es "Trabajando" y suma horas
     hasta ahora.
   - La lógica está en `features/attendance/history.ts`.
2. **Pantallas,** solo para Administración (`attendance.read`):
   - `/fichaje`: quién está ahora. Cada nombre lleva a su historial.
   - `/fichaje/historial`: calendario del mes con cuántas personas ficharon
     cada día. Tocando un día se ve quién entró y salió, y a qué hora. Sin
     día elegido, muestra las horas del mes de cada persona.
   - `/fichaje/personal/<id>`: calendario de una persona con las horas de
     cada día, el total del mes, cómo está ahora y cada entrada y salida.
   - Se busca por mes con las flechas o con el selector de mes.
3. **Encabezado:** ya no muestra el turno actual ("Turno Mañana · 06–14 h"),
   y el layout de la app ya no consulta la sede para eso.
