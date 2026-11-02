# 0012 — Inicio de personal y de Dirección

- **Fecha:** 02/11/2026
- **Estado:** aceptada.
- **Contexto:** Etapa 3.6. Secciones 7.3-H, 13.2; Apéndice F (F.6).

## Decisiones

1. **Un solo Inicio que se arma según los permisos** (diseño Inicio):
   - todos: saludo según la hora de la sede, cuatro indicadores
     (pendientes abiertos y cuántos vienen de turnos anteriores, novedades
     del turno, pacientes activos e internados fuera, cuánto falta para
     el traspaso), "Requieren seguimiento" con "Resolver", novedades
     recientes y el acceso a Emergencia;
   - con `documents.files` o `admissions.manage`: pacientes con
     documentos obligatorios faltantes;
   - con `audit.read_all` (Administración y Dirección): actividad
     reciente de toda la residencia, con enlace al paciente.
2. Las tarjetas de solicitudes nuevas y de abonos por vencer se suman con
   esos módulos (F1-SOL, F1-FEE).
3. En el teléfono el Inicio se abre desde el logo y desde "Más"; la
   barra inferior queda como en 13.2 (Pacientes · Novedades · "+" ·
   Turno · Más).
4. El estado del 2FA, que mostraba el Inicio provisorio, pasa a "Mi
   perfil".

## Consecuencias

- Prueba: `tests/e2e/inicio.spec.ts`.
