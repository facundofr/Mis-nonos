---
target: ficha de emergencia
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/var/www/mis-nonos/Mis-nonos/app/(app)/pacientes/[id]/emergencia/page.tsx"
target_fingerprint: "sha256:6b120a2192506281e4d4ccc1b92d38ec7b24b2f211a953490d0309d9c595249e"
target_path: /var/www/mis-nonos/Mis-nonos/app/(app)/pacientes/[id]/emergencia/page.tsx
timestamp: 2026-11-03T02-59-41Z
slug: app-app-pacientes-id-emergencia-page-tsx
---
# Crítica (3.ª corrida): Ficha de emergencia (app/(app)/pacientes/[id]/emergencia/)
Method: dual-agent (A: revisión de diseño · B: detector + evidencia de navegador). Overlay no inyectado (sesión 2FA); evidencia por capturas con datos ficticios, incluidas carga y error.

## Puntaje: 27/40 (Aceptable; antes 24 → 26)
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Estado del sistema | 3 | La hora del pie es la de render, no la confirmación del aviso |
| 2 | Lenguaje del usuario | 3 | Minúsculas forzadas en sustancias; indicaciones dentro del rojo |
| 3 | Control y salida | 3 | Enlace de volver < 44px |
| 4 | Consistencia | 3 | El médico aparece bajo "Familia, en este orden" |
| 5 | Prevención de errores | 2 | Filas tel: a 8px; nada previene una ficha sin teléfonos |
| 6 | Reconocer, no recordar | 3 | El error pide llamar al servicio sin mostrar el número |
| 7 | Flexibilidad | 2 | No se ofrece el teléfono de la residencia ni de Dirección |
| 8 | Diseño mínimo | 3 | Sin servicio: rojo, ámbar, dirección vacía y salmón apilados |
| 9 | Recuperarse de errores | 2 | Error y "sin teléfonos" terminan en "avisá a Dirección" sin forma de hacerlo |
| 10 | Ayuda | 3 | Aviso adaptado; "Sin contactos" sin camino para resolverlo |

## Especificidad
Muy específica de la emergencia; cabecera y tarjetas de la casa. Detector: 0 hallazgos en la ruta; app-shell.tsx:113 (10px). Capturas: palabras sueltas en el error ("emergencia", "Dirección."); el esqueleto no anticipa aviso/dirección/cobertura/PDF.

## Problemas por prioridad
- [P0] La pantalla de error no permite llamar a nadie (error.tsx:32-35). Fix: pasar servicio y teléfono de la sede desde el layout y mostrar filas tel:; si no hay nada, no nombrar un servicio inexistente. /impeccable harden
- [P1] "Avisá a Dirección" nunca es accionable; no se ofrece sites.phone. Fix: fila de llamada a la residencia al final (principal si no hay otros teléfonos); pie "Dirección recibe un aviso…". /impeccable harden
- [P1] Orden y agrupación: la dirección corta entre la instrucción y la lista; el médico sin título propio. /impeccable layout
- [P2] Minúsculas forzadas y "Indicaciones" en rojo. /impeccable clarify
- [P2] Anillo de foco invisible sobre rojo/salmón; enlace de volver chico. /impeccable audit

## Personas
Cuidadora: sin número para avisar a Dirección; sin forma de llamar si falla; indicaciones confundidas con la alergia. Jordan: el aviso ámbar parece falla. Sam: foco invisible; títulos planos; nombre accesible sin disponibilidad. Casey: filas muy juntas; PDF en otra pestaña.

## Preguntas
1. ¿El número del servicio y de la residencia deberían vivir donde no pueda fallar (encabezado de la ruta)?
2. ¿"Dirección ya fue avisada" solo después de que el worker entregó el aviso?
3. ¿La falta de servicio debería avisarse fuerte a Dirección el día que se crea, no a las 3 a.m.?
