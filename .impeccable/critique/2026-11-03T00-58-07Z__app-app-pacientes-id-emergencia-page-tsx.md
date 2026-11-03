---
target: ficha de emergencia
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/var/www/mis-nonos/Mis-nonos/app/(app)/pacientes/[id]/emergencia/page.tsx"
target_fingerprint: "sha256:b695a5ee4614b331fa29ee91a2d4211159aed3dfb4d10f8409397d1e27e80401"
target_path: /var/www/mis-nonos/Mis-nonos/app/(app)/pacientes/[id]/emergencia/page.tsx
timestamp: 2026-11-03T00-58-07Z
slug: app-app-pacientes-id-emergencia-page-tsx
closed: true
---
# Crítica: Ficha de emergencia (app/(app)/pacientes/[id]/emergencia/page.tsx)
Method: dual-agent (A: revisión de diseño · B: detector + evidencia de navegador). Overlay no inyectado (la página requiere sesión con 2FA); evidencia visual por capturas e2e con datos ficticios.

## Puntaje: 24/40 (Aceptable)
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Estado del sistema | 3 | No avisa que el PDF abre otra pestaña |
| 2 | Lenguaje del usuario | 3 | "hijo/a" crudo; "(Ronchas)" con mayúscula |
| 3 | Control y salida | 3 | Volver claro |
| 4 | Consistencia | 2 | PDF salmón pesa más que las llamadas; "Llamar" de familia no parece botón |
| 5 | Prevención de errores | 2 | Contactos sin teléfono desaparecen; numeración se corre |
| 6 | Reconocer, no recordar | 3 | Falta la dirección de la residencia |
| 7 | Flexibilidad | 2 | Un solo teléfono por contacto; sin WhatsApp |
| 8 | Diseño mínimo | 3 | Demasiado tranquila para el momento; barra y "+" compiten |
| 9 | Recuperarse de errores | 1 | Sin servicio: aviso administrativo y ninguna salida |
| 10 | Ayuda | 2 | Sin guía de qué decir al llamar |

## Especificidad
Estructura propia de la emergencia (alergia primero, familia en orden, registro de apertura); apariencia de página común. Detector: 0 hallazgos en la página; 1 aviso en app-shell.tsx:113 (10px fuera de escala); 1 straggler en /ingresar (no aplica). Stragglers visibles en capturas ("responsable", "Configuración.").

## Problemas por prioridad
- [P0] Sin servicio de emergencias cargado no hay botón para llamar a una ambulancia (page.tsx:146-161). Fix: botón rojo siempre; aviso solo para quien configura; número de respaldo a decidir por el usuario. /impeccable harden
- [P1] El PDF relleno salmón pesa más que las llamadas (page.tsx:221-229). Fix: PDF contorno "Para la ambulancia"; "Llamar" como botón; rojo sólido solo para el servicio. /impeccable layout
- [P1] Contactos sin teléfono desaparecen y la numeración se corre (page.tsx:168-184); un solo número; falta dirección y gravedad de alergia. /impeccable harden
- [P2] Caja roja para "Sin alergias registradas" (page.tsx:125-138). Fix: caja neutra con texto claro. /impeccable clarify
- [P2] Identidad poco visible: nombre a 20px, sin foto, "+" pegado al PDF en el celular. /impeccable adapt

## Alertas por persona
- Cuidadora de noche: no hay botón rojo sin servicio; no sabe a quién llamar primero; no tiene la dirección; "Apertura registrada" asusta.
- Jordan: sale a buscar "Configuración"; "Hoja de derivación" sin explicar.
- Sam: nombres accesibles largos en cada llamada; secciones sin títulos; PDF en otra pestaña sin aviso.
- Casey: el PDF queda pegado a la barra inferior y al "+".

## Menores
"Alergia a penicilina: ronchas"; "hija"/"hijo"; "Sin cobertura cargada"; "Llamar" en escritorio; título de pestaña con el nombre; contador de campana a 10px.

## Preguntas
1. ¿Debería mostrarse alguna vez sin botón rojo de llamada?
2. ¿"Calma clínica" es el tono para esta pantalla?
3. ¿Para quién es el PDF en los primeros dos minutos?
