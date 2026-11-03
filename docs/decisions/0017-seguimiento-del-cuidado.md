# 0017 — Seguimiento del cuidado adelantado: especialidades, profesionales, enfermería y emergencias

- **Fecha:** 03/11/2026
- **Estado:** aceptada. El responsable del proyecto pidió el 03/11/2026
  sumar al menú principal Especialidades, Profesionales, Enfermería y
  Emergencias, y adelantar esa parte de la fase 2 (sin medicación, que
  sigue en la fase 3).
- **Contexto:** secciones 3.7, 3.9, 5.7, 5.8, 5.10, 6.9 (paso 5), 6.11,
  7.4, 8.6, 8.7 y 11.2; Apéndice D.

## Decisiones

1. **Módulo `care`**, encendido en todas las residencias: en las que ya
   existían lo enciende la migración 0035; en las nuevas, el alta.
2. **Tablas** (migraciones 0034 y 0035, todas sin `DELETE`):
   - `specialties`: catálogo por residencia, con 10 especialidades
     iniciales. Enfermería lleva la clave fija `enfermeria` porque la usa
     su sección, y no se puede desactivar. Las demás se renombran o se
     desactivan;
   - `professionals`: internos o externos, sin usuario (5.10). Tienen
     nombre, especialidad, matrícula, teléfono, institución y notas. Se
     desactivan, no se borran;
   - `care_encounters`: las atenciones, también las de enfermería. Tienen
     especialidad, quién atendió, fecha y hora, lugar, motivo,
     observaciones, indicaciones y próximo control.
     - Si no se elige profesional, atendió quien registra.
     - **No se editan** (5.7): la app solo puede anularlas, con motivo
       (grant por columnas).
   - `emergencies`: el registro de emergencias (6.9, paso 5). Tiene la
     hora de inicio, qué pasó, a quién se llamó y si hubo traslado (y a
     dónde). Queda abierta hasta que se cierra con el resultado.
     - En lugar de la tabla general `incidents` del plan, por ahora se
       registran solo emergencias. Las demás incidencias siguen en la
       fase 2.
3. **Permisos** (código y migración, comparados por una prueba unitaria):

   | Permiso                                                        | Admin. | Dirección | Enfermería | Cuidador/a |
   | -------------------------------------------------------------- | ------ | --------- | ---------- | ---------- |
   | `care.read`: ver profesionales, especialidades y atenciones    | ✓      | ✓         | ✓          | —          |
   | `care.record`: registrar y anular atenciones                   | ✓      | ✓         | ✓          | —          |
   | `care.manage`: agregar y editar profesionales y especialidades | ✓      | ✓         | —          | —          |
   | `emergencies.manage`: registrar y cerrar emergencias           | ✓      | ✓         | ✓          | ✓          |
   - Administración registra atenciones: el Apéndice D le da solo
     lectura, pero en Mis Nonos es quien carga los datos en la oficina.
   - Cuidado no ve atenciones (Apéndice D).

4. **RLS con permiso**, como el abono (12.10): son datos de salud, así que
   las políticas exigen el permiso, además de `can()` en la app.
5. **Auditoría sin textos clínicos:** se registra qué se hizo, quién y
   sobre qué paciente (`metadata.residentId`). La pestaña Actividad del
   paciente lo muestra.
6. **Pantallas** (menú principal; en el teléfono, desde "Más"):
   - **Especialidades:** cada especialidad muestra la última visita de
     cada paciente (3.9, "¿cuándo lo vio el kinesiólogo?"), los próximos
     controles, las últimas atenciones y sus profesionales;
   - **Profesionales:** agrupados por especialidad, con botón de llamar;
   - **Enfermería:** la misma vista para Enfermería, más los próximos
     controles de todas las especialidades;
   - **Emergencias:** las abiertas primero. Desde la ficha de emergencia,
     "Registrar la emergencia" queda después de las llamadas y del PDF.
7. **Próximo control:** aparece desde dos semanas antes hasta un mes
   después de su fecha, y se quita solo cuando hay una atención
   posterior de la misma especialidad.
   - Queda fuera la "frecuencia esperada" con aviso de visita atrasada.
8. **Fechas:** se cargan en la hora local de la sede y se guardan en UTC.
   No se aceptan atenciones ni emergencias futuras (con 5 minutos de
   margen para el reloj del teléfono).

## Pendiente (fase 2)

- Tareas, incidencias de otros tipos, signos vitales, frecuencia
  esperada y visitas atrasadas.
- Equipo tratante por paciente, y vincular profesionales con usuarios.
- Avisar a Dirección cuando se registra una emergencia.
