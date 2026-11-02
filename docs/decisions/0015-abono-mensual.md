# 0015 — Abono mensual, cuotas, pagos y aviso de vencimiento

- **Fecha:** 02/11/2026
- **Estado:** aceptada. DC-20 a DC-24 confirmadas el 02/11/2026: pagos
  parciales con saldo; medios configurables por sede; monto 0 sin avisos;
  "internado fuera" sigue generando cuotas; solo el aviso de 7 días; sin
  constancia de pago en el MVP.
- **Contexto:** Etapa 3.8. Secciones 6.12, 7.3-C4, 11.2, 12.10, 17.9;
  Apéndice E.2.

## Decisiones

1. **Tablas** (todas sin `DELETE`):
   - `payment_methods`: por sede, con Efectivo, Transferencia y Otro al
     crear la residencia; se agregan o desactivan en Configuración;
   - `resident_fee_plans`: un plan vigente por paciente (`effective_to`
     nulo). Cambiar el precio cierra el plan y abre otro, con motivo;
   - `fee_charges`: una cuota por paciente y vencimiento, en
     `numeric(12,2)`. "Vencida" no se guarda: es pendiente y ya pasó;
   - `fee_payments`: pagos parciales; no se borran, se anulan con motivo.
     Llevan una clave contra envíos repetidos.
2. **Montos sin redondeos:** se escriben como en Argentina
   ("450.000,50"), se guardan como texto decimal y las cuentas se hacen en
   centavos enteros (`features/fees/money.ts`).
3. **Vencimientos:** el mismo día del mes siguiente al ingreso. Si el mes
   no tiene ese día (29 a 31), vence el último. El día queda fijo por
   paciente (el del primer vencimiento).
4. **Paso 4 del ingreso:** el abono y el próximo vencimiento son
   obligatorios para quien tiene `fees.manage`. "Primer mes cobrado al
   ingreso" (marcado por defecto) registra esa cuota y su pago. Todo va en
   la misma transacción que la confirmación. A los pacientes ingresados
   antes, el abono se les fija desde la ficha.
5. **Cuotas:** se generan solas, hasta 35 días adelante, así la próxima
   siempre existe. Las generan el alta, el cambio de precio y un trabajo
   diario. Con monto 0 no se generan (y no hay avisos). Con el egreso se
   anulan las que vencen después y no tienen pagos; las que tienen saldo
   quedan.
6. **Cambio de precio:** rige desde la próxima cuota sin pagos. Las que
   ya tienen un pago parcial conservan el monto.
7. **Aviso de vencimiento** (trabajo diario del worker, 08:00 de
   Argentina; la fecha se calcula con la zona de cada sede):
   - una notificación por cuota y por persona de Administración y
     Dirección, con el nombre del paciente y la fecha (el monto, en la
     ficha). No se repite si el trabajo se reintenta;
   - un email por persona y por día con la cantidad de cuotas, sin
     nombres ni montos (12.10). Quien no tiene email lo ve solo en la
     campana.
8. **Quién ve montos (12.10):** además de `can()` en cada pantalla y
   acción, las políticas RLS de planes, cuotas y pagos exigen `fees.read`
   para leer y `fees.manage` para escribir, con la función
   `app.current_user_can()`. Así Enfermería y Cuidado no ven montos
   aunque la app tuviera un error. El worker (sin persona) puede leerlos.
9. **Auditoría:** cada plan, cambio de precio, pago y anulación se
   registra con su monto, pero con `entity_type` propio (no `resident`):
   no aparece en la Actividad del paciente, que ven todos los roles. La
   ven Administración y Dirección en la actividad de la residencia.
10. **Pantallas:** pestaña "Abono" en la ficha, lista "Abonos" del mes
    (en Más y en el menú lateral), tarjeta en el Inicio y "Medios de pago"
    en Configuración.

## Consecuencias

- Pruebas: `tests/unit/fees.test.ts` (montos, vencimientos, email),
  `tests/integration/fees.test.ts` (alta, pagos parciales, anulación,
  cambio de precio, monto 0, egreso, aviso sin duplicar, RLS por permiso,
  aislamiento) y `tests/e2e/abonos.spec.ts`.
- Fuera de alcance, como dice el plan: facturación electrónica (ARCA),
  recibos fiscales y constancias (DC-24).
