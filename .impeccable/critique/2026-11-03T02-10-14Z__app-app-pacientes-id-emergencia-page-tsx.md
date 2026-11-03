---
target: ficha de emergencia
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/var/www/mis-nonos/Mis-nonos/app/(app)/pacientes/[id]/emergencia/page.tsx"
target_fingerprint: "sha256:5ae183671131f8ca6c69ccce2f6fdb43a31ba85869484450994fd8c4b8490bf2"
target_path: /var/www/mis-nonos/Mis-nonos/app/(app)/pacientes/[id]/emergencia/page.tsx
timestamp: 2026-11-03T02-10-14Z
slug: app-app-pacientes-id-emergencia-page-tsx
---
# Crítica (2.ª corrida): Ficha de emergencia (app/(app)/pacientes/[id]/emergencia/page.tsx)
Method: dual-agent (A: revisión de diseño · B: detector + evidencia de navegador). Overlay no inyectado (página con sesión 2FA); evidencia visual por capturas e2e con datos ficticios.

## Puntaje: 26/40 (Aceptable; antes 24)
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Estado del sistema | 2 | Sin loading.tsx: nada visible al tocar "Emergencia" con mala señal |
| 2 | Lenguaje del usuario | 3 | Minúsculas forzadas rompen siglas |
| 3 | Control y salida | 3 | Enlace de volver < 44px |
| 4 | Consistencia | 2 | Faltantes de tres formas; el médico desaparece |
| 5 | Prevención de errores | 3 | Sin "+", numeración fija, tarjeta sin alergias pide confirmar |
| 6 | Reconocer, no recordar | 3 | "Llamá al médico de cabecera" aunque no esté cargado |
| 7 | Flexibilidad | 2 | Sin WhatsApp; no se puede copiar beneficiario/dirección |
| 8 | Diseño mínimo | 3 | Dos bloques con triángulo seguidos |
| 9 | Recuperarse de errores | 2 | Aviso de admin = tarea de configuración; sin error.tsx |
| 10 | Ayuda | 3 | Microcopy guía bien |

## Especificidad
Estructura específica de la emergencia; apariencia de tarjetas de la casa. Detector: 0 hallazgos en la página; app-shell.tsx:113 (10px, casi falso positivo). Captura: "responsable" sola en segunda línea (celular).

## Problemas por prioridad
- [P1] Sin servicio, el aviso le da una tarea a Administración y manda al médico aunque no exista (page.tsx:236-252). Fix: acción condicional para todos, config en segunda línea, 15px, más peso al primer familiar. /impeccable clarify
- [P1] Sin loading.tsx ni error.tsx en la ruta; la página espera DB + auditoría. Fix: skeleton inmediato, error con instrucciones, no bloquear por el aviso. /impeccable harden, /impeccable optimize
- [P2] Faltantes inconsistentes; médico ausente no se ve (page.tsx:349-357); indicaciones dentro del rojo. /impeccable clarify + polish
- [P2] Llamadas a la familia sin jerarquía; título que se corta; número en gris chico. /impeccable layout
- [P3] Enlaces < 44px; píldora de emergencia a 12px. /impeccable adapt

## Personas
Cuidadora de noche: busca un médico inexistente; sin señal de carga; falta "Dirección fue avisada". Jordan: cree que está rota. Sam: aviso no es título; número fuera del nombre accesible; siglas. Casey: PDF en otra pestaña.

## Preguntas
1. ¿El primer familiar como botón principal sin servicio?
2. ¿"Dirección fue avisada" en vez de "Apertura registrada"?
3. ¿Vista a pantalla completa en lugar del PDF?
