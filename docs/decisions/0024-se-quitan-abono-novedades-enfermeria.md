# 0024 — Se quitan el abono, las novedades y la sección Enfermería

- **Fecha:** 04/11/2026
- **Estado:** aceptada. Lo pidió el responsable del proyecto: la residencia
  no quiere registrar dinero en la app y no va a usar las novedades ni la
  sección Enfermería. Reemplaza los puntos 2 a 4 de 0023.

## Decisiones

1. **Abono:** se quita entero, de la app y de la base.
   - Tablas borradas: `payment_methods`, `resident_fee_plans`,
     `fee_charges` y `fee_payments`.
   - Columnas borradas: `sites.fee_rule_text`,
     `sites.fee_reminder_days_before` y `resident_contacts.is_payer`.
   - Permisos borrados: `fees.read` y `fees.manage`. También desaparece el
     módulo `fees`.
   - Se borran sus avisos, y los eventos de auditoría con montos y medios
     de pago, para que no quede registro de dinero.
   - El worker borra al arrancar las colas `fees.daily` y
     `email.fee-digest`, con su programación (`RETIRED_QUEUES`).
   - Confirmar un ingreso ya no pide el abono.
2. **Novedades:** se quitan, de la app y de la base.
   - Tablas borradas: `resident_notes`, `note_versions` y
     `note_categories`.
   - Permisos borrados: `notes.*`.
   - El traspaso de turno queda como entrega con nota y confirmación, sin
     resumen de novedades ni pendientes. Sus tablas pasan a
     `db/schema/handover.ts`.
   - Inicio muestra emergencias, la entrega del turno, la agenda y los
     datos de Administración.
   - La barra del teléfono ya no tiene el botón "+". Inicio pasa a ser una
     pestaña.
   - Los eventos de auditoría de novedades se conservan como historial.
3. **Enfermería:** se quita la sección.
   - Las especialidades ya no tienen clave fija: se borra la columna
     `specialties.key`.
   - La especialidad "Enfermería" de las residencias existentes queda
     inactiva, con sus atenciones, y ya no se crea en las nuevas.
4. Todo en la migración 0042. No tiene vuelta atrás: los datos borrados no
   se recuperan.
