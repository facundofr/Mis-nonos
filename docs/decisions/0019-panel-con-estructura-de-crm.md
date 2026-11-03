# 0019 — Panel con la estructura de un CRM de residencias

- **Fecha:** 03/11/2026
- **Estado:** aceptada. El responsable del proyecto pidió adaptar el panel
  (no el ingreso) a la estructura de un CRM de geriátricos que usó y que "se
  entiende al 100%", manteniendo el salmón como primario.

## Decisiones

1. **Menú lateral en bloques con título:** el día a día (Inicio, Pacientes,
   Novedades, Traspaso de turno), **Cuidado**, **Administración** (Personal,
   Abonos, Solicitudes de ingreso) y **Configuración** (Usuarios y roles,
   Configuración). El menú "Más" del teléfono usa los mismos bloques.
   - "Empleados" pasa a llamarse "Personal".
   - "Solicitudes de ingreso" entra al menú (antes solo se llegaba desde Inicio).
2. **Encabezado de escritorio** con dónde estás ("CUIDADO › Enfermería"), el
   turno y la campana.
3. **Inicio:**
   - saludo con el turno y la fecha, "Nueva novedad" y "Ver pendientes";
   - cuatro indicadores con ícono: pacientes activos, en seguimiento,
     novedades del turno y personal activo (o el traspaso, para quien no ve
     el personal);
   - **Tareas del turno** en tres franjas: Ahora (emergencias abiertas y la
     entrega del turno), De este turno y De turnos anteriores;
   - **Agenda de la residencia**: los próximos controles de los 30 días;
   - abajo, el bloque Administración: abonos, solicitudes, documentos
     faltantes y actividad reciente.
4. No se agregan módulos nuevos (stock, proveedores, compras, sueldos,
   balance, camas): quedan para decidir por separado.
