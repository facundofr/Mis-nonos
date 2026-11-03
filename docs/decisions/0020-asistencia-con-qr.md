# 0020 — Asistencia del personal con QR fijo

- **Fecha:** 03/11/2026
- **Estado:** aceptada. El responsable del proyecto pidió registrar la hora
  de entrada y de salida de cada empleada y eligió un QR fijo impreso, para
  todo el personal, con la vista de quién está en la residencia. Adelanta
  parte de M19 (fase 5, F5-EMP-04).

## Decisiones

1. **QR fijo en la entrada.** Lleva el enlace
   `/fichar/<código de la sede>`.
   - Se escanea con la cámara del teléfono: no hace falta una app ni un
     lector dentro de Mis Nonos.
   - Cada persona entra con su propia sesión. Si no tiene sesión, ingresa y
     vuelve al mismo enlace.
2. **Abrir el enlace no registra nada:** hay que tocar «Registrar entrada» o
   «Registrar salida». Así una vista previa del enlace o una recarga no
   marcan una entrada.
3. **La hora es la del servidor** y cada persona registra solo la suya (lo
   exige también RLS).
4. **Entrada o salida según el último registro:**
   - adentro (entró hace menos de 16 h y no salió): el próximo es la salida;
   - si no, la entrada. Una entrada de más de 16 h sin salida se toma como
     olvidada.
   - Un segundo toque dentro de 2 minutos no registra otra cosa.
5. **Quién la usa:** todo el personal registra la suya
   (`attendance.record`); Administración y Dirección ven quién está en la
   residencia (`attendance.read`), en Personal y en Inicio.
6. **Nada se corrige ni se borra** por ahora (sin UPDATE ni DELETE). Las
   horas por mes, la exportación y las correcciones con motivo quedan para
   más adelante.
7. **El código del QR** (`sites.attendance_token`, 64 caracteres al azar)
   nunca va a los logs ni a la auditoría.

## Riesgos

- **Alguien saca una foto del QR** y registra desde otro lugar.
  - Mitigación: Administración cambia el código en Configuración ›
    Asistencia con QR, y el QR impreso deja de funcionar.
  - Si hace falta más control, el siguiente paso es un QR que cambie cada
    pocos segundos en una tablet de la entrada.
- **Un teléfono con la sesión de otra persona:** la pantalla muestra el
  nombre en grande y ofrece cerrar la sesión.
