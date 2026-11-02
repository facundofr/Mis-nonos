# 0014 — Solicitudes de ingreso (bandeja, carga manual y conversión)

- **Fecha:** 02/11/2026
- **Estado:** aceptada. DC-14 (borrado a los 12 meses) y DC-18 (estados
  de 7.3-C3) confirmadas el 02/11/2026. La landing pública (F1-SOL-03 y
  F1-SOL-04) queda para el final del MVP y necesita DC-15, DC-16, DC-17,
  DC-19 y el aviso de privacidad revisado.
- **Contexto:** Etapa 3.7. Secciones 6.12, 7.3-C3, 11.2, 12.9; Apéndice F.

## Decisiones

1. **Una tabla, `admission_requests`.** Los dos familiares opcionales van
   en columnas (`contact2_*`, `contact3_*`), no en una tabla aparte: así
   se editan sin borrar filas (la app no tiene `DELETE`). La migración
   0026 quitó la tabla `admission_request_contacts` de 0024, que nunca se
   usó.
2. **Carga manual mínima:** canal, nombre y apellido del futuro paciente,
   y nombre y teléfono del responsable. El resto se completa después.
   Nunca diagnósticos, medicación ni fotos de documentos.
3. **Idempotencia:** cada formulario lleva una clave (`client_request_id`,
   única por residencia). Mandarlo dos veces devuelve la misma solicitud.
4. **Estados (DC-18):** nueva → en contacto ↔ en espera → convertida o
   descartada. Descartar pide motivo. Convertida y descartada son
   finales; la base lo controla con restricciones.
5. **Convertir en ingreso**, en una sola transacción:
   - usa la validación del paso 1 del ingreso; si falta la modalidad, la
     cobertura o el n.º de afiliado, lo dice y no convierte;
   - si ya hay un paciente con ese DNI, no convierte (otras solicitudes
     con el mismo DNI solo se avisan);
   - crea el borrador del ingreso, el responsable (marcado como tal si
     tiene DNI y domicilio) y los familiares en orden, y lleva al paso 2;
   - pide `admission_requests.manage` y `admissions.manage`.
6. **Aviso:** una solicitud nueva avisa en la campana a Administración y
   Dirección (salvo a quien la cargó), sin datos del futuro paciente.
7. **Auditoría sin datos de la familia:** se registran las acciones
   (creada, editada, estado, descartada con el motivo, convertida) sin
   copiar nombres ni teléfonos, para que el borrado de DC-14 sea real.
8. **Borrado por plazo (DC-14):** un trabajo diario del worker (03:45)
   llama a `app.purge_stale_admission_requests(12)`, una función de la
   base que solo puede ejecutar el rol del worker. Borra las no
   convertidas sin actividad en 12 meses y deja en la auditoría de cada
   residencia cuántas borró. El plazo se revisa con el abogado antes de
   publicar la landing.
9. **Navegación:** "Solicitudes · N" junto a "Ingresos en curso" en
   Pacientes y una tarjeta en el Inicio, solo con permiso.

## Consecuencias

- Pruebas: `tests/unit/admission-requests.test.ts`,
  `tests/integration/admission-requests.test.ts` (idempotencia, aviso,
  estados, conversión, duplicados, aislamiento, sin `DELETE` para la app,
  borrado por plazo) y `tests/e2e/solicitudes.spec.ts`.
