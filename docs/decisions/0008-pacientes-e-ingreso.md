# 0008 — Pacientes, ingreso guiado y legajo documental

- **Fecha:** 02/11/2026
- **Estado:** aceptada. DC-13 (solo el ingreso guiado crea pacientes) se
  tomó con la propuesta por defecto.
- **Contexto:** Etapa 3.2. Secciones 6.12, 7.3-C, 7.3-C2 y 7.3-D, 11.2 y
  12.7; Apéndice F (F.4, F.5, F.7).

## Decisiones

1. **Solo el ingreso guiado crea pacientes (DC-13).**
   - El paso 1 crea el paciente en estado `admission_draft` y un registro
     en `admissions`.
   - Los borradores no aparecen en listas, búsqueda, emergencia ni
     traspaso. Se retoman desde "Ingresos en curso" (F.4).
   - Confirmar exige un responsable de la internación. Los documentos
     faltantes no frenan el ingreso: quedan pendientes.
   - Cancelar no borra: el paciente queda `admission_cancelled`.
   - "Editar paciente" reemplaza al `PacienteForm` del diseño.

2. **Estados:**
   - `active`, `hospitalized` (internado fuera, con lugar y fecha) y
     `discharged` (egreso con motivo, fecha y observación);
   - las restricciones de la base exigen los datos de cada estado;
   - el egreso no borra nada; cada cambio emite el evento
     `resident.status_changed` (lo usará el abono).

3. **La cobertura vigente va en `residents`**, no en una tabla
   `health_coverages` (11.2). En el MVP hay una por paciente y su historial
   queda en la auditoría. Si una fase posterior necesita varias, se pasa a
   tabla.

4. **Alergias en tabla propia**, con reacción y gravedad (11.2, F.7). Una
   alergia cargada por error se descarta, no se borra.

5. **Contactos** con los campos de F.7:
   - celular, teléfono, teléfono laboral y si tiene WhatsApp;
   - autorizaciones: recibe información, puede retirarlo/a, paga el abono;
   - fecha de verificación;
   - orden para emergencias.

   Un índice único parcial garantiza un solo responsable de la internación
   activo; marcar otro libera al anterior. El responsable lleva DNI y
   domicilio.

6. **Ediciones simultáneas:** `residents.version`. Una edición con una
   versión vieja no pisa la de otra persona: avisa.

7. **Búsqueda sin acentos ni mayúsculas** (F1-STK-05):
   - columna generada `search_text` (nombre, apellido, habitación y DNI)
     con índice de trigramas;
   - usa una versión `IMMUTABLE` de `unaccent` (`app.normalize_search`,
     migración 0010);
   - los comodines de `LIKE` se escapan.

8. **Legajo documental** (F1-ING-04, 12.7).
   - Tablas: `files` (inmutable para la app), `resident_documents` (uno
     por tipo) y `resident_document_files` (varias fotos por documento,
     F.5). Quitar una foto la marca; no la borra.
   - **Subida:**
     - de a un archivo, hasta 10 MB (límites de Next a 12 MB);
     - el navegador achica las fotos a 2000 px en JPEG, lo que también
       descarta el EXIF (que puede traer la ubicación);
     - el servidor valida el tipo real por los primeros bytes.
   - **Para ver un archivo hacen falta** sesión, `documents.files` (solo
     Administración y Dirección), un enlace firmado de 5 minutos para esa
     persona y ese archivo, y RLS.
   - Cada apertura queda en la auditoría.
   - El archivo se entrega sin caché y, si es PDF, aislado con
     `sandbox`.
   - Enfermería y Cuidado ven qué documentos están cargados, pero no las
     fotos (F.3, nota 5).

9. **Historial (Actividad).** Todo cambio sobre un paciente (datos,
   contactos, alergias, estado, legajo) se audita con `entity_type =
resident`, así su historial sale de una sola consulta. Se muestran los
   valores anteriores y nuevos con nombres legibles.

## Pendientes

- La foto del paciente (opcional en 7.3-C) no está todavía: necesita la
  autorización del paciente o de su referente.
- Archivos huérfanos: si la transacción falla después de guardar el
  archivo, queda en el disco sin vínculo. Un trabajo de limpieza los puede
  borrar más adelante; no se muestran nunca.
