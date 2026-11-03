# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Personal de la residencia** (enfermería, cuidadores, administración,
  dirección): cargan y consultan datos de los residentes, pasan el turno,
  registran novedades y actúan ante una emergencia. Muchos son mayores o
  tienen poca experiencia técnica.
- **Dirección y administración**: supervisan la operación, gestionan
  usuarios y roles, revisan solicitudes de ingreso y abonos mensuales.
- **Familias**: solo en la landing pública de cada residencia, para mandar
  una solicitud de ingreso. No tienen cuenta en el MVP.

Roles del MVP: Administrador, Dirección, Enfermería y Cuidador/a (matriz
en `lib/auth/permissions.ts`, Apéndice D).

## Product Purpose

Plataforma web para digitalizar la operación de una residencia de adultos
mayores: quién vive ahí y qué necesita, cómo contactar a su familia ante
una emergencia y qué pasó en cada turno. Todo queda registrado con autor,
fecha y hora, sin borrados silenciosos.

Éxito del MVP (fase 1): que la residencia piloto lo use todos los días para
consultar a sus residentes, actuar en emergencias y pasar el turno, y que
pague por él.

## Positioning

No compite como "el sistema que hace todo". Nace del trabajo real de una
residencia (Mis Nonos) y de sus papeles: el legajo de ingreso, el
reglamento y los consentimientos PAMI pasan tal cual a datos. Se apoya en
ser simple de aprender, en tener la ficha de emergencia a un toque y en
dejar trazado cada cambio. La ventaja definitiva se valida con entrevistas
y con el piloto, no se supone.

## Operating Context

- Hoy la carga se hace sobre todo en una oficina tranquila, en
  computadora, pasando datos al sistema. Igual, el diseño es **mobile
  first**: cada pantalla tiene que funcionar bien en un celular.
- Navegación: en el celular, barra inferior fija (Pacientes · Novedades ·
  "+" central · Turnos · Más); en escritorio, menú lateral (sección 13.2).
- Modo claro y oscuro (Más › Apariencia: Claro, Oscuro o Sistema).
- Fuentes de los datos: ficha de ingreso de Mis Nonos SRL, obligaciones de
  las partes, consentimiento y acta compromiso PAMI (Apéndice E).
- Emergencias: el servicio contratado (Medicardio) es el primer botón de la
  ficha de emergencia.

## Capabilities and Constraints

- Alcance actual: solo el MVP (fase 1): acceso y usuarios, institución,
  residentes, contactos, ingreso guiado y legajo, solicitudes de ingreso
  (carga manual y landing pública), abono mensual, ficha de emergencia,
  novedades, traspaso de turno, inicio, auditoría y guía de uso.
- Los módulos futuros (tareas, medicación, historia clínica, personal,
  portal de familias…) no aparecen en la interfaz hasta que funcionen.
- Cada pantalla tiene estados de carga, error, vacío y éxito.
- Multi-residencia con datos aislados por residencia; la landing pública
  vive en `/residencia/<dirección>` (decisión 0016).
- Stack fijado: Next.js 16, PostgreSQL, Tailwind, shadcn/ui (decisión 0001).
- Sin modo offline hasta validar que haga falta.
- Términos: "residente" o "paciente", "novedad", "traspaso de turno",
  "legajo", "abono", "solicitud de ingreso", "responsable".

## Brand Commitments

- El nombre visible del producto es siempre **Mis Nonos**
  (`lib/brand.ts`). "Residencia360" queda solo como nombre interno del
  proyecto.
- Voz: español rioplatense, simple y directo, sin jerga técnica ni
  hospitalaria.
- La sensación buscada es profesional, tranquila y clara, sin parecer un
  sistema hospitalario complejo (sección 13.1).
- El diseño de referencia está en `project/` (canvas "Mis Nonos — Diseño
  del MVP"); no se modifica ni se importa.

## Evidence on Hand

- Modelo real del legajo de ingreso y reglas de Mis Nonos (Apéndice E).
- Pantallas de referencia en `project/*.dc.html`.
- No hay testimonios, clientes adicionales, métricas ni precios
  confirmados: no inventarlos.
- Nunca datos reales de residentes; en ejemplos y pruebas, solo datos
  ficticios marcados como tales.
- Contenido de la landing de Mis Nonos pendiente (DC-19); aviso de
  privacidad en borrador hasta revisión legal (F0-07).

## Product Principles

1. **Pocos pasos por tarea.** Lo frecuente se hace rápido y sin pensar.
2. **Lo urgente, a un toque.** La emergencia y los contactos nunca quedan
   enterrados.
3. **Todo queda trazado.** Cada cambio tiene autor, fecha y hora; nada se
   borra en silencio.
4. **Del papel real, no de la imaginación.** Los flujos copian cómo
   trabaja hoy la residencia.
5. **Solo lo que funciona.** No se muestran módulos ni métricas sin una
   decisión que ayuden a tomar.

## Accessibility & Inclusion

- Usuarios mayores o poco técnicos: letra legible y generosa, contraste
  suficiente, botones grandes, lenguaje simple y pocas pantallas por tarea.
- No depender solo del color para mostrar estado o prioridad; íconos con
  texto cuando la acción no es obvia.
- Navegación por teclado y lectura con zoom (sección 17.3).
- Confirmar operaciones destructivas y dar feedback inmediato al guardar.
- Mensajes de error claros ante conexión irregular.
