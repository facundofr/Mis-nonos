# 0009 — Ficha de emergencia, hoja de derivación y avisos

- **Fecha:** 02/11/2026
- **Estado:** aceptada. DC-02 confirmada (01/11/2026). DC-06 (novedades en
  la hoja de derivación) se tomó con la propuesta por defecto: no se
  incluyen.
- **Contexto:** Etapa 3.3. Secciones 6.6, 7.3-E, 8.4, 10.6, 11.2 y 12;
  Apéndice F (DC-02, DC-06).

## Decisiones

1. **La ficha de emergencia es una pantalla propia** (`/pacientes/[id]/emergencia`):
   - se abre desde la lista (botón "Emergencia de …") y desde la ficha;
   - muestra lo mínimo para actuar: datos de identificación, cobertura,
     alergias con reacción, indicaciones, médico de cabecera y los
     contactos en orden de emergencia;
   - cada teléfono es un enlace "Llamar" (`tel:`); el primero es el
     servicio de emergencias de la sede (Configuración → Residencia);
   - solo pacientes `active` u `hospitalized`: los borradores y los
     egresados no tienen ficha de emergencia.

2. **Cada apertura queda auditada** (F1-EMG-03): `recordAudit()` con la
   acción `emergency.viewed` en la misma transacción, y el evento de
   dominio del mismo nombre. La pantalla muestra "Apertura registrada" con
   el nombre de quien la abrió, para que se sepa que queda registro.

3. **Hoja de derivación en PDF** (`/api/emergencia/[id]/hoja`, F1-EMG-02):
   - se genera en el servidor con `@react-pdf/renderer` 4.9.0, en cada
     pedido; no se guarda en disco ni tiene enlace permanente;
   - pide sesión y el permiso `emergency.pdf`; responde `no-store`;
   - cada generación se guarda en `emergency_sheet_exports` (quién y
     cuándo) y en la auditoría (`emergency.pdf_generated`);
   - **sin novedades de las últimas 24 h (DC-06)**, como dice 8.4. Si más
     adelante se quiere, se agrega una opción por sede.

4. **Notificaciones dentro de la app** (tabla `notifications`, F1-NOT-01):
   - las crea el worker a partir de los eventos de dominio, con
     `withSystemTenant`; la app nunca las escribe directamente;
   - `dedupe_key` única: si un trabajo se reintenta, no se duplican;
   - cada persona ve y marca solo las suyas (RLS). El worker, que no actúa
     como nadie, puede leer las de la residencia porque
     `INSERT … ON CONFLICT` lo exige; por eso la inserción no usa
     `RETURNING` (migración 0017);
   - el texto nunca lleva datos de salud: dice quién abrió la ficha y de
     quién, y lleva a la pestaña Actividad, donde rigen los permisos;
   - campana en el encabezado con la cantidad sin leer; abrir un aviso lo
     marca como leído.

5. **Único aviso del MVP fuera del abono (DC-02):** "Se abrió una ficha de
   emergencia", a cada persona de Dirección salvo a quien la abrió. Sin
   push en el teléfono. Los avisos del abono (en la app y por email) se
   suman en su etapa.

## Consecuencias

- La auditoría de aperturas se ve en la pestaña Actividad del paciente
  para quien tiene `audit.read_resident` o `audit.read_all`.
- El email todavía no se usa para avisos: llega con el abono, agrupado y
  sin nombres ni montos (12.10).
- Pruebas: `tests/integration/notifications.test.ts` (aviso a Dirección,
  sin duplicar, cada persona ve solo los suyos) y
  `tests/e2e/emergencia.spec.ts` (flujo completo con el worker).
