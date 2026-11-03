# Residencia360 --- Documento maestro del proyecto

## Contexto de negocio, producto, experiencia de usuario, arquitectura y plan de desarrollo

**Versión:** 2.4\
**Fecha:** 1 de noviembre de 2026\
**Estado:** Plan integral de la plataforma: MVP mínimo + 6 fases
incrementales, con arquitectura preparada para escalar\
**Idioma:** Español\
**Mercado inicial propuesto:** Argentina\
**Nombre de trabajo:** Residencia360 (provisional; verificar marca,
dominio y disponibilidad antes de usar comercialmente)

------------------------------------------------------------------------

## Registro de cambios

### Versión 2.4 (01/11/2026)

-   **Solicitudes de ingreso** (sección 7.3-C3): los datos del futuro
    paciente entran por una landing pública o los carga a mano un
    usuario en la app; quedan en una bandeja que Administración y
    Dirección convierten en ingreso guiado. La landing se construye al
    final del MVP (seguridad en 12.9, pruebas en 17.8).
-   **Abono mensual y pagos** (sección 7.3-C4): el precio se fija en el
    ingreso, vence el mismo día del mes siguiente, se registran los
    pagos y Administración y Dirección reciben un aviso 7 días antes
    del vencimiento, en la app y por email (datos en 11.2, privacidad
    en 12.10, pruebas en 17.9). Adelanta al MVP una parte de M23.
-   Las **notificaciones** (dentro de la app y por email) y el
    **worker** de trabajos programados pasan a usarse en el MVP.
-   Nuevo orden de construcción del MVP en las secciones 14 y 20, que
    ahora incluye el ingreso guiado y el legajo (faltaban desde la
    v2.2).
-   Notas en 10.10, 10.17 y 20: MinIO ya no se mantiene; el reemplazo
    se decide en el Apéndice F.
-   Nuevo **Apéndice F**: brechas entre el plan y el diseño, decisiones
    a confirmar con una propuesta por defecto, matriz de permisos del
    MVP, reglas de negocio, pantallas sin diseño y perfil de despliegue
    en el VPS.
-   Checklist (Apéndice A), matriz de cobertura (Apéndice C) y reglas
    de Mis Nonos (Apéndice E.2) actualizados.

### Versión 2.3 (31/10/2026)

-   **Stack de producción decidido** (sección 10.10): Next.js 16, React
    19, TypeScript, Tailwind v4 + shadcn/ui, PostgreSQL 18, Drizzle,
    Better Auth, pg-boss, almacenamiento S3, Docker y GitHub Actions.
-   **Volumen de datos estimado** para tres escenarios, hasta 1.000
    residencias y 50.000 residentes (10.11).
-   **Diseño de base para volumen** (10.12) y **RLS en la práctica**
    (10.13): UUIDv7, índices por organización, búsqueda con `pg_trgm`,
    particionado mensual, paginación por cursor, idempotencia.
-   **Arquitectura de producción, objetivos de rendimiento, robustez,
    infraestructura por etapas y pruebas de carga** (10.14 a 10.18).
-   Actualizados: estructura del repositorio (18), prompt de desarrollo
    (20), decisiones resueltas (21), checklist (Apéndice A) y glosario.

### Versión 2.2 (27/10/2026)

-   Se incorporó el **modelo real de ingreso de Mis Nonos** a partir de
    sus papeles: ficha de ingreso, obligaciones de las partes,
    consentimiento PAMI y acta compromiso PAMI (Apéndice E).
-   El MVP suma el **ingreso guiado en 4 pasos** y el **legajo
    documental** con fotos de los papeles firmados (sección 7.3-C2).
-   Nuevos datos del paciente: lugar de nacimiento, domicilio anterior,
    institución que lo deriva, modalidad (PAMI o privado), N.º de
    beneficiario PAMI y DNI original en custodia.
-   El **responsable de la internación** pasa a ser un rol explícito del
    contacto (con DNI, domicilio y teléfonos).
-   La ficha de emergencia suma el **servicio de emergencias contratado**
    (Medicardio) como primera llamada.
-   Reglas de Mis Nonos registradas en la configuración: control médico
    semanal, cuota mes adelantado que vence el día de ingreso, insumos y
    medicación provistos por la familia.

### Versión 2.1 (25/10/2026)

-   El plan se divide en un **MVP mínimo** (fase 1: residentes,
    contactos, ficha de emergencia, novedades, traspaso de turno,
    auditoría) y **6 fases posteriores**: seguimiento del cuidado,
    medicación y stock, historia clínica, personal, familias,
    administración y escala (sección 7).
-   Tareas, incidencias, atenciones y signos vitales salen del MVP a la
    fase 2; medicación pasa a la fase 3; historia clínica a la fase 4.
-   Nueva sección 10.9: **17 decisiones de arquitectura** que el MVP
    toma desde el día uno para escalar sin reescribir (multi-institución,
    sedes, módulos activables, permisos como datos, eventos de dominio,
    entre otras), y qué no hacer "por si escala".
-   Modelo de datos con `sites`, `organization_modules`, roles y
    permisos en tablas y `domain_events`.
-   Plan de etapas, planes comerciales, prompt de desarrollo, checklist
    (Apéndice A) y matrices actualizados a la nueva numeración de
    fases.

### Versión 2.0 (25/10/2026)

El objetivo del producto pasa de "un MVP de novedades y tareas" a
**digitalizar toda la operación de un geriátrico**, construyéndola por
fases. Se agregó:

-   **Módulo de empleados:** legajo, rol, matrícula profesional,
    documentación con vencimientos, turnos/guardias y asistencia.
-   **Ficha completa del residente:** datos personales, cobertura de
    salud, contactos familiares, habitación y cama.
-   **Ficha de emergencia** de acceso en un toque: contactos de
    emergencia con llamada directa, alergias, cobertura, médico de
    cabecera, indicaciones especiales e impresión de hoja de derivación.
-   **Historia clínica** (evoluciones, antecedentes, adjuntos) con
    registros inalterables y enmiendas.
-   **Equipo tratante:** profesionales internos y externos que atienden
    a cada residente.
-   **Atenciones y visitas profesionales:** médico, enfermería,
    kinesiología, nutrición, psicología, urgencias, traslados; "última
    visita" por especialidad.
-   **Medicación:** indicaciones cargadas por profesionales, registro de
    administración (quién, cuándo, qué), stock por residente con
    movimientos, vencimientos y alertas de reposición.
-   **Signos vitales y controles.**
-   **Habitaciones y camas, ingresos y egresos.**
-   **Trazabilidad total:** auditoría de lecturas sensibles y escrituras,
    acceso de emergencia registrado y reportes de actividad.
-   Nuevas secciones: catálogo de módulos (sección 8), hoja de ruta por
    fases, matriz de cobertura de pedidos (Apéndice C), matriz de
    permisos por rol (Apéndice D) y checklist con identificadores para
    seguimiento (Apéndice A).

Se mantienen los límites de seguridad clínica: el sistema **registra**
lo que indican y hacen los profesionales; **no diagnostica, no indica
ni calcula dosis**.

------------------------------------------------------------------------

# 1. Propósito de este documento

Este archivo reúne y desarrolla la idea conversada para crear una
solución tecnológica destinada a geriátricos, residencias para adultos
mayores y establecimientos de cuidados de larga estadía.

Su objetivo es servir como **contexto central para una IA de
programación o un equipo de desarrollo** que deba comenzar el proyecto
desde cero. Explica:

-   Qué problema se quiere resolver.
-   Qué producto se propone construir y qué queda fuera del MVP.
-   Quiénes son los usuarios y qué necesita cada uno.
-   Cómo debería ser la experiencia del cliente y del usuario final.
-   Qué funcionalidades se necesitan.
-   Qué módulos componen la plataforma integral y en qué fase se
    construye cada uno.
-   Qué arquitectura y tecnologías se recomiendan.
-   Qué datos y permisos deben contemplarse.
-   Cómo organizar las etapas de desarrollo.
-   Cómo probar, desplegar y operar el producto.
-   Cómo validar el negocio y cobrar por él.
-   Qué decisiones deben confirmarse antes de avanzar.

Este documento es una base de trabajo, no una especificación legal ni
clínica definitiva. La IA que lo utilice debe **planificar, explicitar
supuestos y solicitar confirmación cuando una decisión afecte seguridad,
privacidad, alcance o costos**. No debe inventar requisitos regulatorios
ni implementar funciones clínicas críticas por cuenta propia.

------------------------------------------------------------------------

# 2. Resumen ejecutivo

## 2.1 La oportunidad

Crear software es cada vez más accesible gracias a los asistentes de
programación con IA. Sin embargo, la oportunidad comercial no consiste
en generar código rápidamente: consiste en resolver un problema real,
conseguir instituciones que lo utilicen y demostrar que la solución
mejora su operación.

El mercado ya cuenta con sistemas de gestión para residencias. Por lo
tanto, no se debe asumir que los geriátricos carecen de herramientas ni
construir otro sistema integral sin investigar primero sus necesidades.
La estrategia recomendada es encontrar un flujo de trabajo concreto que
hoy resulte lento, confuso, difícil de supervisar o dependiente de
cuadernos, planillas y mensajes dispersos.

## 2.2 Visión del producto

**Residencia360** es el nombre provisional de una plataforma web para
**digitalizar la operación completa de una residencia de adultos
mayores**: quiénes viven ahí y qué necesitan, quiénes trabajan ahí y
cuándo, qué atención recibe cada residente, qué medicación tiene
indicada, cuánta queda y quién la administró, qué pasó en cada turno y
cómo actuar en una emergencia.

Todo lo que ocurre queda **registrado con autor, fecha y hora**, sin
borrados silenciosos.

La plataforma se organiza en cuatro bloques:

1.  **Operación diaria:** novedades, tareas, incidencias y traspaso de
    turno.
2.  **Residentes y salud:** ficha personal, ficha de emergencia,
    historia clínica, equipo tratante, atenciones profesionales,
    signos vitales y medicación con stock.
3.  **Personal:** legajo de empleados, documentación, turnos y
    asistencia.
4.  **Familias y administración:** portal familiar, visitas, ocupación,
    documentación, cuotas y reportes.

Propuesta de valor resumida:

> Toda la información de la residencia en un solo lugar: la dirección
> ve la operación completa, el personal sabe qué hacer y qué medicación
> dar en cada turno, ante una emergencia los datos y contactos clave
> están a un toque, y cada acción queda trazada.

## 2.3 Estrategia recomendada

No construir todo de una vez. Primero:

1.  Investigar entre 5 y 10 residencias.
2.  Identificar problemas repetidos y costosos.
3.  Validar un prototipo con usuarios reales.
4.  Elegir un único flujo principal para el MVP.
5.  Probarlo con datos ficticios.
6.  Ejecutar un piloto controlado con una institución.
7.  Medir resultados y disposición a pagar.
8.  Convertir los patrones repetidos en un producto SaaS.

El objetivo comercial inicial sugerido es conseguir **tres instituciones
dispuestas a pagar**, no desarrollar durante meses un producto completo
sin validación.

### Visión integral, construcción por fases

La visión es digitalizar todo el geriátrico, pero se construye en fases
(detalle en la sección 7, plan en la sección 14, catálogo de módulos en
la sección 8):

| Fase | Contenido | Para qué sirve |
|------|-----------|----------------|
| **1 — MVP** | Usuarios y roles, ficha del residente, contactos, **ficha de emergencia**, novedades, traspaso de turno, auditoría | Lo mínimo que una residencia usa todos los días; ya resuelve emergencias |
| 2 — Seguimiento del cuidado | Tareas, incidencias, equipo tratante, atenciones y **última visita**, signos vitales | Organizar el trabajo y la atención profesional |
| 3 — Medicación y stock | Indicaciones, medicación del turno, registro de dosis, **stock por residente** | El mayor dolor operativo; alto valor y alto riesgo |
| 4 — Historia clínica | Evoluciones inalterables, antecedentes, adjuntos, exportación | Digitalizar el registro clínico con respaldo legal |
| 5 — Personal | Legajo completo, documentación, turnos, asistencia | RRHH y cumplimiento |
| 6 — Familias | Portal familiar, comunicados, visitas | Comunicación |
| 7 — Administración y escala | Camas, cuotas, reportes, multisede, integraciones | Gestión del negocio y crecimiento |

El MVP se construye chico, pero con cimientos que permiten sumar cada
fase como un módulo nuevo sin reescribir (sección 10.9). Para vender,
conviene **mostrar un prototipo navegable de las fases 1 a 3** aunque
solo la fase 1 esté programada, aclarando qué existe y qué viene.

------------------------------------------------------------------------

# 3. Problemas que se quieren investigar

Los siguientes puntos son hipótesis de producto, no afirmaciones
universales sobre todos los geriátricos. Deben validarse mediante
entrevistas y observación de procesos reales.

## 3.1 Traspaso de turno

Puede haber información que se comunica verbalmente, queda en cuadernos
o se distribuye entre diferentes canales. El siguiente turno podría no
conocer una tarea pendiente, una incidencia o una observación relevante.

Posible solución: - Registro de novedades por residente. - Resumen de
turno. - Tareas pendientes. - Incidencias con responsable y estado. -
Historial auditable de cambios.

## 3.2 Coordinación de tareas

Las tareas pueden depender de recordatorios manuales y no siempre es
fácil identificar quién debe actuar, cuándo se completó una tarea o qué
continúa pendiente.

Posible solución: - Tareas asignables. - Fecha y hora. - Responsable. -
Estado. - Prioridad definida por el personal autorizado. - Comentarios y
registro de cierre. - Alertas internas configurables.

## 3.3 Comunicación con familiares

Los familiares pueden realizar consultas repetidas sobre visitas,
actividades o novedades. La residencia necesita comunicar información
sin revelar datos a personas no autorizadas ni sobrecargar al personal.

Posible solución futura: - Portal privado. - Comunicaciones
autorizadas. - Calendario y solicitud de visitas. - Actividades y avisos
generales. - Documentación administrativa autorizada. - Control
explícito de qué información puede ver cada familiar.

No asumir que todas las residencias desean un portal familiar. Validar
si el problema es suficientemente importante como para pagar por él.

## 3.4 Administración y dirección

La dirección podría necesitar una visión consolidada de ocupación,
documentación, tareas, incidencias, pagos y gastos. Estos procesos
pueden estar distribuidos en planillas y herramientas distintas.

Posible solución futura: - Panel de indicadores. - Seguimiento de
documentación administrativa. - Ocupación. - Cuotas y pagos pendientes,
si se valida el alcance. - Reportes periódicos. - Exportaciones. -
Detección de inconsistencias administrativas para revisión humana.

## 3.5 Documentación

Podría ser útil centralizar vencimientos, archivos y pendientes
administrativos. La automatización debe limitarse a la organización
documental y a la preparación de borradores hasta que se definan las
validaciones correspondientes.

## 3.6 Medicación y stock

Es habitual que la medicación de cada residente provenga de distintas
fuentes (familia, obra social/PAMI, farmacia, la propia residencia), que
se controle en planillas o cuadernos y que nadie sepa con certeza cuánto
queda hasta que se termina. También puede ser difícil saber quién
administró una dosis, si se omitió y por qué.

Posible solución: - Indicaciones de medicación cargadas o validadas por
un profesional autorizado. - Registro de administración por dosis
(administrada, omitida, rechazada, con motivo). - Stock por residente y
por medicamento, con movimientos (ingreso, consumo, ajuste, descarte,
devolución). - Estimación de días restantes según las indicaciones
activas y alerta de reposición. - Vencimientos de lotes. - Historial
completo de quién hizo cada movimiento.

## 3.7 Emergencias

En una urgencia, el personal necesita en segundos: a quién llamar,
alergias, cobertura de salud y número de afiliado, médico de cabecera,
medicación actual y antecedentes relevantes. Si esa información está en
una carpeta o en el teléfono de una sola persona, se pierde tiempo.

Posible solución: - Ficha de emergencia accesible con un toque desde
cualquier pantalla del residente. - Botón de llamada directa a los
contactos de emergencia en orden de prioridad. - Hoja de derivación
imprimible o descargable para la ambulancia o la guardia. - Registro de
la emergencia como incidencia con seguimiento.

## 3.8 Personal y empleados

La dirección necesita saber quién trabaja, en qué rol, en qué turno, si
su documentación y matrícula están vigentes y quién estaba de guardia
cuando ocurrió algo.

Posible solución: - Legajo de empleados. - Matrícula y especialidad para
profesionales. - Documentación con vencimientos y alertas. - Turnos y
guardias. - Asistencia (entrada/salida). - Relación entre empleado y
usuario del sistema.

## 3.9 Atención profesional e historia clínica

Cada residente es atendido por varios profesionales (médico de
cabecera, enfermería, kinesiología, nutrición, psicología, terapia
ocupacional, especialistas externos, emergencias). Hoy esa información
puede estar en papel, dispersa o incompleta, y cuesta responder "¿cuándo
lo vio el kinesiólogo por última vez?".

Posible solución: - Equipo tratante por residente. - Registro de cada
atención (tipo, profesional, fecha, motivo, evolución, indicaciones). -
"Última visita" por especialidad en la ficha. - Historia clínica con
evoluciones inalterables y enmiendas firmadas. - Adjuntos (estudios,
epicrisis, recetas) con acceso restringido.

------------------------------------------------------------------------

# 4. Investigación de mercado y posicionamiento

## 4.1 Competencia y alternativas existentes

Antes de diseñar el producto, investigar las soluciones actuales para
residencias argentinas. Entre los nombres mencionados inicialmente como
ejemplos para investigar están:

-   Gentrix: https://www.gentrix.ar/
-   Inforint AM: https://www.inforintam.com.ar/
-   InReside: https://inreside.com.ar/
-   MedIT Care: https://meditcare.app/

Estos enlaces son puntos de partida para investigación, no una
evaluación completa ni una afirmación de que las funciones, precios o
condiciones actuales sean exactamente los descritos en conversaciones
anteriores. La IA debe revisar sus páginas oficiales actualizadas antes
de realizar comparaciones comerciales.

Investigar: - Funcionalidades. - Tipos de instituciones objetivo. -
Modalidad de implementación. - Experiencia móvil. - Soporte y
capacitación. - Integraciones. - Seguridad y tratamiento de datos. -
Modelo de precios. - Quejas o necesidades no cubiertas, cuando haya
evidencia pública fiable.

## 4.2 Posicionamiento inicial

No competir inicialmente como "el sistema que hace todo". Elegir una
ventaja concreta, por ejemplo:

-   Más sencillo de aprender.
-   Enfocado en traspaso de turnos e incidencias.
-   Implementación rápida.
-   Excelente experiencia móvil.
-   Mejor trazabilidad de tareas.
-   Integración con procesos existentes, sin obligar a sustituir todo el
    software.

La ventaja debe surgir de entrevistas y pruebas, no de suposiciones.

## 4.3 Dos rutas de entrada al mercado

### Ruta A: SaaS especializado

Construir una plataforma propia para un problema repetido. Ventajas: -
Ingresos recurrentes. - Producto replicable. - Posibilidad de
estandarizar onboarding y soporte.

Riesgos: - Mayor inversión inicial. - Competencia existente. - Necesidad
de resolver seguridad, disponibilidad y soporte. - Riesgo de que un
módulo aislado no sea suficientemente valioso.

### Ruta B: automatización e integración

Ofrecer inicialmente servicios para organizar reportes, avisos,
documentación o información administrativa con los sistemas actuales de
cada residencia.

Ventajas: - Puede generar ingresos antes. - Permite aprender del trabajo
real. - Reduce la necesidad de reemplazar todo el software existente.

Riesgos: - Adaptaciones específicas por cliente. - Dependencia de
herramientas de terceros. - Dificultad para convertir cada proyecto a
medida en un producto estándar.

### Recomendación

Comenzar con entrevistas y una solución de alcance acotado. Si varias
instituciones pagan por resolver el mismo problema, convertir ese flujo
en un SaaS. No elegir la ruta definitiva sin validar la demanda.

------------------------------------------------------------------------

# 5. Usuarios, roles y necesidades

El sistema debe distinguir claramente a los usuarios. La lista final se
validará durante discovery.

## 5.1 Dueño o dirección

Necesita: - Visibilidad de la operación. - Seguimiento de incidencias. -
Supervisión de tareas. - Reportes claros. - Control de usuarios y
permisos. - Menos dependencia de información dispersa.

No debería necesitar recorrer pantallas clínicas para encontrar
información administrativa.

## 5.2 Administrador de la residencia

Necesita: - Mantener datos básicos de la institución. - Gestionar
usuarios. - Organizar residentes y unidades habitacionales, si el MVP lo
contempla. - Configurar tareas y procesos. - Revisar reportes. -
Gestionar solicitudes de familiares, si se incluye el portal.

## 5.3 Personal de atención o enfermería

Necesita: - Encontrar rápidamente a la persona correcta. - Registrar una
novedad con pocos pasos. - Consultar pendientes relevantes. - Saber qué
tareas le corresponden. - Entregar y recibir el turno de manera clara.

La interfaz debe priorizar legibilidad, botones grandes, lenguaje
simple, funcionamiento en móviles y pocas pantallas por tarea. No se
debe diseñar como un panel de administración complejo si se utilizará
durante una jornada de trabajo activa.

## 5.4 Personal administrativo

Necesita: - Gestionar documentación y pendientes administrativos. -
Preparar reportes. - Mantener registros de pagos o cuotas solo si el
módulo financiero se incluye. - Exportar datos autorizados.

## 5.5 Familiar autorizado

Solo si se valida el portal familiar: - Acceder a la información que la
residencia autorizó compartir. - Ver avisos y actividades. - Solicitar o
consultar visitas. - Consultar documentos habilitados. - Actualizar sus
datos de contacto, si se permite.

Un familiar no debe poder buscar o ver a otros residentes. El acceso
debe estar vinculado a una autorización verificada y revocable.

## 5.6 Soporte de la plataforma

El equipo que opera el SaaS podría necesitar gestionar cuentas y
resolver incidencias técnicas. El acceso de soporte a datos de
residentes debe ser mínimo, justificado, registrado y sujeto a
controles. No se debe crear una cuenta maestra que pueda consultar
indiscriminadamente todos los datos sin trazabilidad.

## 5.7 Médico/a de cabecera y profesionales de salud

Incluye médico/a de la institución, kinesiólogo/a, nutricionista,
psicólogo/a, terapista ocupacional, fonoaudiólogo/a y otros
profesionales internos.

Necesita: - Ver la ficha clínica de sus pacientes. - Registrar
evoluciones y atenciones. - Cargar o validar indicaciones de medicación
(solo los roles habilitados para indicar). - Consultar signos vitales y
administración de medicación. - Ver la última visita de cada
especialidad.

Cada profesional debe tener matrícula registrada. Sus registros quedan
firmados con su identidad y no pueden modificarse; solo enmendarse.

## 5.8 Enfermería y cuidadores (separación de roles)

El rol "Personal de atención" de la sección 5.3 se divide en:

-   **Enfermería:** administra medicación, registra signos vitales y
    evoluciones de enfermería, gestiona el stock de medicación.
-   **Cuidador/a o auxiliar:** registra novedades y tareas de cuidado
    diario; ve la ficha de emergencia y la medicación del turno solo si
    la institución lo habilita; no edita indicaciones ni stock.

Qué puede hacer cada rol lo define la institución dentro de los límites
de la matriz de permisos (Apéndice D) y de la normativa de ejercicio
profesional.

## 5.9 Recursos humanos o encargado de personal

Necesita: - Dar de alta y baja empleados. - Mantener documentación y
vencimientos. - Organizar turnos y guardias. - Revisar asistencia. -
Vincular empleados con usuarios del sistema.

No necesita acceder a historia clínica ni medicación.

## 5.10 Profesional externo

Médicos especialistas, servicios de emergencia o acompañantes
terapéuticos que atienden a un residente pero no son personal estable.

Por defecto se registran como **contactos del equipo tratante sin
usuario**: el personal carga lo que informan. Si la institución quiere
darles acceso, debe ser un usuario con acceso limitado a los residentes
asignados y con vencimiento.

------------------------------------------------------------------------

# 6. Experiencia completa del cliente

La experiencia del cliente incluye mucho más que la interfaz del
software. Debe cubrir desde el primer contacto comercial hasta la
renovación o salida del servicio.

## 6.1 Descubrimiento y venta

1.  La residencia conoce el producto mediante una recomendación,
    contacto directo o demostración.
2.  Se realiza una conversación breve para comprender su operación.
3.  Se documentan sus problemas actuales, herramientas y restricciones.
4.  Se muestra un prototipo que refleje esos flujos.
5.  Se acuerda qué problema se resolverá primero.
6.  Se define el alcance, precio, responsabilidades, soporte y criterios
    de éxito.

No prometer ahorro de tiempo o reducción de errores sin medirlos.

## 6.2 Diagnóstico previo

Antes de activar una cuenta: - Identificar responsables del
establecimiento. - Determinar qué información se registrará. - Mapear el
flujo de trabajo actual. - Identificar dispositivos y conectividad
disponibles. - Revisar los roles de usuarios. - Definir quién autoriza
el acceso a datos. - Establecer cómo se hará una prueba segura. -
Determinar qué información no debe almacenarse en el MVP.

## 6.3 Configuración inicial

La implementación debería ser guiada: 1. Crear la institución. 2.
Configurar datos básicos. 3. Invitar a responsables. 4. Definir roles y
permisos. 5. Configurar categorías de novedades e incidencias. 6. Crear
tareas o flujos iniciales. 7. Capacitar al equipo. 8. Probar el flujo
completo con datos ficticios. 9. Aprobar la puesta en marcha.

Si se migran datos, definir el formato, la autorización, la validación,
la seguridad y el procedimiento para corregir errores. No importar
planillas sensibles de forma improvisada.

## 6.4 Primer día de uso

La pantalla inicial debe ayudar al usuario a contestar rápidamente: -
¿Qué necesita mi atención? - ¿Qué está pendiente? - ¿Qué novedades se
registraron? - ¿Qué debo completar antes de terminar mi turno?

Evitar un dashboard lleno de gráficos que no ayuden al trabajo diario.

## 6.5 Uso cotidiano

Flujo orientativo de novedades: 1. El usuario inicia sesión. 2.
Selecciona la residencia y, si corresponde, el área o turno. 3. Busca y
confirma el residente correcto. 4. Selecciona una categoría. 5. Registra
la información necesaria, con lenguaje claro. 6. Decide si requiere
seguimiento y asigna responsable cuando corresponda. 7. Guarda. 8. El
sistema registra autor, fecha y hora. 9. La novedad aparece en el panel
de personas autorizadas. 10. El responsable revisa y actualiza el estado
sin borrar el historial.

Los flujos de cuidado reales deben ser diseñados y aprobados por
profesionales de la institución. El software no reemplaza protocolos de
emergencia ni decisiones clínicas.

## 6.6 Traspaso de turno

Al finalizar un turno: - Se muestran novedades y tareas que siguen
abiertas. - El personal saliente revisa el resumen. - El personal
entrante confirma la recepción, si el proceso institucional lo exige. -
Las tareas pendientes mantienen responsable y estado. - Las
modificaciones posteriores quedan registradas.

Una confirmación digital no debe interpretarse automáticamente como
prueba de que se realizó una acción de cuidado. El significado de cada
estado debe definirse con la institución.

## 6.7 Comunicación con familiares

Si se desarrolla el portal: 1. La residencia verifica la identidad y la
autorización del familiar. 2. Un usuario autorizado vincula la cuenta
con el residente. 3. Se define qué categorías de información puede
consultar. 4. El familiar recibe una invitación segura. 5. Accede
únicamente a información compartida. 6. Las solicitudes y comunicaciones
quedan registradas según la política definida.

No enviar información sensible en notificaciones visibles en la pantalla
bloqueada del teléfono. Usar mensajes genéricos que soliciten iniciar
sesión para ver el detalle.

## 6.8 Soporte y renovación

El producto debe incluir: - Canal de soporte. - Horarios y tiempos de
respuesta definidos. - Guías breves. - Registro de incidentes. -
Procedimiento de recuperación de cuenta. - Exportación de datos. -
Política de renovación y cancelación. - Procedimiento seguro de salida y
eliminación o conservación según obligaciones aplicables.

## 6.9 Emergencia

1.  Desde la lista de residentes, el inicio o la búsqueda, el usuario
    toca el botón **"Emergencia"** del residente (visible siempre, color
    y texto, no solo ícono).
2.  Se abre la **ficha de emergencia** en una sola pantalla: nombre,
    foto (si se autorizó), edad, DNI, cobertura y número de afiliado,
    alergias, diagnósticos relevantes cargados por el médico,
    medicación activa, médico de cabecera, indicaciones especiales (por
    ejemplo directivas anticipadas si existen y fueron documentadas) y
    contactos de emergencia en orden.
3.  Cada contacto tiene botón **"Llamar"** (enlace `tel:`) y, si se
    habilita, WhatsApp.
4.  Botón **"Hoja de derivación"**: genera un PDF imprimible con los
    datos anteriores para entregar a la ambulancia o la guardia.
5.  Botón **"Registrar emergencia"** (fase 2): crea una incidencia con hora de
    inicio, a quién se llamó, si hubo traslado y a dónde.
6.  En el MVP la ficha de emergencia la ve todo el personal activo y
    cada apertura queda auditada. Desde la fase 4, si el rol del usuario
    no ve datos clínicos, usa **acceso de emergencia** (sección 12.8):
    accede, el acceso queda registrado con motivo y se notifica a la
    dirección.

Qué llega en cada fase: contactos, alergias, cobertura, médico de
cabecera y hoja de derivación en el MVP; "Registrar emergencia" en la
fase 2; medicación activa y última administración en la fase 3;
diagnósticos relevantes y break-glass en la fase 4.

El sistema no reemplaza el protocolo de emergencias de la institución
ni la llamada al servicio de emergencias. La ficha debe funcionar en
teléfonos comunes y cargar rápido.

## 6.10 Ronda de medicación

1.  Enfermería abre **"Medicación del turno"**.
2.  Ve la lista de dosis programadas por horario y residente, generada
    a partir de las indicaciones activas.
3.  Antes de registrar, confirma el residente correcto (foto y nombre).
4.  Marca cada dosis como administrada, omitida, rechazada o diferida;
    los estados distintos de "administrada" exigen motivo.
5.  Al marcar "administrada", el stock del residente se descuenta
    automáticamente mediante un movimiento de consumo.
6.  Las dosis pendientes al final del turno aparecen en el traspaso.
7.  Las alertas de stock bajo y vencimientos próximos aparecen en el
    panel de enfermería y de dirección.

Cambiar una dosis, frecuencia o medicamento solo lo hace un profesional
habilitado, mediante una nueva indicación que reemplaza a la anterior.
El sistema nunca calcula ni sugiere dosis.

## 6.11 Registro de una atención o visita profesional

1.  El profesional (o el personal, si es un profesional externo sin
    usuario) abre el residente y elige **"Nueva atención"**.
2.  Selecciona el tipo: médico de cabecera, enfermería, kinesiología,
    nutrición, psicología, terapia ocupacional, especialista externo,
    urgencia/guardia, traslado, odontología, otro.
3.  Registra profesional, fecha y hora, motivo, evolución u
    observaciones e indicaciones resultantes.
4.  Si hay nueva medicación, el profesional habilitado la carga como
    indicación; si la informó un externo, queda pendiente de validación
    por el médico de la institución.
5.  Opcional: adjuntar estudio, receta o epicrisis.
6.  La ficha del residente actualiza **"Última visita"** por tipo.
7.  Si la atención requiere seguimiento (control en 7 días, estudio
    pendiente), se crea una tarea con vencimiento.

## 6.12 Ingreso y egreso de un residente

**Antes del ingreso (opcional): solicitud de ingreso.** La familia
completa la solicitud desde la landing pública de la residencia, o un
usuario de Administración o Dirección la carga a mano cuando la familia
llama, escribe o se acerca. La solicitud queda en una bandeja; al
convertirla, se abre el ingreso guiado con los pasos 1 y 2 ya completos
(sección 7.3-C3). El ingreso también se puede empezar directamente, sin
solicitud.

Ingreso en Mis Nonos (MVP, modelo real del Apéndice E), en 4 pasos:

1.  **Paciente y cobertura:** fecha de ingreso, habitación, institución
    que lo deriva, nombre, nacimiento (edad calculada), DNI, lugar de
    nacimiento, domicilio anterior, modalidad (PAMI internación
    geriátrica o privado) y N.º de beneficiario o afiliado.
2.  **Responsable y contactos:** responsable de la internación
    (parentesco, nombre, DNI, domicilio, teléfono, celular, laboral) y
    los demás familiares en el orden en que hay que llamarlos.
3.  **Documentación:** checklist de los papeles firmados con foto de
    cada uno (ver 7.3-C2). Los formularios de PAMI se siguen firmando en
    el papel oficial.
4.  **Revisar y confirmar:** resumen, documentos faltantes (se puede
    confirmar igual y quedan pendientes) y lo acordado con la familia,
    incluido el **abono mensual**: precio, próximo vencimiento (por
    defecto, el mismo día del mes siguiente) y si el primer mes se
    cobró al ingreso (sección 7.3-C4).

En fases posteriores el ingreso suma: antecedentes y alergias validados
por el médico (F4), medicación con la que llega como inventario inicial
de stock (F3), equipo tratante (F2) y cama asignada (F7).

Egreso (alta, traslado o fallecimiento): registro del motivo y fecha,
liberación de la cama, cierre de indicaciones y stock (devolución o
descarte registrado), conservación de la historia clínica según la
normativa. El residente egresado no se elimina: queda inactivo.

## 6.13 Alta y baja de un empleado

Alta: datos personales, rol, matrícula si corresponde, documentación,
turno, y opcionalmente creación del usuario del sistema con el rol
correspondiente. Baja: fecha y motivo, **revocación inmediata del
acceso** al sistema, conservación del legajo y de todos sus registros
históricos (sus firmas en evoluciones y administraciones no
desaparecen).

------------------------------------------------------------------------

# 7. Alcance por fases: MVP y hoja de ruta

## 7.1 Criterio de división

-   **El MVP es lo mínimo que una residencia usaría todos los días y
    pagaría:** saber quién vive ahí, cómo contactar a su familia en una
    emergencia y qué pasó en cada turno. Nada más.
-   **Cada fase posterior es un módulo que se activa encima del
    anterior**, sin rehacer lo existente. Por eso el MVP toma desde el
    día uno las decisiones de arquitectura de la sección 10.9, aunque
    todavía no use todo.
-   **Las fases se ordenan por valor y riesgo:** primero lo operativo
    (bajo riesgo), después la medicación y la historia clínica (alto
    valor, alto riesgo, requieren revisión legal), después personal,
    familias y administración.
-   **Ninguna fase arranca sin que la anterior esté en uso real** o sin
    que un cliente la pida y la pague.

## 7.2 Resumen de fases

| Fase | Nombre | Qué agrega | Puerta para empezarla |
|------|--------|------------|-----------------------|
| **1** | **MVP — Residentes, emergencias y turno** | Usuarios y roles, ficha del residente, contactos, ficha de emergencia, novedades, traspaso de turno, auditoría | Discovery y prototipo validados |
| 2 | Seguimiento del cuidado | Tareas, incidencias, atenciones profesionales y última visita, equipo tratante, signos vitales | MVP en uso diario en al menos 1 residencia |
| 3 | Medicación y stock | Indicaciones, medicación del turno, registro de administración, stock por residente, alertas | Revisión legal de datos de salud; diseño validado con médico y enfermería |
| 4 | Historia clínica | Antecedentes, evoluciones inalterables, enmiendas, adjuntos, línea de tiempo, exportación, acceso de emergencia auditado | Revisión legal de historia clínica digital en la jurisdicción |
| 5 | Personal | Legajo completo, documentación y vencimientos, turnos, guardias, asistencia | Demanda de clientes |
| 6 | Familias | Portal familiar, autorizaciones, comunicados, visitas | Demanda de clientes |
| 7 | Administración y escala | Camas y ocupación, documentos, cuotas, pagos, gastos, reportes, multisede, integraciones, IA | Demanda de clientes |

## 7.3 Fase 1 — MVP: Residentes, emergencias y turno

**Objetivo:** validar que una residencia usa el sistema todos los días
para consultar a sus residentes, actuar en emergencias y pasar el turno,
y que paga por él.

**Duración orientativa:** 4 a 6 semanas de desarrollo después del
prototipo.

### A. Acceso y usuarios

-   Inicio y cierre de sesión, recuperación de contraseña.
-   Invitación de usuarios por email y desactivación.
-   Roles iniciales: **Administrador, Dirección, Enfermería,
    Cuidador/a**. Los permisos se guardan como datos (sección 10.9), no
    escritos a mano en cada pantalla.
-   Perfil del usuario = **empleado básico**: nombre, rol, teléfono,
    profesión y matrícula opcionales. Desactivar el usuario revoca el
    acceso y conserva su nombre en el historial.

### B. Institución

-   Datos básicos de la residencia y zona horaria.
-   Categorías de novedades configurables.
-   Turnos de la institución (por ejemplo mañana, tarde, noche) con sus
    horarios, para armar el traspaso.
-   **Servicio de emergencias contratado** (nombre y teléfono; en Mis
    Nonos, Medicardio) que aparece primero en la ficha de emergencia.
-   Reglas de la residencia como texto de referencia: frecuencia del
    control médico (semanal), regla de la cuota (mes adelantado, vence el
    día de ingreso) y qué provee la familia. En el MVP son informativas;
    las fases 2, 3 y 7 las usan para calcular.
-   Desde la v2.4 la regla de la cuota también se usa en el MVP: calcula
    el vencimiento del abono mensual (C4). Se configuran además los días
    de anticipación del aviso de vencimiento (7 por defecto).

### C. Residentes

-   Ficha personal: nombre y apellido, DNI, fecha de nacimiento (edad
    calculada), lugar de nacimiento, domicilio anterior, foto opcional,
    habitación (texto libre en el MVP), fecha de ingreso, institución que
    lo deriva, estado (activo, internado fuera, egresado).
-   Modalidad de internación: **PAMI (internación geriátrica)** o
    **privado**. Cobertura: PAMI con N.º de beneficiario, u obra
    social/prepaga con N.º de afiliado.
-   Alergias (lista simple) e indicaciones especiales (texto).
-   Médico de cabecera (nombre y teléfono).
-   Búsqueda por nombre y habitación.
-   Egreso sin borrado: el residente queda inactivo.

### D. Contactos familiares y de emergencia

-   Nombre, vínculo, teléfono principal, celular, laboral, email.
-   Orden de prioridad para emergencias.
-   Marca de **responsable de la internación** (uno por paciente): es
    quien firma la ficha de ingreso, las obligaciones y los formularios
    de PAMI. Lleva además DNI y domicilio.
-   Marca de referente legal (puede o no coincidir con el responsable).

### C2. Ingreso guiado y legajo documental

-   Ingreso en 4 pasos (sección 6.12), que se puede guardar a medias y
    retomar.
-   **Legajo documental** del paciente con checklist configurable por
    modalidad. En Mis Nonos: ficha de ingreso firmada, obligaciones de
    las partes firmadas, consentimiento PAMI, acta compromiso PAMI, DNI
    original en custodia (foto frente y dorso), credencial PAMI;
    opcionales: estudios previos y documentación médica o psiquiátrica
    previa.
-   Cada documento: estado (falta, foto cargada), foto o PDF, quién lo
    cargó y cuándo. Los faltantes se muestran en la ficha y en el Inicio
    de Administración.
-   Las fotos usan el almacenamiento privado del MVP (sección 10.9, E12):
    acceso solo para Administración y Dirección, enlace temporal y cada
    apertura auditada. La firma sigue siendo en papel; la app no
    reemplaza los formularios oficiales de PAMI.

### C3. Solicitudes de ingreso (carga manual y landing pública)

Bandeja de solicitudes previa al ingreso. Dos canales terminan en la
misma tabla:

1.  **Carga manual en la app:** un usuario con permiso (Administración
    o Dirección) carga la solicitud cuando la familia llama, escribe o
    se acerca, y registra el canal (teléfono, WhatsApp, presencial,
    derivación u otro).
2.  **Landing pública** de la residencia, en la misma aplicación: la
    familia completa un formulario corto desde el celular. Se construye
    **al final del MVP** y se publica solo con el aviso de privacidad
    revisado por el abogado (sección 12.9).

Reglas:

-   Datos que se piden: los de los pasos 1 y 2 del ingreso (paciente,
    cobertura, responsable de la internación y demás contactos en
    orden), la fecha deseada de ingreso y un mensaje opcional. Nunca
    diagnósticos, medicación ni fotos de documentos.
-   La solicitud **no crea un paciente**: queda en la bandeja hasta que
    alguien la revise. Así nadie de afuera puede crear pacientes ni
    llenar la lista.
-   Estados (propuesta, Apéndice F): nueva → en contacto → en espera
    (sin vacante) → convertida o descartada. Descartar exige un motivo
    (sin vacante, no cumple requisitos, desistió, duplicada, spam u
    otro).
-   **Convertir en ingreso** crea, en una sola transacción, el borrador
    del ingreso guiado (C2) con los pasos 1 y 2 completos y deja la
    solicitud vinculada. Si ya hay un paciente o una solicitud con el
    mismo DNI, se avisa al personal antes de convertir. El DNI se
    verifica en la entrevista, con el original.
-   El ingreso guiado se puede seguir empezando directamente, sin
    solicitud.
-   Cada residencia puede tener su propia landing (preparado para el
    SaaS); en el MVP solo existe la de Mis Nonos.
-   Las solicitudes que no se convierten se borran pasado un plazo que
    se define con el abogado (trabajo programado, E15).
-   Una solicitud nueva genera un aviso para Administración y Dirección,
    sin datos del paciente (10.6).
-   Pantallas: landing, formulario público en 2 pasos y confirmación; en
    la app, pestaña "Solicitudes" en Pacientes (solo con permiso),
    detalle con "Convertir en ingreso" y "Descartar", y "Nueva
    solicitud" manual.

### C4. Abono mensual y pagos

Adelanta al MVP la parte de M23 que Mis Nonos usa todos los meses: el
abono de cada paciente, sus pagos y el aviso de vencimiento. Gastos,
reportes financieros y facturación siguen en la fase 7.

-   En el paso 4 del ingreso se cargan, obligatoriamente, el **abono
    mensual** (en pesos) y el **próximo vencimiento**.
-   Vencimiento por defecto: el mismo día del mes siguiente al ingreso
    (regla "mes adelantado, vence el día de ingreso"). Si ese día no
    existe en el mes (29 a 31), vence el último día. Ejemplo: ingresa el
    14/10, vence el 14/11 y el aviso llega el 07/11. El día de
    vencimiento se puede cambiar por paciente.
-   El primer mes se cobra por adelantado: la casilla "Primer mes
    cobrado al ingreso" registra ese pago.
-   Cada mes la app genera la **cuota** con el precio vigente. Se
    registran **pagos**, incluso parciales, con fecha, monto y medio
    (efectivo, transferencia u otro); la cuota muestra el saldo y su
    estado (pendiente, pagada o vencida).
-   Cambiar el precio guarda el anterior con fecha y motivo, y aplica
    desde la próxima cuota sin pagar.
-   Un pago no se borra: se anula con motivo. Todo cambio de precio y
    todo pago quedan en la auditoría.
-   Se permite monto 0 (por ejemplo, si PAMI cubre todo): no genera
    avisos. Con el egreso dejan de generarse cuotas; con "internado
    fuera" siguen.
-   **Aviso de vencimiento:** un trabajo diario (08:00 en la zona horaria
    de la sede) busca las cuotas sin pagar que vencen en 7 días
    (configurable) y avisa a cada usuario de Administración y Dirección:
    una notificación por cuota en la campana de la app y un email por
    día que agrupa los vencimientos, sin nombres ni montos, con enlace a
    la app. No avisa si la cuota ya se pagó ni repite el aviso si el
    trabajo se reintenta.
-   Solo Administración y Dirección ven montos y pagos (`fees.read`,
    `fees.manage`); Enfermería y Cuidado no los ven ni en pantalla ni
    por API (sección 12.10).
-   Módulo activable `fees` (10.9, E3), encendido para Mis Nonos.
-   Pantallas: campos del abono en el paso 4 del ingreso; sección
    "Abono" en la ficha (precio actual, próximo vencimiento, historial,
    "Registrar pago" y "Cambiar precio"); lista "Abonos" del mes con
    pagadas, pendientes y vencidas (base: pantalla "Cuotas" de la fase 7
    del canvas); formulario "Registrar pago"; tarjeta en el Inicio de
    Administración y Dirección; ajuste del aviso en Configuración.
-   Fuera de alcance: facturación electrónica (ARCA) y recibos fiscales.
    La app solo registra los cobros.

### E. Ficha de emergencia

-   Botón **Emergencia** en la lista y en la ficha de cada residente.
-   Una pantalla con identificación, cobertura, alergias, indicaciones
    especiales, médico de cabecera y botones **Llamar**: primero el
    servicio de emergencias contratado (Medicardio), después la familia
    en orden, empezando por el responsable de la internación.
-   **Hoja de derivación en PDF** para la ambulancia o la guardia.
-   En el MVP la ficha de emergencia es visible para todo el personal
    activo de la institución; cada apertura y cada PDF quedan
    auditados. El acceso por "break-glass" con roles más restringidos
    llega en la fase 4.

### F. Novedades

-   Registro por residente o general: categoría, texto, autor, fecha y
    hora automáticas.
-   Marca **"requiere seguimiento"** y estado (abierta / resuelta). En el
    MVP esto cubre tareas e incidencias simples; los módulos completos
    llegan en la fase 2.
-   Una novedad no se borra: se corrige con una nueva versión que
    conserva la anterior.

### G. Traspaso de turno

-   Resumen del turno: novedades del período y pendientes abiertos.
-   Confirmación de recepción por el turno entrante (opcional según la
    institución).

### H. Inicio

-   Personal: pendientes abiertos, novedades recientes, acceso rápido a
    residentes y a Emergencia.
-   Dirección: lo mismo más actividad reciente.

### I. Auditoría

-   Registro de toda escritura (quién, qué, cuándo, valor anterior y
    nuevo) y de las aperturas de la ficha de emergencia.
-   Vista de historial en cada residente y en cada novedad.
-   Nadie de la institución puede borrar la auditoría.

### J. Calidad mínima para salir

-   Separación estricta entre instituciones probada (instituciones A y
    B).
-   Funciona bien en teléfonos Android comunes.
-   Backups automáticos y una restauración probada.
-   Datos ficticios en desarrollo y demos.

### Fuera del MVP (y dónde está)

| Funcionalidad | Fase |
|---------------|------|
| Tareas con responsable y vencimiento, incidencias con tipos | 2 |
| Atenciones profesionales, última visita, equipo tratante | 2 |
| Signos vitales | 2 |
| Medicación y stock | 3 |
| Historia clínica, adjuntos clínicos, break-glass | 4 |
| Legajo completo de empleados, turnos, asistencia | 5 |
| Portal de familias | 6 |
| Camas, ocupación, gastos, reportes financieros, facturación, multisede, integraciones, IA (el abono mensual y sus pagos están en el MVP, C4) | 7 |
| Firma digital de documentos de ingreso | A evaluar; hoy se firma en papel |

## 7.4 Fase 2 — Seguimiento del cuidado

-   **Tareas:** responsable, vencimiento, prioridad, comentarios,
    tareas recurrentes (cambios posturales, controles, curaciones).
-   **Incidencias:** tipos configurables (caída, lesión, emergencia,
    conducta, mantenimiento), estado, responsable y cierre. La ficha de
    emergencia gana el botón "Registrar emergencia".
-   **Equipo tratante:** profesionales internos y externos por
    residente, con frecuencia de visita esperada opcional.
-   **Atenciones y visitas profesionales:** médico, enfermería,
    kinesiología, nutrición, psicología, urgencia, traslado, etc., con
    **"última visita" por tipo** y aviso de visita atrasada.
-   **Signos vitales y controles:** registro rápido, gráficos, controles
    programados como tareas recurrentes.
-   Las "novedades con seguimiento" del MVP se pueden convertir en
    tareas o incidencias sin perder historial.

## 7.5 Fase 3 — Medicación y stock

-   Catálogo de medicamentos de la institución.
-   Indicaciones cargadas o validadas por profesional habilitado.
-   **Medicación del turno** y registro de cada dosis (administrada,
    omitida, rechazada, diferida, no disponible, con motivo).
-   **Stock por residente** como libro de movimientos, consumo automático
    al administrar, lotes y vencimientos.
-   Días restantes estimados y alertas de reposición y vencimiento.
-   Botiquín de la residencia e insumos por residente (si se valida).
-   Doble verificación configurable para medicamentos marcados.
-   La medicación activa se suma a la ficha de emergencia y a la hoja de
    derivación.

Requiere revisión legal previa y validación con el médico y la
enfermería de la residencia piloto. Se pilotea en paralelo con el
registro en papel hasta que la institución apruebe el reemplazo.

## 7.6 Fase 4 — Historia clínica

-   Antecedentes y diagnósticos con autoría.
-   Evoluciones inalterables con enmiendas.
-   Adjuntos clínicos (estudios, epicrisis, recetas, consentimientos).
-   Línea de tiempo unificada del residente.
-   Exportación de la historia clínica.
-   Auditoría de lecturas sensibles y acceso de emergencia
    ("break-glass") para roles sin permiso clínico.
-   Definición de firma electrónica o digital según asesoría legal.

## 7.7 Fase 5 — Personal

-   Legajo completo de empleados (sección 8.5).
-   Documentación con vencimientos y alertas.
-   Turnos y guardias planificados, intercambios con aprobación.
-   Asistencia y reporte "quién estaba de guardia".

## 7.8 Fase 6 — Familias

-   Portal privado con autorizaciones explícitas, vigentes y revocables.
-   Comunicados y actividades.
-   Solicitud y agenda de visitas.
-   Notificaciones genéricas sin datos sensibles.

## 7.9 Fase 7 — Administración y escala

-   Habitaciones, camas y ocupación.
-   Gestión documental de la residencia.
-   Cuotas, pagos, gastos y reportes financieros.
-   Panel de dirección con indicadores consolidados.
-   **Multisede:** varias residencias bajo un mismo grupo con reportes
    consolidados.
-   Integraciones (farmacias, laboratorios, receta electrónica, sistemas
    existentes), lectura de códigos QR/barras, app nativa si se
    demuestra necesaria, IA para borradores de reportes.

## 7.10 Límites permanentes del sistema

El sistema **registra y organiza** lo que indican y hacen los
profesionales. No incluir, en ninguna fase, sin un proyecto específico,
validación profesional, análisis regulatorio y de riesgos:

-   Diagnóstico médico.
-   Recomendaciones clínicas autónomas.
-   Prescripción automática, cálculo o sugerencia de dosis.
-   Modificación de medicación por personas no habilitadas.
-   Detección de interacciones medicamentosas presentada como
    validación clínica (si en el futuro se integra una base de
    interacciones, debe ser un proveedor validado y solo informativo).
-   Alertas médicas que pretendan reemplazar el criterio profesional.
-   Decisiones automáticas sobre cuidados.
-   Comunicación automática de conclusiones médicas a familiares.

La historia clínica entra en la fase 4 con requisitos explícitos de
integridad, autoría, inalterabilidad, acceso y conservación (sección
12.4) y con revisión legal antes de usar datos reales.

------------------------------------------------------------------------

# 8. Catálogo de módulos de la plataforma integral

Esta sección describe cada módulo con su contenido y reglas. Las fases
están en la sección 7 y el plan en la sección 14.

## 8.1 Mapa de módulos

| # | Módulo | Fase | Roles principales |
|---|--------|------|-------------------|
| M01 | Instituciones, sedes, usuarios, roles y permisos | 1 (MVP) | Administrador |
| M02 | Ficha personal del residente | 1 (MVP), ampliada en 4 | Administrador, enfermería, dirección |
| M03 | Contactos familiares y de emergencia | 1 (MVP) | Administrador, enfermería |
| M04 | Ficha de emergencia y hoja de derivación | 1 (MVP); medicación activa en 3; break-glass en 4 | Todo el personal |
| M05 | Novedades (con seguimiento simple) | 1 (MVP) | Todo el personal |
| M06 | Tareas | 2 | Todo el personal |
| M07 | Incidencias (incluye emergencias, caídas, lesiones) | 2 | Todo el personal, dirección |
| M08 | Traspaso de turno | 1 (MVP), suma tareas en 2 y dosis en 3 | Enfermería, cuidadores |
| M09 | Empleados | Perfil básico en 1 (MVP); legajo completo en 5 | Administrador, RRHH |
| M10 | Auditoría y trazabilidad | 1 (MVP): escrituras y ficha de emergencia; 4: lecturas clínicas | Dirección, administrador |
| M11 | Equipo tratante | 2 | Médico, enfermería |
| M12 | Atenciones y visitas profesionales | 2 | Profesionales, enfermería |
| M13 | Historia clínica | 4 | Médico, profesionales |
| M14 | Signos vitales y controles | 2 | Enfermería |
| M15 | Medicación: catálogo e indicaciones | 3 | Médico |
| M16 | Medicación: administración | 3 | Enfermería |
| M17 | Medicación e insumos: stock por residente | 3 | Enfermería, administrador |
| M18 | Documentación de empleados y vencimientos | 5 | RRHH |
| M19 | Turnos, guardias y asistencia | 5 | RRHH, dirección |
| M20 | Habitaciones, camas, ingresos y egresos | 7 (habitación como texto en 1) | Administrador |
| M21 | Portal familiar y visitas | 6 | Familiares, administrador |
| M22 | Documentos | 7 (adjuntos clínicos en 4) | Administrador |
| M23 | Cuotas, pagos y gastos | 1 (MVP): abono mensual, pagos y aviso de vencimiento (7.3-C4); 7: gastos, reportes y facturación | Administración, dirección |
| M24 | Reportes y panel de dirección | Incremental desde 1 | Dirección |
| M25 | Solicitudes de ingreso y landing pública | 1 (MVP), la landing al final (7.3-C3) | Administrador, dirección; familias (formulario público) |

## 8.2 M02 — Ficha personal del residente

Campos sugeridos (la institución decide cuáles usa; marcar como
obligatorios solo los imprescindibles):

-   **Identificación:** código interno, nombre y apellido, nombre
    preferido, DNI, fecha de nacimiento (edad calculada), sexo/género
    según política institucional, foto (con autorización).
-   **Estadía:** fecha de ingreso, habitación y cama, estado (activo,
    internado fuera, de licencia, egresado), motivo y fecha de egreso.
-   **Cobertura:** obra social/PAMI/prepaga, número de afiliado, plan,
    credencial adjunta.
-   **Datos clínicos de resumen** (los carga o valida un profesional):
    alergias, diagnósticos relevantes, grupo sanguíneo si se conoce,
    dieta/texturas, movilidad y riesgo de caídas según la valoración
    que use la institución, ayudas técnicas (silla, andador, audífonos,
    prótesis dental), indicaciones especiales y directivas anticipadas
    si existen y están documentadas.
-   **Personas vinculadas:** contactos (M03), referente legal o
    apoderado/curador si existe, médico de cabecera, equipo tratante
    (M11).
-   **Resumen de actividad:** última visita por especialidad, últimas
    novedades, incidencias abiertas, medicación activa, alertas de
    stock.

La cabecera de la ficha muestra siempre: nombre, foto, habitación,
**banner de alergias** y botón **Emergencia**.

## 8.3 M03 — Contactos familiares y de emergencia

-   Nombre, vínculo, teléfonos (principal y alternativo), WhatsApp,
    email, dirección opcional.
-   Orden de prioridad para emergencias.
-   Marcas: contacto de emergencia, referente legal, autorizado a
    recibir información, autorizado a retirar al residente, titular de
    pago.
-   Horarios de disponibilidad u observaciones ("no llamar de noche,
    llamar a X").
-   Fecha de última verificación del dato; alerta si pasaron más de N
    meses sin verificar.

## 8.4 M04 — Ficha de emergencia y hoja de derivación

-   Pantalla única, sin scroll innecesario, legible en teléfono.
-   Contenido: identificación, cobertura, alergias, diagnósticos
    relevantes, medicación activa (nombre, dosis indicada, horario),
    última administración de cada medicamento, médico de cabecera,
    indicaciones especiales, contactos con botón "Llamar".
-   Hoja de derivación en PDF con fecha y hora de emisión y usuario que
    la generó.
-   (Fase 2) Botón "Registrar emergencia" que crea una incidencia tipo
    emergencia (M07).
-   Toda apertura de la ficha y toda hoja generada quedan auditadas.

## 8.5 M09 — Empleados

-   Datos: nombre y apellido, DNI, CUIL, fecha de nacimiento, teléfono,
    email, dirección, contacto de emergencia del empleado.
-   Laboral: puesto/rol, área, fecha de ingreso, modalidad, turno
    habitual, estado (activo, licencia, baja).
-   Profesionales: profesión, especialidad, matrícula (nacional o
    provincial) y vencimiento si aplica.
-   Vínculo con usuario del sistema y su rol.
-   Historial de cambios de puesto y estado.

M18 (fase 5) agrega documentación con vencimientos: libreta sanitaria o
certificado de aptitud, matrícula, seguro/ART, antecedentes si la
institución los exige, capacitaciones, vacunas del personal según
política institucional. Alertas de vencimiento a 30/15/7 días
(configurable).

M19 (fase 5) agrega planificación de turnos y guardias, intercambios de
turno con aprobación y registro de asistencia. Permite responder "quién
estaba de guardia" en cualquier fecha y hora.

## 8.6 M11 — Equipo tratante

-   Profesionales internos (empleados con usuario) y externos (contacto
    sin usuario: nombre, especialidad, matrícula, teléfono, institución).
-   Rol en el equipo: médico de cabecera, especialista, kinesiólogo,
    etc.
-   Vigencia (desde/hasta).
-   Frecuencia de visita esperada opcional (por ejemplo, kinesiología 3
    veces por semana) para mostrar si una visita está atrasada.

## 8.7 M12 — Atenciones y visitas profesionales

-   Tipos configurables: médico de cabecera, enfermería, kinesiología,
    nutrición, psicología, terapia ocupacional, fonoaudiología,
    odontología, podología, especialista externo, urgencia/guardia
    externa, traslado/derivación, internación, otro.
-   Campos: tipo, profesional (interno o externo), fecha y hora, lugar
    (en la residencia/externo), motivo, evolución u observaciones,
    indicaciones, próximo control, adjuntos.
-   Vista "Últimas visitas" en la ficha: una fila por tipo con la fecha
    de la última atención y el profesional.
-   Si hay frecuencia esperada, marca de "visita atrasada".
-   Las urgencias y traslados se vinculan con la incidencia de
    emergencia correspondiente.

## 8.8 M13 — Historia clínica

-   Antecedentes (personales, quirúrgicos, familiares) y diagnósticos
    con fecha y profesional que los cargó.
-   Evoluciones por profesional, con fecha y hora, firmadas por el
    usuario autenticado.
-   **Inalterabilidad:** una evolución guardada no se edita ni borra; se
    corrige con una enmienda vinculada que conserva el original.
-   Adjuntos: estudios, epicrisis, recetas, consentimientos.
-   Línea de tiempo unificada del residente: evoluciones, atenciones,
    signos vitales, cambios de medicación e incidencias.
-   Exportación de la historia completa en PDF para el paciente,
    representante o derivación, con registro de quién la exportó.
-   La forma de firma (usuario y contraseña, firma electrónica o firma
    digital) y los requisitos de conservación se definen con asesoría
    legal (sección 12.4).

## 8.9 M14 — Signos vitales y controles

-   Presión arterial, frecuencia cardíaca, temperatura, saturación,
    glucemia, peso, diuresis/catarsis, dolor, u otros que configure la
    institución.
-   Registro rápido desde el teléfono, con validación de formato y
    rangos físicamente posibles (evitar errores de tipeo), no de rangos
    clínicos.
-   Gráficos de evolución en la ficha.
-   Rangos de referencia y alertas visuales **solo si los define el
    médico de la institución para ese residente**; el sistema no decide
    qué es anormal.
-   Controles programados (por ejemplo glucemia antes del almuerzo)
    como tareas recurrentes.

## 8.10 M15 — Medicación: catálogo e indicaciones

-   **Catálogo** de la institución: nombre comercial, droga/principio
    activo, concentración, forma farmacéutica, presentación, unidad de
    stock (comprimido, ml, ampolla, parche), marca de **medicamento
    controlado** (psicotrópico/estupefaciente) si corresponde.
-   **Indicación** por residente: medicamento, dosis, unidad, vía,
    frecuencia y horarios, fecha de inicio y fin, "si necesita" (SOS)
    con criterio escrito por el profesional, indicaciones especiales
    (con comida, triturar no, etc.), profesional que indica, origen
    (receta interna, indicación externa transcrita).
-   Las indicaciones transcritas de un externo quedan **pendientes de
    validación** por el médico de la institución si la institución lo
    exige.
-   Modificar una indicación = suspender la anterior y crear una nueva;
    se conserva el historial completo.
-   El sistema genera el plan de administración (horarios) a partir de
    las indicaciones activas. **No calcula ni sugiere dosis.**

## 8.11 M16 — Medicación: administración

-   Lista "Medicación del turno" por horario y residente.
-   Estados por dosis: administrada, omitida, rechazada por el
    residente, diferida, no disponible (sin stock). Todo estado distinto
    de administrada requiere motivo.
-   Registro de quién, cuándo (hora real) y observaciones.
-   Las dosis SOS se registran con motivo y, si se define, con
    reevaluación posterior.
-   Corrección de un registro erróneo mediante anulación con motivo,
    nunca borrado.
-   Doble verificación opcional para medicamentos que la institución
    marque (por ejemplo, controlados o insulina).
-   Reporte por residente y período (hoja de administración) imprimible.

## 8.12 M17 — Stock de medicación e insumos por residente

-   El stock se modela como **libro de movimientos**, no como un número
    editable: ingreso, consumo (automático al administrar), ajuste por
    conteo, descarte (vencido, roto), devolución a la familia,
    transferencia. El saldo es la suma de movimientos.
-   Cada ingreso registra: cantidad, origen (familia, obra social/PAMI,
    farmacia, residencia), lote y vencimiento si se conocen, fecha y
    quién recibió.
-   **Días restantes estimados** = saldo / consumo diario según
    indicaciones activas (aritmética, no decisión clínica).
-   Alertas: stock bajo (umbral en días, configurable), vencimiento
    próximo, saldo negativo (indica error de registro), dosis
    registradas como "no disponible".
-   Conteo físico periódico con diferencia registrada y justificada.
-   Pedido de reposición: genera una tarea y, en fase 6, un aviso al
    familiar responsable.
-   Stock de la residencia (botiquín común) separado del stock de cada
    residente.
-   El mismo modelo sirve para **insumos** por residente (pañales,
    apósitos, suplementos), si la institución lo valida.
-   Medicamentos controlados: conteo y registro reforzados según lo que
    exija la normativa aplicable (sección 12.5).

## 8.13 M20 — Habitaciones, camas, ingresos y egresos

-   Habitaciones con capacidad y camas.
-   Asignación de residente a cama con historial.
-   Flujo de ingreso y egreso (sección 6.12).
-   Panel de ocupación (fase 7).

## 8.14 M10 — Trazabilidad total

"Que quede todo trackeado" se implementa así:

-   **Escrituras:** toda creación, modificación, anulación, enmienda y
    cambio de estado genera un evento de auditoría con usuario, fecha,
    hora, entidad y valores anteriores y nuevos (sin datos sensibles
    completos en logs técnicos; el historial de negocio sí guarda las
    versiones).
-   **Lecturas sensibles:** apertura de historia clínica, ficha de
    emergencia, exportaciones e impresiones quedan auditadas.
-   **Sin borrados físicos** de registros clínicos, de medicación ni de
    stock; se usan estados (anulado, suspendido, inactivo).
-   **Firma por usuario:** nadie usa cuentas compartidas; cada empleado
    tiene su usuario.
-   **Historial visible** en cada registro ("ver cambios").
-   **Reportes de actividad:** por residente, por empleado y por turno.
-   **Acceso de emergencia** registrado y revisable (sección 12.8).
-   La auditoría es de solo agregado: ningún usuario de la institución
    puede modificarla ni borrarla.

## 8.15 Mejoras propuestas además de lo pedido

-   **Banner de alergias** y alertas visibles en toda la ficha.
-   **Cobertura de salud** con número de afiliado en la ficha de
    emergencia (clave para guardias y PAMI).
-   **Hoja de derivación** imprimible.
-   **Verificación periódica de contactos** para evitar teléfonos
    desactualizados.
-   **Frecuencia esperada de visitas** para detectar atrasos (por
    ejemplo, kinesiología).
-   **Stock como libro de movimientos** con días restantes estimados.
-   **Insumos por residente** con el mismo modelo que la medicación.
-   **Caídas, lesiones por presión y fugas** como tipos de incidencia con
    campos propios definidos por la institución.
-   **Dieta y texturas** visibles para cocina y cuidadores.
-   **Tareas recurrentes** (cambios posturales, controles, curaciones)
    generadas desde indicaciones profesionales.
-   **Modo de consulta de emergencia degradado:** si cae internet, la
    hoja de derivación impresa y actualizada periódicamente (por ejemplo
    semanal) funciona como respaldo en papel, sin introducir
    sincronización offline compleja. Ese papel contiene datos de salud:
    se guarda en un lugar de acceso restringido y se reemplaza (y
    destruye) la versión anterior.

------------------------------------------------------------------------

# 9. Requisitos funcionales y de calidad

## 9.1 Requisitos funcionales

El sistema debe permitir: - Gestionar instituciones y usuarios. -
Aplicar permisos en cada operación, no solo ocultar botones. - Consultar
residentes autorizados. - Crear y consultar novedades. - Crear y
actualizar tareas e incidencias. - Mantener estados e historial. -
Buscar y filtrar información. - Registrar auditoría. - Manejar errores
de manera comprensible. - Exportar información cuando la política y los
permisos lo permitan.

Además, para la plataforma integral: - Gestionar empleados y su vínculo
con usuarios. - Mostrar la ficha de emergencia y generar la hoja de
derivación. - Registrar atenciones profesionales y calcular la última
visita por tipo. - Registrar evoluciones inalterables con enmiendas. -
Registrar signos vitales. - Gestionar indicaciones de medicación,
generar el plan de administración y registrar cada dosis. - Mantener el
stock por residente como libro de movimientos y emitir alertas de
reposición y vencimiento. - Auditar lecturas sensibles y todas las
escrituras.

## 9.2 Requisitos de experiencia

-   Diseño responsive para computadora, tablet y teléfono.
-   Formularios cortos y claros.
-   Navegación consistente.
-   Tipografía legible y buen contraste.
-   Estados de carga, vacío, error y éxito.
-   Confirmaciones para operaciones importantes.
-   No depender exclusivamente del color para comunicar estados.
-   Accesibilidad por teclado cuando corresponda.
-   Lenguaje español claro y neutral.
-   Fecha, hora y formatos locales consistentes.

## 9.3 Requisitos no funcionales

-   Seguridad por defecto.
-   Separación de datos entre instituciones.
-   Disponibilidad y monitoreo adecuados al nivel de servicio acordado.
-   Copias de seguridad y pruebas de recuperación.
-   Registro de errores sin exponer información sensible.
-   Migraciones de base de datos versionadas.
-   Pruebas automatizadas de permisos.
-   Rendimiento razonable en dispositivos comunes.
-   Mantenimiento documentado.
-   Portabilidad y exportación de datos.
-   Procedimientos de incidentes y recuperación.

## 9.4 Criterios iniciales de aceptación

Antes del piloto, verificar que: - Un usuario no autorizado no puede
consultar residentes ni novedades. - Un usuario de una institución no
puede acceder a datos de otra. - Los permisos se validan en el servidor
y en la base de datos cuando corresponda. - Las acciones relevantes
quedan auditadas. - Las operaciones fallidas muestran errores útiles. -
Los datos persisten correctamente. - Los flujos principales funcionan en
móvil y escritorio. - Se pueden recuperar datos desde una copia de
seguridad de prueba. - No se utilizan datos reales en ambientes de
desarrollo sin autorización y controles apropiados.

------------------------------------------------------------------------

# 10. Arquitectura técnica recomendada

La arquitectura debe ser sencilla al principio, sin impedir el
crecimiento. No empezar con microservicios si un monolito modular cubre
las necesidades.

> **El stack definitivo, el volumen esperado y las reglas de producción
> están en las secciones 10.10 a 10.18.** Las secciones 10.1 a 10.9
> explican el razonamiento.

## 10.1 Frontend y aplicación

**Decidido (detalle en 10.10):** Next.js 16 con App Router, React 19,
TypeScript estricto, Tailwind CSS v4, shadcn/ui, next-themes, React Hook
Form + Zod.

Motivos: - El desarrollador ya tiene experiencia con React. - Next.js
facilita organizar páginas, layouts y componentes del servidor. -
TypeScript reduce ciertos errores de desarrollo. - Tailwind permite
mantener una interfaz consistente. - Una web responsive reduce la
necesidad de desarrollar una app nativa de entrada.

No mezclar patrones de arquitectura sin una razón clara. Elegir una
convención para rutas, componentes, acceso a datos, validación y manejo
de errores.

## 10.2 Backend

Dos enfoques razonables:

### Opción A: Next.js como aplicación full-stack

Usar Route Handlers o Server Actions con una capa de servicios de
dominio bien definida. Es adecuada para un MVP si se mantienen separadas
la lógica de negocio, la persistencia y la interfaz.

### Opción B: backend separado

Un servicio independiente, por ejemplo con NestJS, puede tener sentido
si aparecen integraciones complejas, varios clientes de API o
necesidades organizativas que lo justifiquen.

**Recomendación:** comenzar con un monolito modular y evitar separar
servicios prematuramente.

## 10.3 Base de datos

PostgreSQL es una buena opción por su madurez, integridad relacional y
capacidades de seguridad.

Alternativas de operación: - PostgreSQL administrado. - Supabase,
después de verificar sus condiciones, configuración, región, controles y
adecuación al tratamiento de datos previsto. - PostgreSQL autogestionado
en un servidor, solo si se puede mantener y proteger correctamente.

No decidir basándose únicamente en facilidad de configuración. Evaluar
ubicación de datos, acuerdos contractuales, copias de seguridad, control
de acceso, auditoría, costos, recuperación y obligaciones legales.

## 10.4 Autenticación y autorización

La autenticación confirma quién es el usuario. La autorización define
qué puede hacer.

Implementar: - Roles claramente definidos. - Permisos por institución. -
Asociación explícita de usuarios con una o más instituciones, si se
permite. - Validación en servidor para cada lectura y escritura. -
Revocación de acceso. - Protección contra enumeración de IDs. - Límites
de intentos y mecanismos de protección apropiados. - Sesiones seguras. -
Autenticación multifactor para cuentas administrativas cuando sea
viable.

No confiar solo en la interfaz ni en un rol enviado por el navegador. La
autorización debe verificarse en el backend y, cuando corresponda,
reforzarse en la base de datos.

## 10.5 Almacenamiento de archivos

Para documentos futuros: - Almacenamiento privado. - Acceso temporal
firmado o mecanismo equivalente. - Validación de tipo y tamaño. -
Escaneo cuando corresponda. - Autorización antes de entregar el
archivo. - Registro de acceso a documentos sensibles. - Política de
retención.

No guardar documentos sensibles en directorios públicos ni exponer
claves de almacenamiento en el frontend.

## 10.6 Notificaciones

En fases posteriores se podrían agregar: - Notificaciones dentro de la
aplicación. - Correo transaccional. - Integraciones de mensajería con
autorización y evaluación de privacidad.

Las notificaciones no deben exponer datos de salud en texto visible.
Para datos sensibles, enviar una notificación genérica y exigir
autenticación para consultar el detalle.

Desde la v2.4 el MVP incluye notificaciones dentro de la aplicación y
por email para el aviso de vencimiento del abono (7.3-C4) y para las
solicitudes de ingreso nuevas (7.3-C3). Las genera el worker a partir
de los eventos de dominio (E8), con una clave que evita duplicados. Si
se usan también para otros avisos del diseño (seguimiento asignado,
turno entregado, ficha de emergencia abierta) se decide en el Apéndice
F. Las notificaciones push del teléfono no entran en el MVP.

## 10.7 IA

La IA es opcional y no es necesaria para validar el primer flujo de
trabajo.

Usos posteriores posibles: - Resumir novedades administrativas
autorizadas. - Preparar borradores de informes. - Clasificar
documentación no clínica. - Identificar campos incompletos. - Ayudar a
consultar métricas operativas desde datos agregados.

Controles obligatorios: - No enviar información personal o de salud a un
proveedor externo sin análisis legal, contractual, técnico y de
privacidad. - Minimizar y, cuando sea posible, desidentificar los datos
enviados. - No utilizar la IA como autoridad clínica. - Mostrar que un
contenido fue generado o asistido por IA. - Permitir revisión humana
antes de publicar o comunicar. - Registrar acciones relevantes. - No
permitir que el modelo ejecute SQL arbitrario ni operaciones sin
autorización. - Limitar el contexto y los datos disponibles para cada
usuario. - Definir políticas de retención y uso de datos del
proveedor. - Probar errores, alucinaciones y filtraciones entre
instituciones.

## 10.8 Infraestructura y despliegue

El desarrollador tiene experiencia con un VPS Ubuntu y Nginx. Puede
servir para un entorno inicial si se configura correctamente, pero no
debe asumirse que el VPS actual es automáticamente apto para producción.

Controles mínimos: - HTTPS. - Firewall y puertos mínimos. - Acceso SSH
por claves y administración segura. - Secretos fuera del repositorio. -
Usuario de sistema con privilegios mínimos. - Actualizaciones del
sistema y dependencias. - Base de datos no expuesta públicamente. -
Copias de seguridad fuera del mismo servidor. - Monitoreo de
disponibilidad y disco. - Logs con redacción de datos sensibles. -
Proceso de despliegue reproducible. - Entornos separados de desarrollo,
staging y producción. - Plan de recuperación.

Docker puede simplificar el despliegue y la consistencia de entornos,
pero no reemplaza los controles de seguridad.

## 10.9 Decisiones del MVP para que la app escale

El MVP es chico en funcionalidades pero **no en cimientos**. Estas
decisiones se toman en la fase 1 porque cambiarlas después obliga a
migrar datos o reescribir módulos. Ninguna agrega pantallas: son
estructura.

| # | Decisión en el MVP | Qué permite después |
|---|--------------------|---------------------|
| E1 | **Multi-institución desde el día 1:** `organization_id` en toda tabla operativa, filtrado obligatorio en la capa de servicios y Row Level Security en PostgreSQL como segunda barrera | Vender a muchas residencias en la misma plataforma sin riesgo de cruce de datos |
| E2 | **Cliente y sede separados:** `organizations` (cliente que contrata) y `sites` (residencia física). Toda tabla operativa lleva `site_id` aunque el cliente tenga una sola sede | Multisede (fase 7) sin migración de datos |
| E3 | **Módulos activables por institución** (`organization_modules`): cada fase es un módulo que se enciende por cliente | Pilotear una fase con un cliente, vender planes, activar módulos sin desplegar otra versión |
| E4 | **Permisos como datos:** roles y permisos en tablas (`roles`, `permissions`, `role_permissions`), con una única función de servidor `can(usuario, permiso, recurso)`. Permisos con nombre de módulo (`residents.read`, `emergency.view`, `notes.create`) | Agregar médico, RRHH, familiar o profesional externo sin reescribir controles; cada institución ajusta su matriz (Apéndice D) |
| E5 | **Monolito modular con límites claros:** cada módulo en `features/<módulo>` con su servicio, repositorio y validación. Un módulo usa a otro solo por su servicio, nunca leyendo sus tablas directamente | Sumar módulos sin acoplar todo; extraer un servicio si algún día hace falta |
| E6 | **Sin borrados, con estados y versiones:** las novedades se corrigen con versiones; los residentes y usuarios se desactivan. El patrón se implementa una vez y se reutiliza | Medicación, stock e historia clínica (fases 3 y 4) heredan el mismo patrón inalterable |
| E7 | **Auditoría genérica:** una tabla `audit_events` (entidad, id, acción, antes, después, actor, momento) usada por todos los módulos mediante una función común | Trazabilidad total de cualquier módulo futuro sin trabajo extra |
| E8 | **Eventos de dominio internos:** cada acción relevante emite un evento (`note.created`, `emergency.viewed`) guardado en una tabla `domain_events` (patrón outbox) | Alertas, notificaciones, portal familiar, integraciones y reportes se suscriben a eventos sin tocar los módulos originales |
| E9 | **Catálogos configurables como tablas, no como enums en código:** categorías de novedades, tipos de atención, tipos de incidencia, turnos | Cada residencia se adapta sin cambios de código |
| E10 | **IDs UUID** no secuenciales | Evita enumeración, facilita multisede, importaciones e integraciones |
| E11 | **Fechas en UTC** y zona horaria por sede | Turnos, horarios de medicación y reportes correctos en cualquier provincia |
| E12 | **Archivos detrás de una interfaz de almacenamiento** (disco local o servicio compatible con S3), con acceso firmado y temporal. En el MVP solo fotos y PDFs generados | Adjuntos clínicos, documentos de empleados y gestión documental sin rediseñar |
| E13 | **Capa de servicios tipada** como única puerta a la lógica de negocio; las pantallas, las Server Actions y la API usan los mismos servicios | Una futura app nativa, el portal familiar o integraciones externas consumen la misma lógica y los mismos permisos |
| E14 | **Exportación por institución** (al menos JSON/CSV de residentes, contactos y novedades) | Portabilidad, salida de clientes, migraciones |
| E15 | **Trabajos programados preparados:** una abstracción para tareas en segundo plano; en el MVP la usan backups y limpieza y, desde la v2.4, las cuotas y el aviso de vencimiento del abono, las notificaciones y el borrado de solicitudes de ingreso vencidas. Preferir una cola sobre PostgreSQL antes que infraestructura extra (verificar mantenimiento de la librería elegida) | Plan de administración de medicación, alertas de stock y vencimientos (fases 3 y 5) |
| E16 | **Observabilidad desde el inicio:** logs estructurados sin datos sensibles, seguimiento de errores y monitoreo de disponibilidad | Operar con muchos clientes y detectar fallas antes que ellos |
| E17 | **Entornos separados y migraciones versionadas** (desarrollo, staging, producción) | Desplegar fases nuevas sin riesgo para los clientes activos |

### Lo que no se hace en el MVP "por si escala"

Agregan complejidad sin beneficio hasta tener muchos clientes:

-   Microservicios, Kubernetes o colas de mensajería externas.
-   Sincronización offline.
-   Event sourcing completo (alcanza con auditoría + eventos de dominio).
-   GraphQL o una API pública.
-   Caché distribuido.
-   App nativa.

El monolito modular con PostgreSQL alcanza holgadamente para decenas de
residencias. Se revisa cuando las métricas reales lo pidan.

## 10.10 Stack de producción (decidido)

Las secciones 10.1 a 10.9 explican el razonamiento; esta sección fija
las herramientas. Al iniciar el repositorio se fija la **versión exacta**
de cada una (`npm show <paquete> version`) y no se cambian versiones
mayores en medio de un piloto.

| Capa | Elección | Por qué |
|------|----------|---------|
| Lenguaje | TypeScript en modo estricto (`strict`, `noUncheckedIndexedAccess`) | Errores de tipos en compilación, no en la residencia |
| Runtime | Node.js 24 LTS, pnpm | Soporte largo; instalaciones reproducibles |
| Framework | Next.js 16 (App Router, React 19, Turbopack) con `output: "standalone"` | Un solo proyecto para pantallas y servidor; imagen Docker liviana para self-hosting |
| UI | Tailwind CSS v4 + shadcn/ui (Radix) + lucide-react + next-themes | Componentes accesibles; tokens del canvas (claro, oscuro y sistema) |
| Formularios | React Hook Form + Zod | El mismo esquema Zod valida en el teléfono y en el servidor |
| Datos en pantalla | Server Components por defecto; TanStack Query solo donde hay actualización frecuente (medicación del turno, novedades); TanStack Table con paginación del servidor | Menos JavaScript en el teléfono; listas grandes sin traer todo |
| Base de datos | **PostgreSQL 18** con extensiones `pg_trgm`, `unaccent`, `citext`, `pg_stat_statements`, `pg_partman` | `uuidv7()` nativo, I/O asíncrono, RLS, particionado; madura y gratuita |
| ORM y migraciones | Drizzle ORM + drizzle-kit, migraciones SQL revisadas en cada PR | SQL explícito y tipado, compatible con RLS y con SQL escrito a mano |
| Conexiones | node-postgres (`pg`) + PgBouncer en modo *transaction* | Muchas instancias de app sin agotar las conexiones de Postgres |
| Autenticación | Better Auth, self-hosted, tablas en la misma base, adaptador Drizzle; sesiones en base de datos con cookie `HttpOnly`; 2FA (TOTP) obligatorio para Administrador y Dirección | Datos en infraestructura propia; Auth.js está en mantenimiento desde septiembre de 2025 |
| Autorización | Función propia `can()` + Row Level Security (sección 10.13) | Doble barrera: servidor y base de datos |
| Trabajos en segundo plano | pg-boss (cola sobre Postgres) en un proceso *worker* separado | Sin infraestructura extra; reintentos y programación |
| Archivos | Almacenamiento compatible con S3 (MinIO en el piloto; S3 o R2 gestionado después), URLs firmadas de corta duración. **Nota v2.4:** MinIO ya no se mantiene; el reemplazo se decide en el Apéndice F | Fotos de documentos privadas; la app no guarda archivos en disco |
| PDF | Generación en el servidor (`@react-pdf/renderer`) | Hoja de derivación idéntica en cualquier teléfono |
| Email | Proveedor transaccional (Resend, SES o Postmark) detrás de una interfaz | Invitaciones y recuperación de contraseña; cambiar de proveedor sin tocar la app |
| Logs | pino en JSON con redacción de campos sensibles | Diagnóstico sin exponer datos de pacientes |
| Errores | Sentry (o GlitchTip self-hosted) con borrado de datos personales | Enterarse de un error antes que la residencia |
| Métricas y disponibilidad | OpenTelemetry → Prometheus/Grafana (o servicio gestionado); Uptime Kuma para chequeos externos | Medir los objetivos de 10.15 |
| Pruebas | Vitest (unidad), Testcontainers con Postgres real (integración y RLS), Playwright (e2e en viewport móvil), k6 (carga) | Probar contra la misma base que producción |
| Calidad | ESLint, Prettier, `tsc --noEmit`, lint-staged, Renovate, `pnpm audit`, Trivy sobre la imagen | Cada PR pasa los mismos controles |
| Contenedores | Docker multi-stage, usuario no root, imagen mínima | Mismo artefacto en staging y producción |
| CI/CD | GitHub Actions: lint → tipos → tests → build → migración en staging → deploy a producción con aprobación manual | Despliegues repetibles y reversibles |

## 10.11 Volumen de datos esperado

Estimación con supuestos explícitos (filas por residente por día:
novedades 4, auditoría 25, signos vitales 4, dosis 8, movimientos de
stock 8; ~700 bytes por fila con índices). Se revisa con datos reales
del piloto.

| Escenario | Residencias | Residentes | Usuarios | Filas nuevas por año | Crecimiento de la base |
|-----------|-------------|------------|----------|----------------------|------------------------|
| Piloto | 1 | 40 | 30 | ~0,7 millones | ~0,5 GB/año |
| Crecimiento | 100 | 4.500 | 3.000 | ~80 millones | ~56 GB/año |
| Escala (objetivo de diseño) | 1.000 | 50.000 | 35.000 | ~900 millones | ~630 GB/año |

En el escenario de escala, por año: auditoría ~456 millones de filas,
dosis ~146 millones, movimientos de stock ~146 millones, novedades ~73
millones, signos vitales ~73 millones.

Conclusiones:

-   Hasta "Crecimiento", una sola instancia de PostgreSQL bien indexada
    alcanza con margen.
-   La **auditoría es la tabla más grande** desde el MVP: se particiona
    desde el día uno.
-   Para "Escala" hacen falta particionado ampliado, réplica de lectura
    y archivado de datos viejos (10.12 y 10.17). Se diseña ahora, se
    activa cuando lo indiquen las métricas.

## 10.12 Diseño de la base para volumen

-   **Claves primarias UUIDv7** (`DEFAULT uuidv7()`): ordenadas en el
    tiempo, mantienen los índices compactos y no permiten adivinar IDs.
-   `organization_id` y `site_id` en toda tabla operativa; **todo índice
    compuesto empieza por `organization_id`**, por ejemplo
    `(organization_id, resident_id, created_at DESC)`.
-   Fechas siempre `timestamptz` en UTC; la zona horaria se aplica al
    mostrar.
-   **Búsqueda de pacientes y empleados** con índice GIN `pg_trgm`
    sobre `unaccent(lower(nombre_completo))`: encuentra "Benitez",
    "benítez" o "Benít" en milisegundos con decenas de miles de
    registros.
-   Unicidad con índices parciales: DNI de residente único por
    organización entre activos; email de usuario único global
    (`citext`); un solo responsable de internación activo por residente.
-   **Particionado nativo por mes** (con `pg_partman` creando
    particiones por adelantado):
    -   Desde el MVP: `audit_events`, `domain_events`.
    -   Desde la fase 3: `medication_administrations`, `stock_movements`.
    -   `resident_notes` y `vital_signs`: cuando pasen ~50 millones de
        filas.
-   **Archivado:** las particiones viejas de auditoría se exportan
    comprimidas a almacenamiento frío y se desconectan de la base según
    la política de conservación legal. Nunca se borran sin aprobación
    documentada.
-   **Saldos precalculados:** el saldo de stock vive en una tabla de
    saldos actualizada en la misma transacción que el movimiento; los
    contadores del panel de dirección salen de tablas de resumen que
    actualiza el worker.
-   **Concurrencia:** columna `version` (bloqueo optimista) en entidades
    editables; `SELECT … FOR UPDATE` al mover stock.
-   **Idempotencia:** las escrituras desde el teléfono (novedad, dosis,
    ingreso) llevan un `client_request_id` único; si la conexión falla y
    el teléfono reintenta, no se duplica el registro.
-   Claves foráneas siempre indexadas; `ON DELETE RESTRICT`; nada de
    borrado en cascada sobre datos de pacientes.
-   Límites de tamaño en textos (por ejemplo, novedad hasta 4.000
    caracteres) y en archivos (por ejemplo, 10 MB por foto).
-   **Paginación por cursor** `(created_at, id)`, nunca `OFFSET` en
    listas grandes; máximo 100 ítems por página; nunca `SELECT *`.
-   Tiempos máximos: `statement_timeout` 5 s en la app y 60 s en el
    worker; `idle_in_transaction_session_timeout`; `lock_timeout` en
    migraciones.
-   `pg_stat_statements` activo; revisión periódica de las 10 consultas
    más costosas; `EXPLAIN ANALYZE` obligatorio en el PR de cualquier
    consulta nueva sobre tablas grandes.

## 10.13 Row Level Security en la práctica

-   Cada request abre una transacción y fija el contexto con
    `SELECT set_config('app.org_id', $1, true)` y `app.user_id`.
-   Cada tabla operativa tiene una política
    `USING (organization_id = current_setting('app.org_id')::uuid)` y la
    misma condición en `WITH CHECK` para escrituras.
-   La aplicación se conecta con un rol **sin `BYPASSRLS` y que no es
    dueño de las tablas**; las migraciones usan otro rol.
-   Funciona con PgBouncer en modo transacción porque el contexto vive
    solo dentro de la transacción.
-   Un test de integración por tabla verifica: sin contexto no se ve
    nada, y la organización A no lee ni escribe datos de la B.

## 10.14 Arquitectura en producción

``` text
Teléfonos y computadoras
        │ HTTPS
        ▼
Proxy (Caddy o Nginx): TLS, compresión, límite de pedidos por IP
        │
        ▼
Next.js (2 o más instancias sin estado)  ──►  Almacenamiento S3 (fotos, PDF)
        │                                      Email transaccional
        ▼                                      Sentry / métricas
PgBouncer
        │
        ▼
PostgreSQL 18 primario ──(WAL)──► Backups con recuperación a un punto en el tiempo
        │                         Réplica de lectura (etapa C)
        ▲
Worker (pg-boss): alertas, resúmenes, limpieza, generación de PDF pesados
```

-   **La app no guarda estado:** sesiones en la base, archivos en S3,
    nada en el disco local. Se pueden sumar instancias sin cambios.
-   **Caché:** solo para datos no sensibles (catálogos, configuración).
    Nunca se cachean datos de pacientes entre usuarios.
-   **Límite de pedidos:** en el proxy por IP y en la app por usuario
    (login: 5 intentos cada 15 minutos; escrituras: tope por minuto).
-   **Chequeos de salud:** `/api/health` (la app responde) y
    `/api/ready` (base y almacenamiento accesibles) para el balanceador y
    el monitoreo.

## 10.15 Objetivos de rendimiento

| Qué | Objetivo |
|-----|----------|
| Lecturas en el servidor | p95 < 300 ms |
| Escrituras en el servidor | p95 < 500 ms |
| Ficha de emergencia | Visible en < 1,5 s en 4G con Android de gama media |
| JavaScript inicial por pantalla | < 200 KB comprimido |
| Lighthouse móvil | Rendimiento ≥ 90, accesibilidad ≥ 95 |
| Consultas a la base | p95 < 100 ms con el volumen del escenario "Escala" |
| Listas de más de 200 ítems | Virtualizadas |

## 10.16 Robustez y confiabilidad

-   **Disponibilidad:** objetivo 99,5% mensual en el piloto y 99,9% como
    SaaS.
-   **Backups:** recuperación a un punto en el tiempo con WAL continuo
    (pgBackRest o WAL-G, o el del proveedor gestionado), copia completa
    diaria y copia fuera del proveedor o la región. Pérdida máxima de
    datos (RPO) ≤ 5 minutos; tiempo de recuperación (RTO) ≤ 1 hora.
    **Restauración de prueba mensual** en staging, documentada.
-   **Despliegues sin caída:** migraciones en dos pasos (expandir y
    después contraer): agregar columna → desplegar código → migrar
    datos → quitar lo viejo. Nunca renombrar o borrar en un solo paso.
    Volver a la imagen anterior con un comando.
-   **Activación gradual** de funciones por organización con
    `organization_modules`.
-   **Errores en pantalla:** límites de error por ruta, mensajes claros,
    botón de reintento y formularios que conservan lo escrito.
-   **Worker:** reintentos con espera creciente, cola de trabajos fallidos
    y apagado ordenado.
-   **Seguridad HTTP:** CSP estricta, HSTS, `X-Frame-Options: DENY`,
    cookies `Secure`, `HttpOnly` y `SameSite=Lax`; las Server Actions
    validan el origen.
-   **Dependencias:** Renovate semanal, `pnpm audit` y Trivy en CI.
-   **Secretos** en el gestor del entorno, nunca en Git; rotación
    documentada.
-   **Manuales de incidentes:** caída de la base, restauración, rotación
    de secretos, incidente con datos personales.

## 10.17 Infraestructura por etapas

| Etapa | Para | Infraestructura | Condición |
|-------|------|-----------------|-----------|
| A — Piloto | 1 a 3 residencias (Mis Nonos) | Un VPS (≥ 4 vCPU, 8 GB) con Docker Compose: Caddy, Next.js, worker, PostgreSQL 18, PgBouncer, MinIO. Staging en otro servidor o proyecto. Backups WAL a un almacenamiento externo. **Nota v2.4:** MinIO ya no se mantiene y faltan los backups de las fotos; ver el perfil de VPS del Apéndice F | Hardening de la sección 10.8 y una restauración probada antes de cargar datos reales |
| B — SaaS inicial | Hasta ~100 residencias | PostgreSQL gestionado con recuperación a un punto en el tiempo, 2 instancias de app detrás de un balanceador, worker aparte, S3 gestionado, Sentry | Región elegida con asesoría por la Ley 25.326 (transferencia internacional de datos) |
| C — Escala | Cientos a miles | Réplica de lectura para reportes, particionado ampliado, archivado, CDN, escalado automático de la app, workers por cola | Métricas que lo justifiquen |

**Cuándo pasar de etapa:** CPU de la base > 60% sostenido, p95 por
encima de los objetivos de 10.15, conexiones > 70% del pool, base > 100
GB o un contrato que exija un SLA mayor.

El VPS propio sirve para staging y para el piloto si se aplica el
hardening. Con datos de salud de varias residencias conviene una base
gestionada.

## 10.18 Datos sintéticos y pruebas de carga

-   **Seed sintético** con datos argentinos ficticios que arma el
    escenario "Escala": 1.000 organizaciones, 50.000 residentes, 35.000
    usuarios y un año de novedades y auditoría. Nunca datos reales.
-   **Escenarios k6:**
    -   Cambio de turno: todas las residencias entregan turno a la vez
        (pico 3 veces por día).
    -   Ronda de medicación (desde la fase 3).
    -   Búsqueda de paciente.
    -   Apertura de la ficha de emergencia.
    -   Ingreso con carga de fotos.
-   **Criterio de aprobación:** cumplir los objetivos de 10.15 con el
    doble del pico esperado.
-   Se corre antes de cerrar cada fase y antes de sumar un cliente
    grande.

------------------------------------------------------------------------

# 11. Modelo de datos inicial

El esquema final debe derivarse de los flujos validados. Esta es una
propuesta conceptual, no una migración definitiva.

## 11.1 Entidades

### `organizations`

Representa al **cliente** que contrata (una residencia o un grupo de
residencias). - `id` (UUID) - `name` - `status` - `plan` - `created_at`
- `updated_at`

### `sites`

Representa cada **residencia física (sede)**. En el MVP cada
organización tiene una sola sede, pero todas las tablas operativas
llevan `site_id` desde el inicio (sección 10.9, E2). - `id` -
`organization_id` - `name` - `address` - `timezone` - `status` -
`created_at` - `updated_at`

### `organization_modules`

Módulos activados por cliente (sección 10.9, E3). - `organization_id` -
`module_key` (`core`, `care`, `medication`, `clinical_record`, `staff`,
`family`, `admin`, `fees`) - `enabled` - `enabled_at` - `enabled_by`

`fees` (abono mensual y pagos, 7.3-C4) se agregó en la v2.4 y está
encendido para Mis Nonos desde el MVP.

### `roles`, `permissions`, `role_permissions`

Permisos como datos (sección 10.9, E4). - `roles`: `id`,
`organization_id` nullable (null = rol de sistema), `key`, `name`. -
`permissions`: `key` (por ejemplo `residents.read`, `emergency.view`,
`notes.create`, `medication.administer`), `module_key`. -
`role_permissions`: `role_id`, `permission_key`.

En el MVP se cargan los roles de sistema Administrador, Dirección,
Enfermería y Cuidador/a. Las fases siguientes agregan permisos y roles
sin cambiar el mecanismo.

### `domain_events`

Eventos de dominio (sección 10.9, E8). - `id` - `organization_id` -
`site_id` - `type` - `entity_type` - `entity_id` - `payload` (sin datos
sensibles completos) - `occurred_at` - `processed_at` nullable

### `users`

Identidad del usuario o referencia al proveedor de autenticación. -
`id` - `email` - `display_name` - `status` - `created_at` - `updated_at`

No guardar contraseñas en texto plano ni implementar criptografía de
autenticación propia sin necesidad.

### `organization_memberships`

Vincula usuarios con instituciones. - `id` - `organization_id` -
`site_id` nullable (null = todas las sedes) - `user_id` - `role_id` -
`status` - `phone` - `profession` nullable - `license_number` nullable
- `created_at` - `updated_at`

En el MVP la membresía funciona como **perfil básico de empleado**. En
la fase 5 se crea `employees` con el legajo completo y se vincula a la
membresía.

Permite definir pertenencia y rol dentro de cada institución. Si un
usuario puede pertenecer a varias instituciones, los permisos deben
evaluarse en el contexto correcto.

### `residents`

Ficha del residente. - `id` - `organization_id` - `site_id` -
`internal_code` -
`first_name` - `last_name` - `preferred_name` - `national_id` (DNI) -
`birth_date` - `photo_file_id` nullable - `admission_date` -
`discharge_date` nullable - `discharge_reason` nullable - `status` -
`room_label` (texto en el MVP) - `bed_id` nullable (fase 7) -
`primary_physician_name` y `primary_physician_phone` (MVP; en la fase 2
se complementa con el equipo tratante) - `diet_notes` -
`mobility_notes` - `special_instructions` - `created_at` - `updated_at`

Los datos clínicos de resumen (alergias, diagnósticos) van en tablas
propias para tener autoría e historial. Cada campo se incluye solo si la
institución lo usa; minimización y revisión legal aplican.

### `resident_notes`

Novedades u observaciones. - `id` - `organization_id` - `resident_id`
nullable cuando la novedad sea general - `category` - `content` -
`created_by` - `created_at` - `updated_at` - `status` - `assigned_to`
nullable

Definir si las notas pueden editarse, cómo se corrigen y qué queda en el
historial. No permitir que la edición borre silenciosamente el contenido
previo cuando sea necesario preservar trazabilidad.

### `tasks` (fase 2)

Tareas operativas. - `id` - `organization_id` - `resident_id` nullable -
`title` - `description` - `status` - `priority` - `assigned_to` -
`due_at` nullable - `created_by` - `created_at` - `updated_at` -
`completed_at` nullable

Las categorías de prioridad y los estados deben ser definidos por la
institución. No utilizar el sistema para automatizar decisiones
clínicas.

### `incidents` (fase 2)

Incidencias que requieren seguimiento. - `id` - `organization_id` -
`resident_id` nullable según el tipo - `category` - `description` -
`status` - `reported_by` - `assigned_to` nullable - `created_at` -
`updated_at` - `closed_at` nullable

Si la residencia necesita registrar incidentes clínicos o de seguridad,
el diseño de campos, acceso, retención y escalamiento debe ser revisado
por profesionales y responsables legales.

### `audit_events`

Eventos de auditoría. - `id` - `organization_id` - `actor_user_id` -
`action` - `entity_type` - `entity_id` - `timestamp` - `metadata`
limitada y sin secretos

No incluir el contenido completo de información sensible en los logs por
defecto. Proteger el registro contra modificaciones no autorizadas y
definir retención.

## 11.2 Entidades de la plataforma integral

Todas llevan `organization_id`, `site_id`, `created_at`, `created_by`
y, si son editables, `updated_at` y `updated_by`. Los nombres son
orientativos. Entre paréntesis, la fase en que se crea cada tabla.

### Residentes y emergencia (fase 1, MVP)

-   Campos de ingreso en `residents` (modelo Mis Nonos): `birth_place`,
    `previous_address`, `referral_institution`, `admission_modality`
    (`pami` | `private`), `national_id_in_custody` (boolean).
-   `resident_contacts`: `resident_id`, `name`, `relationship`,
    `national_id` nullable, `address` nullable, `is_admission_responsible`
    (máximo uno activo por residente, restricción en base de datos),
    `phone_primary`, `phone_mobile`, `phone_work`, `whatsapp`, `email`,
    `emergency_priority` nullable, `is_legal_representative`,
    `can_receive_info`, `can_pick_up`, `is_payer`, `availability_notes`,
    `last_verified_at`.
-   `health_coverages`: `resident_id`, `provider_name` (obra
    social/PAMI/prepaga), `member_number`, `plan`, `card_file_id`,
    `valid_from`, `valid_to`.
-   `resident_allergies`: `resident_id`, `substance`, `reaction`,
    `severity` (texto definido por la institución), `recorded_by`,
    `status` (activa/descartada). Tabla desde el MVP (aunque la
    pantalla sea una lista simple) para no migrar después.
-   `emergency_sheet_exports`: `resident_id`, `generated_by`,
    `generated_at`, `reason`.
-   `document_types` (catálogo por organización): `key`, `name`,
    `required_for` (`all` | `pami` | `private`), `required` (boolean),
    `order`. Mis Nonos: ficha de ingreso, obligaciones de las partes,
    consentimiento PAMI, acta compromiso PAMI, DNI en custodia,
    credencial, estudios previos, documentación médica o psiquiátrica.
-   `resident_documents`: `resident_id`, `document_type_id`, `status`
    (`missing` | `uploaded` | `replaced`), `file_id` nullable,
    `signed_on` nullable, `uploaded_by`, `uploaded_at`, `notes`. Una
    nueva foto no borra la anterior: la marca como reemplazada.
-   `admissions` (borrador del ingreso guiado): `resident_id`,
    `current_step`, `status` (`draft` | `confirmed`), `confirmed_by`,
    `confirmed_at`.
-   Configuración de sede (`sites` o `site_settings`):
    `emergency_service_name`, `emergency_service_phone`,
    `medical_control_frequency`, `fee_rule_text`,
    `family_provides_text`.
-   `resident_notes` (novedades), `note_versions`, `note_categories`, `shifts`
    (definición de turnos de la institución), `shift_handovers`.
-   (v2.4) Configuración de sede, además: `public_intake_enabled`, la
    ruta o el dominio de la landing (`public_intake_path`) y
    `fee_reminder_days_before` (7 por defecto).
-   (v2.4) `admission_requests` (solicitudes de ingreso, 7.3-C3): los
    campos de los pasos 1 y 2 del ingreso (paciente, cobertura y
    responsable), `origin` (`landing` | `staff`), `contact_channel`
    nullable, `status` (`new` | `contacting` | `waitlisted` |
    `converted` | `discarded`), `desired_admission_date` nullable,
    `family_message`, `internal_notes`, `consent_accepted_at` y
    `consent_text_version` (obligatorios si viene de la landing),
    `client_request_id` (idempotencia, único por organización),
    `assigned_to` nullable, `converted_admission_id` nullable,
    `discard_reason` nullable, `version`, `created_by` nullable (null
    si viene de la landing).
-   (v2.4) `admission_request_contacts`: `request_id`, `name`,
    `relationship`, `phone`, `priority`.
-   (v2.4) `resident_fee_plans` (abono, 7.3-C4): `resident_id`,
    `amount` (`numeric(12,2)`, en pesos), `billing_day`,
    `effective_from`, `effective_to` nullable, `reason`. Un cambio de
    precio cierra la fila vigente y crea otra.
-   (v2.4) `fee_charges` (cuotas): `resident_id`, `fee_plan_id`,
    `period_start`, `period_end`, `due_date` (`date`, en la zona horaria
    de la sede), `amount`, `status` (`pending` | `paid` | `void`;
    "vencida" se calcula), `void_reason` nullable. Única por
    (`resident_id`, `due_date`).
-   (v2.4) `fee_payments`: `charge_id`, `resident_id`, `amount`,
    `paid_on`, `method` (efectivo, transferencia u otro), `notes`,
    `received_by`, `client_request_id`, `voided_at` nullable,
    `void_reason` nullable. Sin borrado.
-   (v2.4) `notifications`: `recipient_user_id`, `type`, `entity_type`,
    `entity_id`, `title`, `body` (sin datos de salud), `read_at`
    nullable, `dedupe_key` (único). Los emails los manda el worker y no
    llevan nombres ni montos.
-   (Fase 4) `resident_conditions`: `resident_id`, `description`,
    `since`, `recorded_by` (profesional), `status`.
-   (Fase 7) `rooms`, `beds`, `bed_assignments` (`resident_id`,
    `bed_id`, `from`, `to`).

### Empleados (fase 5; en el MVP el perfil básico vive en la membresía)

-   `employees`: `first_name`, `last_name`, `national_id`, `cuil`,
    `birth_date`, `phone`, `email`, `address`, `emergency_contact`,
    `position`, `area`, `hire_date`, `termination_date` nullable,
    `status`, `profession` nullable, `specialty` nullable,
    `license_number` nullable, `license_jurisdiction` nullable,
    `license_expires_at` nullable, `user_id` nullable.
-   `employee_documents`: `employee_id`, `type`, `file_id`,
    `issued_at`, `expires_at`, `status`.
-   `shift_assignments`
    (`employee_id`, `starts_at`, `ends_at`, `area`), `attendance_records`
    (`employee_id`, `clock_in`, `clock_out`, `source`, `notes`).

### Seguimiento del cuidado (fase 2) e historia clínica (fase 4)

-   `external_professionals`: `name`, `specialty`, `license_number`,
    `phone`, `institution`.
-   `care_team_members`: `resident_id`, `employee_id` nullable,
    `external_professional_id` nullable, `role_in_team`,
    `expected_frequency` nullable, `from`, `to`.
-   `care_encounters` (atenciones/visitas): `resident_id`, `type`,
    `employee_id` nullable, `external_professional_id` nullable,
    `occurred_at`, `location`, `reason`, `notes`, `instructions`,
    `next_control_at` nullable, `incident_id` nullable.
-   `tasks`, `incidents`, `incident_types` (fase 2; ver 11.1).
-   (Fase 4) `clinical_entries` (evoluciones): `resident_id`, `author_user_id`,
    `entry_type`, `content`, `occurred_at`, `signed_at`,
    `amends_entry_id` nullable. Sin `updated_at`: son inmutables.
-   `vital_signs`: `resident_id`, `type`, `value`, `unit`,
    `measured_at`, `measured_by`, `notes`, `voided_at` nullable,
    `void_reason` nullable.
-   `vital_sign_ranges` (opcional, definidos por el médico):
    `resident_id`, `type`, `min`, `max`, `defined_by`.
-   (Fase 4) `attachments`: `resident_id`, `related_type`, `related_id`,
    `file_id`, `category`, `uploaded_by`.

### Medicación y stock (fase 3)

-   `medications` (catálogo): `brand_name`, `active_ingredient`,
    `strength`, `form`, `presentation`, `stock_unit`, `is_controlled`,
    `status`.
-   `medication_orders` (indicaciones): `resident_id`,
    `medication_id`, `dose`, `dose_unit`, `route`, `frequency`,
    `schedule_times`, `is_prn` (SOS), `prn_criteria`, `instructions`,
    `start_at`, `end_at` nullable, `prescribed_by`, `source` (interna,
    transcrita), `validated_by` nullable, `validated_at` nullable,
    `status` (activa, suspendida, finalizada, pendiente de validación),
    `replaces_order_id` nullable.
-   `medication_administrations`: `order_id`, `resident_id`,
    `scheduled_at` nullable, `administered_at`, `status` (administrada,
    omitida, rechazada, diferida, no disponible), `reason`,
    `quantity`, `administered_by`, `verified_by` nullable,
    `voided_at` nullable, `void_reason` nullable.
-   `stock_lots`: `resident_id` nullable (null = botiquín de la
    residencia), `medication_id` o `supply_id`, `lot_number`,
    `expires_at`, `source`.
-   `stock_movements`: `resident_id` nullable, `item_type`
    (medicamento/insumo), `item_id`, `lot_id` nullable, `movement_type`
    (ingreso, consumo, ajuste, descarte, devolución, transferencia),
    `quantity` (con signo), `administration_id` nullable, `reason`,
    `performed_by`, `performed_at`.
-   `stock_counts`: `resident_id`, `item_id`, `counted_quantity`,
    `system_quantity`, `difference_reason`, `counted_by`.
-   `supplies` (catálogo de insumos, si se valida).

El saldo de stock se calcula desde `stock_movements` (o se mantiene una
vista/tabla materializada actualizada en la misma transacción).

## 11.3 Entidades futuras

Solo si se valida el alcance: - `resident_authorizations` (familiares
con acceso al portal) - `visits` - `announcements` - `documents` -
`billing_accounts` - `invoices` - `payments` - `expenses` -
`notifications` - `ai_generation_records`

Desde la v2.4, `notifications` y los pagos del abono (`fee_payments`,
7.3-C4) pasan al MVP (sección 11.2). `billing_accounts`, `invoices` y
`expenses` siguen como futuras.

Para el portal familiar, la relación entre residente y familiar debe
representar una autorización explícita, con vigencia, alcance y
revocación. No basta con que alguien conozca el nombre o identificador
de un residente.

## 11.4 Reglas de integridad

-   Evoluciones clínicas: inmutables; corrección solo por enmienda.
-   Administraciones, signos vitales y movimientos de stock: sin borrado;
    corrección por anulación con motivo o por movimiento compensatorio.
-   Indicaciones de medicación: un cambio crea una nueva indicación y
    suspende la anterior.
-   Registrar una administración "administrada" y su movimiento de
    consumo en la **misma transacción**.
-   Un empleado dado de baja conserva su nombre en todos los registros
    históricos.
-   Las entidades operativas deben estar asociadas a una institución.
-   La institución de la entidad relacionada debe coincidir con la
    institución del usuario autorizado.
-   Aplicar claves foráneas y restricciones en la base de datos.
-   Definir índices para las búsquedas frecuentes.
-   Usar transacciones para operaciones que deban ser atómicas.
-   Usar timestamps coherentes y almacenar tiempos de forma consistente.
-   Definir qué pasa con las referencias cuando un usuario se desactiva.
-   Evitar borrados en cascada de información sensible sin una política
    aprobada.
-   Aplicar migraciones versionadas y revisadas.

------------------------------------------------------------------------

# 12. Seguridad, privacidad y cumplimiento

Este producto puede manejar datos personales y, potencialmente, datos
sensibles de salud. La seguridad y el cumplimiento son requisitos del
producto, no tareas para el final.

## 12.1 Principios

-   Minimización: recopilar solo lo necesario.
-   Finalidad: usar datos solo para propósitos definidos.
-   Acceso mínimo: cada usuario ve lo estrictamente necesario.
-   Trazabilidad: registrar accesos y cambios relevantes.
-   Transparencia: informar a las personas de forma apropiada.
-   Seguridad: proteger datos en tránsito, almacenamiento y operación.
-   Retención limitada: definir cuándo conservar y cuándo eliminar.
-   Recuperabilidad: respaldar y probar restauraciones.
-   Portabilidad: permitir exportar datos autorizados.
-   Separación de instituciones: impedir accesos cruzados.

## 12.2 Marco argentino

Revisar con asesoramiento profesional la normativa aplicable, incluida
la Ley 25.326 de Protección de los Datos Personales y sus normas
complementarias, además de cualquier regulación provincial, sanitaria,
contractual o sectorial que corresponda a la institución y al tipo de
información procesada.

Antes del piloto real: - Determinar quién es responsable y quién
encargado del tratamiento, según el caso. - Definir la base legal y las
autorizaciones necesarias. - Redactar términos, aviso de privacidad y
acuerdos contractuales. - Establecer procedimientos de acceso,
rectificación, exportación y eliminación cuando correspondan. - Revisar
transferencias internacionales y proveedores. - Definir respuesta a
incidentes y notificación cuando sea exigible. - Determinar obligaciones
de conservación de registros. - Validar el tratamiento de información de
familiares y representantes.

Este documento no constituye asesoramiento jurídico. La aplicabilidad
exacta debe determinarla un profesional.

## 12.3 Prohibiciones para el desarrollo inicial

-   No usar datos reales de residentes en demostraciones públicas.
-   No cargar datos reales en herramientas de IA sin autorización y
    evaluación.
-   No incluir credenciales, tokens o claves en Git.
-   No crear endpoints de administración sin autorización.
-   No permitir acceso por ID sin verificar institución y permisos.
-   No registrar datos clínicos completos en logs de errores.
-   No compartir documentos mediante enlaces públicos permanentes.
-   No eliminar historial de forma silenciosa.
-   No permitir que el modelo de IA cambie datos sensibles sin
    confirmación humana y controles.

## 12.4 Historia clínica y datos de salud

Desde el MVP se guardan algunos datos de salud (alergias, cobertura).
Con las fases 3 y 4 el sistema pasa a tratar datos de salud en forma
amplia (datos sensibles) y registros que pueden formar parte de la historia clínica. Normativa a
revisar con un profesional, entre otras:

-   **Ley 26.529** (Derechos del Paciente, Historia Clínica y
    Consentimiento Informado), en particular su capítulo sobre historia
    clínica: titularidad del paciente, integridad, autenticidad,
    inalterabilidad, perdurabilidad, recuperabilidad, plazos de
    conservación y acceso del paciente o sus representantes.
-   **Ley 27.706** (Programa Federal Único de Informatización y
    Digitalización de Historias Clínicas) y su reglamentación (Decreto
    393/2023): definición de historia clínica electrónica, accesos
    restringidos, trazabilidad, identificación de profesionales con
    matrícula y eventual interoperabilidad.
-   **Ley 25.326** (Protección de Datos Personales): datos sensibles,
    consentimiento, seguridad y confidencialidad.
-   Normativa provincial sobre establecimientos geriátricos y sobre
    historia clínica digital de la jurisdicción donde opere cada cliente.

Requisitos de diseño derivados (a confirmar legalmente): - Autoría
inequívoca de cada registro (usuario personal, nunca compartido). -
Inalterabilidad con enmiendas. - Marca temporal confiable del servidor.
- Accesos restringidos por rol y registrados. - Conservación por el
plazo que exija la normativa, incluso tras el egreso o la baja del
cliente. - Exportación completa a pedido del titular o representante. -
Definir si se necesita firma electrónica o digital para ciertos
documentos.

## 12.5 Medicamentos controlados

Psicotrópicos y estupefacientes pueden tener requisitos específicos de
registro, custodia y conteo. Antes de usar el módulo de stock para
ellos, verificar con el director técnico/farmacéutico de la institución
y la normativa vigente qué registros exige (libro, conteos, firmas) y si
el sistema puede reemplazarlos o solo complementarlos.

## 12.6 Datos de empleados

El legajo de empleados contiene datos personales y laborales (DNI, CUIL,
domicilio, certificados de salud o aptitud). Aplicar: - Acceso solo para
RRHH y dirección. - Documentos médicos del empleado con acceso aún más
restringido. - Conservación según obligaciones laborales. - No mezclar
datos de empleados con la vista operativa del personal (en la vista de
turno solo se ve nombre, rol y teléfono interno).

## 12.7 Fotos de documentos de ingreso

Las fotos de la ficha de ingreso, los formularios de PAMI y el DNI
contienen DNI, domicilio, teléfonos y N.º de beneficiario del paciente y
de su familia. Reglas: - Almacenamiento privado, nunca enlaces públicos.
- Acceso solo para Administración y Dirección; apertura auditada. - No
se procesan con OCR ni IA externa sin evaluación previa. - No se usan
documentos reales para diseñar, probar ni hacer demos: se reemplazan por
datos ficticios. - Se conservan mientras dure la internación y el plazo
que indique el asesoramiento legal después del egreso.

## 12.8 Acceso de emergencia ("break-glass")

Para que nadie quede sin datos críticos en una urgencia sin abrir todos
los permisos: - Cualquier usuario activo de la institución puede abrir
la ficha de emergencia de un residente, aunque su rol no vea la
historia clínica. - Debe indicar un motivo breve (o elegirlo de una
lista). - El acceso queda auditado y se notifica a la dirección. - El
acceso es de solo lectura y limitado a la ficha de emergencia. - La
dirección revisa periódicamente estos accesos.

Si la institución prefiere que la ficha de emergencia sea visible para
todo el personal sin "break-glass", es una configuración explícita y
registrada.

## 12.9 Formulario público de solicitud de ingreso

La landing (7.3-C3) es la primera parte de la aplicación que se usa sin
iniciar sesión. Reglas:

-   La residencia se resuelve en el servidor por el dominio o la ruta de
    la landing, nunca por un dato que mande el navegador.
-   El formulario escribe con un rol de base de datos que solo puede
    insertar en `admission_requests`, `admission_request_contacts`,
    `domain_events` y `audit_events`: sin permiso de lectura y sin
    `RETURNING`.
-   Límite de envíos por IP y por residencia (en el proxy y en la app),
    un campo oculto que solo completan los bots y un captcha (propuesta:
    ALTCHA, autoalojado y sin terceros).
-   La respuesta es siempre la misma, exista o no el DNI; los posibles
    duplicados solo se le muestran al personal.
-   Aviso de privacidad y casilla de consentimiento con el texto que
    defina el abogado; se guardan la fecha y la versión del texto.
-   Se pide lo mínimo: nada de diagnósticos, medicación ni fotos de
    documentos.
-   La auditoría de las solicitudes registra las acciones sin copiar los
    datos, para poder borrarlos al vencer el plazo de conservación.
-   El aviso al personal y el email a la familia ("Recibimos tu
    solicitud") no llevan datos del paciente.
-   La cookie de sesión de la app queda solo en su subdominio: no se
    habilitan cookies compartidas entre subdominios.
-   Los logs técnicos no guardan el contenido del formulario.

## 12.10 Datos económicos de las familias

El abono y los pagos (7.3-C4) son datos personales de las familias,
aunque no sean datos de salud:

-   Solo Administración y Dirección los ven (`fees.read`) y los cargan
    (`fees.manage`). El control se hace en el servidor y en la base, no
    solo ocultando pantallas.
-   Los emails de aviso no llevan nombres ni montos; el detalle se ve
    dentro de la app.
-   Los cambios de precio, los pagos y las anulaciones quedan en la
    auditoría, con autor, fecha, valor anterior y nuevo.
-   Entran en la exportación por organización (E14).

------------------------------------------------------------------------

# 13. Diseño de la interfaz

## 13.1 Principios visuales

La aplicación debe sentirse profesional, tranquila y clara, sin parecer
un sistema hospitalario excesivamente complejo.

Recomendaciones: - Diseño limpio y minimalista. - Jerarquía visual
evidente. - Tipografía legible. - Contraste suficiente. - Espaciado
generoso. - Estados visuales consistentes. - Iconos acompañados de texto
cuando la acción no sea obvia. - Botones táctiles amplios en móviles. -
Evitar exceso de animaciones. - No depender únicamente del color para
indicar prioridad o estado.

## 13.2 Estructura de navegación sugerida

La app es **mobile first** y tiene **modo claro y oscuro** (Más ›
Apariencia: Claro, Oscuro o Sistema).

**Móvil — barra inferior fija (estilo Mercado Pago):** Pacientes ·
Novedades · botón central "+" elevado (registrar novedad) · Turnos ·
Más. "Novedades" muestra primero los pendientes con seguimiento (cumple
la función de inicio del personal). "Más" contiene: perfil, Empleados,
Usuarios y roles, Configuración, Apariencia y Cerrar sesión.

**Escritorio — menú lateral:** Pacientes · Empleados · Traspaso de
turnos · Novedades; abajo, separados: Usuarios y roles · Configuración.
El logo lleva al Inicio (panel con pendientes, novedades y acceso a
emergencias).

En el MVP "Empleados" es el listado de usuarios con perfil básico; el
legajo completo llega en la fase 5.

Desde la v2.4, y solo para quienes tienen permiso: **"Solicitudes"**
como pestaña dentro de Pacientes (7.3-C3) y **"Abonos"** en Más y en el
menú lateral de escritorio (7.3-C4).

Se agregan por fase, y solo aparecen si el módulo está activado para la
institución: - Fase 2: Tareas, Incidencias, Atenciones, Signos vitales.
- Fase 3: Medicación del turno, Stock. - Fase 4: Historia clínica. -
Fase 5: Legajo, Turnos y guardias, Asistencia. - Fase 6: Portal de
familias. - Fase 7: Habitaciones y camas, Cuotas, Reportes.

El diseño visual de todas estas pantallas está en el canvas "Mis Nonos —
Diseño del MVP" (sistema visual, pantallas del MVP y una pantalla clave
por fase).

Dentro de la ficha del residente, pestañas: Resumen · Emergencia ·
Datos y contactos · Historia clínica · Atenciones · Signos vitales ·
Medicación · Stock · Novedades e incidencias · Documentos · Actividad
(auditoría).

La navegación exacta debe adaptarse a las entrevistas. No incluir
módulos futuros en el menú si todavía no funcionan.

## 13.3 Pantalla de inicio

La pantalla inicial del personal debe mostrar: - Tareas asignadas
pendientes. - Novedades recientes autorizadas. - Incidencias abiertas
relevantes. - Accesos rápidos a las acciones frecuentes.

La pantalla de dirección puede priorizar: - Pendientes por resolver. -
Incidencias abiertas. - Actividad reciente. - Indicadores operativos
básicos.

Desde la v2.4, Administración y Dirección ven además en el Inicio: los
abonos que vencen esta semana y los vencidos (7.3-C4), las solicitudes
de ingreso nuevas (7.3-C3) y los documentos faltantes del legajo.

Con las fases 2 y 3, enfermería ve además: dosis pendientes del turno, stock
bajo y vencimientos próximos, controles programados y visitas
profesionales previstas para hoy. Dirección ve además: dosis omitidas
del día, accesos de emergencia, documentación de empleados por vencer y
visitas atrasadas.

No llenar la pantalla de métricas sin una decisión que esas métricas
ayuden a tomar.

## 13.4 Accesibilidad y dispositivos

-   Probar en móviles Android comunes y computadoras de escritorio.
-   Evitar formularios extensos.
-   Mantener acciones principales visibles.
-   Confirmar operaciones destructivas.
-   Dar feedback inmediato al guardar.
-   Probar con usuarios que no tengan experiencia técnica.
-   Considerar conectividad irregular y diseñar mensajes de error
    claros.

No implementar modo offline con sincronización compleja hasta validar
que sea necesario; podría introducir conflictos de datos y riesgos de
privacidad.

## 13.5 Pantallas críticas

-   **Ficha de emergencia:** una sola pantalla, contactos con botón
    "Llamar" grande, alergias resaltadas con texto y color, carga
    rápida.
-   **Medicación del turno:** lista por horario, foto y nombre del
    residente visibles antes de confirmar, un toque para "administrada"
    y dos para cualquier otro estado (con motivo).
-   **Registro de signos vitales:** teclado numérico, unidades fijas,
    varios valores en un mismo formulario.
-   **Ficha del residente:** cabecera fija con foto, habitación, banner
    de alergias y botón Emergencia.

------------------------------------------------------------------------

# 14. Plan de desarrollo por etapas

Los tiempos son estimaciones de planificación y deben ajustarse a la
disponibilidad del desarrollador, complejidad y feedback.

## Etapa 0 --- Discovery y validación (semana 1)

Entregables: - Lista de instituciones entrevistadas. - Mapa del proceso
actual. - Problemas priorizados. - Competidores revisados. - Hipótesis
de valor. - Criterios de éxito del piloto. - Decisión sobre el flujo del
MVP.

Preguntas para entrevistas: 1. ¿Cómo se transmite hoy la información
entre turnos? 2. ¿Dónde registran las novedades? 3. ¿Qué información se
pierde o cuesta encontrar? 4. ¿Cómo se asignan y supervisan las tareas?
5. ¿Qué herramientas utilizan? 6. ¿Qué tarea administrativa les consume
más tiempo? 7. ¿Qué intentaron solucionar antes? 8. ¿Qué les gusta y
disgusta del software actual? 9. ¿Quién decide la compra y quién
utilizaría el sistema? 10. ¿Qué condiciones de seguridad, conectividad o
cumplimiento exigen? 11. ¿Qué resultado justificaría pagar por una
solución? 12. ¿Aceptarían probar un prototipo o piloto pagado?

No preguntar solo "¿te gusta la idea?". Buscar ejemplos concretos de
problemas recientes y evidencia de que la institución invertiría en
resolverlos.

## Etapa 1 --- Prototipo (semana 2)

Entregables: - Mapa de navegación. - Wireframes. - Diseño de las
pantallas principales. - Prototipo navegable. - Guion de prueba con
usuarios. - Lista de cambios antes de programar.

Probar si un usuario puede: - Encontrar un residente. - Registrar una
novedad. - Crear una tarea. - Consultar lo pendiente. - Entender quién
debe actuar.

## Etapa 2 --- Base técnica (semana 2 o 3)

Entregables: - Repositorio. - Estructura de carpetas por módulo. -
Entornos. - Configuración de TypeScript y linting. - Base de datos. -
Migraciones. - Autenticación. - Cimientos de escalabilidad de la
sección 10.9: organizaciones y sedes, Row Level Security, módulos
activables, permisos como datos, auditoría genérica, eventos de dominio,
almacenamiento de archivos y observabilidad. - Manejo de secretos. -
Pruebas iniciales. - Pipeline de despliegue.

Antes de implementar funcionalidades, establecer convenciones de código
y una arquitectura coherente.

## Etapa 3 --- Fase 1: MVP funcional (semanas 3 a 6, orientativo)

Entregables (detalle en sección 7.3), en este orden de construcción
(actualizado en la v2.4):

1.  Usuarios, roles y perfil básico de empleado.
2.  Ficha del residente con cobertura y alergias, y contactos
    familiares y de emergencia.
3.  Ingreso guiado en 4 pasos y legajo documental (C2).
4.  Ficha de emergencia y hoja de derivación PDF.
5.  Novedades con seguimiento simple.
6.  Traspaso de turno.
7.  Inicio de personal y de dirección.
8.  Solicitudes de ingreso: bandeja, carga manual y conversión en
    ingreso (C3).
9.  Abono mensual, pagos y aviso de vencimiento, con las
    notificaciones, el email y el worker (C4).
10. Al final: landing pública con el formulario de solicitud de ingreso
    (C3; se publica con el aviso de privacidad revisado).

Durante toda la etapa: auditoría, diseño responsive y pruebas de
autorización. Las solicitudes y el abono suman, en forma orientativa,
entre 2 y 4 semanas a esta estimación.

Priorizar flujos completos y confiables sobre muchas pantallas
incompletas.

## Etapa 4 --- Pruebas y hardening (semanas 5 a 6, orientativo)

Entregables: - Pruebas unitarias. - Pruebas de integración. - Pruebas
end-to-end. - Revisión de permisos. - Revisión de separación entre
instituciones. - Revisión de accesibilidad. - Prueba de recuperación de
backups. - Revisión de logs y secretos. - Documentación de errores
conocidos.

Usar datos ficticios para la mayoría de las pruebas.

## Etapa 5 --- Piloto controlado (después de la validación)

Antes de usar datos reales: - Obtener autorización institucional. -
Completar revisión legal y de privacidad. - Definir responsables. -
Acordar alcance y criterios de salida. - Capacitar a los usuarios. -
Tener plan de soporte. - Definir cómo revertir el piloto. - Establecer
métricas de uso y éxito.

Comenzar con un flujo y un grupo limitado de usuarios. Recoger feedback
sin interrumpir procesos de cuidado ni sustituir los protocolos
institucionales.

## Etapa 6 --- Iteración comercial

Medir: - Usuarios activos por semana. - Porcentaje de tareas
completadas. - Tiempo para registrar una novedad. - Novedades pendientes
de revisar. - Incidencias abiertas y tiempo hasta su resolución. -
Frecuencia de uso del traspaso de turno. - Satisfacción de usuarios. -
Renovación y disposición a pagar.

No confundir más registros con mejores cuidados. Interpretar las
métricas con la dirección y el personal.

## Etapa 7 --- Fase 2: seguimiento del cuidado (orientativo: 3 a 5 semanas)

Tareas (incluye recurrentes), incidencias con tipos, conversión de
novedades con seguimiento en tareas o incidencias, equipo tratante,
atenciones con "última visita" y visitas atrasadas, signos vitales.

## Etapa 8 --- Fase 3: medicación y stock (orientativo: 5 a 8 semanas)

Requisito previo: revisión legal de datos de salud (sección 12.4) y
diseño validado con el médico y la enfermería de la institución piloto.

Orden sugerido, cada uno de punta a punta con pruebas: 1. Catálogo de
medicamentos. 2. Indicaciones con validación. 3. Plan de administración
y "medicación del turno" (primer uso de los trabajos programados, E15).
4. Registro de dosis. 5. Stock por residente: ingresos, consumo
automático, ajustes, conteos, vencimientos. 6. Alertas y días
restantes. 7. Medicación activa en la ficha de emergencia. 8. Reportes.

Pilotear con datos ficticios primero y luego con pocos residentes, **en
paralelo con el registro en papel** hasta que la institución apruebe el
reemplazo.

## Etapa 9 --- Fase 4: historia clínica (orientativo: 4 a 6 semanas)

Requisito previo: revisión legal de historia clínica digital en la
jurisdicción del cliente. Antecedentes, evoluciones inalterables,
enmiendas, adjuntos, línea de tiempo, exportación, auditoría de
lecturas y break-glass.

## Etapa 10 --- Fase 5: personal (orientativo: 3 a 5 semanas)

Legajo completo, documentación y vencimientos, turnos y guardias,
asistencia, reporte de guardia por fecha y hora.

## Etapa 11 --- Fase 6: familias

Portal familiar con autorizaciones, comunicados, visitas,
notificaciones genéricas.

## Etapa 12 --- Fase 7: administración y escala

Camas y ocupación, gestión documental, cuotas, pagos y gastos,
multisede, integraciones, automatizaciones e IA para reportes, siempre
según demanda validada.

## Hoja de ruta resumida

| Etapa | Contenido | Condición para avanzar |
|-------|-----------|------------------------|
| 0 | Discovery | 5–10 entrevistas, problema priorizado |
| 1 | Prototipo navegable de fases 1 a 3 | Usuarios completan los flujos clave sin ayuda |
| 2 | Base técnica y cimientos de escala | Auth, roles, multiinstitución, RLS y auditoría con pruebas |
| 3 | **Fase 1 — MVP** | Criterios de aceptación cumplidos |
| 4 | Hardening | Pruebas de seguridad y backups verificadas |
| 5 | Piloto del MVP | Uso diario sostenido, disposición a pagar |
| 6 | Iteración comercial | Primeros clientes pagos |
| 7 | Fase 2 — Seguimiento del cuidado | MVP en uso diario |
| 8 | Fase 3 — Medicación y stock | Revisión legal, diseño validado con profesionales |
| 9 | Fase 4 — Historia clínica | Revisión legal de HC digital |
| 10 | Fase 5 — Personal | Demanda de clientes |
| 11 | Fase 6 — Familias | Demanda de clientes |
| 12 | Fase 7 — Administración y escala | Demanda de clientes |

El orden de las fases 2 a 7 puede cambiar según lo que pidan y paguen los
clientes; los cimientos de la sección 10.9 permiten hacerlo.

------------------------------------------------------------------------

# 15. Estrategia comercial y precios

## 15.1 Modelo

Modelo SaaS por suscripción. Posibles ingresos complementarios: -
Implementación inicial. - Capacitación. - Migración controlada de
datos. - Configuración avanzada. - Integraciones específicas. - Soporte
con niveles diferenciados.

Evitar que todos los clientes requieran personalizaciones únicas. Si una
función se solicita repetidamente, evaluar incorporarla al producto
estándar.

## 15.2 Planes posibles

### Inicial

-   Una residencia.
-   Fase 1 (MVP): residentes, contactos, ficha de emergencia,
    novedades, traspaso de turno.
-   Fase 2 cuando exista: tareas, incidencias, atenciones, signos
    vitales.
-   Soporte estándar.

### Profesional

-   Todo lo anterior.
-   Fase 3: medicación y stock.
-   Fase 4: historia clínica.
-   Panel de dirección y reportes.

### Avanzado

-   Todo lo anterior.
-   Fase 5: personal completo.
-   Fase 6: portal familiar.
-   Integraciones específicas acordadas.

Los planes se implementan activando módulos por cliente (sección 10.9,
E3). Al principio puede haber un solo plan con el MVP y un precio de
lanzamiento para los primeros clientes.

### Multisede

-   Varias residencias.
-   Administración central.
-   Reportes consolidados.
-   Permisos por sede.

No vender funcionalidades futuras como si ya existieran.

## 15.3 Cómo fijar el precio

No fijar el precio únicamente según el costo de la IA o del servidor.
Evaluar: - Cantidad de residentes. - Tamaño del establecimiento. -
Usuarios. - Valor del problema resuelto. - Costo de soporte. -
Complejidad de implementación. - Costos de infraestructura. -
Alternativas actuales. - Disposición real a pagar.

Realizar entrevistas y probar propuestas concretas. Los precios de otros
proveedores son referencias para investigar, no una tarifa que deba
copiarse.

## 15.4 Métricas comerciales

-   Instituciones entrevistadas.
-   Demostraciones realizadas.
-   Pruebas piloto iniciadas.
-   Conversión a cliente pago.
-   Ingreso recurrente mensual.
-   Costo de adquisición.
-   Tiempo de implementación por cliente.
-   Cancelaciones.
-   Solicitudes de soporte por institución.
-   Margen después de infraestructura y soporte.

------------------------------------------------------------------------

# 16. Operación y mantenimiento

Un SaaS no termina cuando se despliega.

Debe existir un procedimiento para: - Desplegar versiones. - Revertir
cambios defectuosos. - Aplicar migraciones. - Revisar errores. -
Controlar disponibilidad. - Rotar secretos. - Actualizar dependencias. -
Restaurar copias de seguridad. - Responder a incidentes. - Gestionar
solicitudes de acceso y eliminación. - Dar de baja usuarios. - Exportar
datos de una institución. - Comunicar cambios y mantenimientos.

Definir un objetivo de recuperación y pérdida máxima de datos aceptable
con el cliente antes de elegir la estrategia de backups. Probar las
restauraciones: una copia de seguridad no verificada no es suficiente.

------------------------------------------------------------------------

# 17. Pruebas que la IA debe implementar

## 17.1 Pruebas de autorización críticas

Crear al menos dos instituciones de prueba, A y B, con usuarios
separados.

Verificar: - Usuario de A no puede consultar residentes de B. - Usuario
de A no puede consultar novedades de B. - Cambiar un ID en la URL no da
acceso a otro residente. - Un usuario sin rol administrativo no puede
gestionar usuarios. - Un usuario desactivado pierde acceso. - Un
familiar, cuando exista ese módulo, solo accede a residentes
explícitamente autorizados. - Las operaciones de escritura aplican los
mismos controles que las de lectura.

## 17.2 Pruebas de negocio

-   Crear novedad con campos válidos.
-   Rechazar datos inválidos.
-   Asignar una tarea.
-   Cambiar estado.
-   Mantener historial.
-   Mostrar pendientes correctamente.
-   Gestionar referencias a usuarios desactivados.
-   Manejar errores de base de datos.
-   Evitar duplicados cuando corresponda.
-   Aplicar zona horaria y fechas correctamente.

## 17.3 Pruebas de interfaz

-   Carga.
-   Estado vacío.
-   Error.
-   Guardado exitoso.
-   Formularios largos o con validaciones.
-   Uso en móvil.
-   Navegación por teclado.
-   Lectura con zoom.
-   Confirmaciones de acciones importantes.

## 17.4 Pruebas de seguridad

-   No exponer secretos.
-   Validar inputs en servidor.
-   Protección contra inyección.
-   Protección contra XSS y CSRF según la arquitectura.
-   Configuración segura de cookies.
-   Rate limiting donde corresponda.
-   Autorización por objeto.
-   Acceso privado a archivos.
-   Redacción de logs.
-   Revisión de dependencias.
-   Comprobación de backups.

## 17.5 Pruebas de medicación y stock

-   Solo roles habilitados crean o validan indicaciones.
-   Una indicación modificada suspende la anterior y conserva el
    historial.
-   El plan de administración refleja exactamente las indicaciones
    activas (horarios, fechas de inicio y fin, SOS).
-   Registrar "administrada" descuenta stock en la misma transacción; si
    falla una operación, no queda ninguna.
-   Estados distintos de "administrada" exigen motivo.
-   Anular una administración genera el movimiento compensatorio.
-   El saldo es igual a la suma de movimientos en todos los casos.
-   Días restantes y alertas de stock bajo y vencimiento se calculan
    correctamente, incluidos residentes sin indicaciones activas.
-   No se puede administrar a un residente de otra institución ni con
    una indicación suspendida.
-   Concurrencia: dos enfermeros registrando la misma dosis no generan
    doble consumo.

## 17.6 Pruebas de historia clínica y emergencia

-   Una evolución guardada no puede editarse ni borrarse por API.
-   Una enmienda conserva y vincula el original.
-   Un rol sin permiso clínico no ve evoluciones pero sí puede usar el
    acceso de emergencia, que queda auditado y notificado.
-   La ficha de emergencia muestra alergias, cobertura, medicación
    activa y contactos en orden.
-   La hoja de derivación queda registrada con usuario y hora.
-   "Última visita" por tipo se actualiza con cada atención.
-   Las lecturas sensibles generan eventos de auditoría.

## 17.7 Pruebas de empleados

-   La baja de un empleado revoca su acceso de inmediato.
-   Sus registros históricos siguen mostrando su nombre.
-   Solo RRHH y dirección ven el legajo completo.
-   Las alertas de vencimiento de documentación se disparan en las
    fechas configuradas.

## 17.8 Pruebas de solicitudes de ingreso y del formulario público

-   El rol del formulario público no puede leer ninguna tabla, ni
    siquiera las solicitudes que acaba de crear.
-   La respuesta es la misma con un DNI existente o inexistente.
-   El límite de envíos y el campo oculto rechazan los envíos
    automáticos.
-   Un doble envío con el mismo `client_request_id` no duplica la
    solicitud.
-   La residencia sale del dominio o la ruta, no de los datos enviados.
-   Una solicitud de la residencia A no es visible ni convertible desde
    la B.
-   Convertir crea el borrador del ingreso con los pasos 1 y 2
    completos en una sola transacción; si algo falla, no queda nada.
-   Antes de convertir se avisa al personal si el DNI ya existe.
-   Las solicitudes no convertidas se borran al vencer el plazo.
-   Los logs técnicos no contienen datos del formulario.

## 17.9 Pruebas del abono y los pagos

-   El vencimiento por defecto es el mismo día del mes siguiente,
    incluidos los ingresos de los días 29, 30 y 31, y se puede cambiar.
-   El aviso llega 7 días antes, una sola vez por usuario y por día,
    aunque el trabajo se reintente.
-   No hay aviso si la cuota está pagada, si el monto es 0 o si el
    paciente egresó.
-   El horario del aviso respeta la zona horaria de la sede.
-   Los pagos parciales dejan el saldo correcto y la cuota pasa a
    pagada al completarse.
-   Anular un pago no lo borra y vuelve a dejar el saldo pendiente.
-   Un cambio de precio guarda el historial y aplica desde la próxima
    cuota sin pagar.
-   Enfermería y Cuidado no ven montos ni pagos, ni en pantalla ni por
    API.
-   Una residencia no ve los abonos de otra.
-   Los emails de aviso no contienen nombres ni montos.

------------------------------------------------------------------------

# 18. Organización del repositorio

Una estructura posible para un monolito Next.js:

``` text
residencia360/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── (public)/           # landing y formulario de solicitud (sin sesión)
│   ├── api/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── layout/
│   └── forms/
├── features/
│   ├── organizations/
│   ├── residents/
│   ├── notes/
│   ├── handover/           # fase 1 (MVP)
│   ├── emergency/          # fase 1 (MVP)
│   ├── contacts/           # fase 1 (MVP)
│   ├── admission-requests/ # fase 1 (MVP): solicitudes de ingreso
│   ├── fees/               # fase 1 (MVP): abono mensual y pagos
│   ├── notifications/      # fase 1 (MVP): app y email
│   ├── tasks/              # fase 2
│   ├── incidents/          # fase 2
│   ├── employees/          # fase 5 (en el MVP, perfil en users/)
│   ├── care-team/          # fase 2
│   ├── encounters/         # fase 2
│   ├── clinical-record/    # fase 4
│   ├── vital-signs/        # fase 2
│   ├── medications/        # fase 3 (catálogo, indicaciones, administración)
│   ├── stock/              # fase 3
│   ├── staffing/           # fase 5 (turnos, asistencia)
│   └── users/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── permissions/        # can(), roles y permisos como datos (E4)
│   ├── modules/            # módulos activables por organización (E3)
│   ├── events/             # eventos de dominio / outbox (E8)
│   ├── storage/            # interfaz de archivos (E12)
│   ├── jobs/               # trabajos programados (E15)
│   ├── validation/
│   ├── audit/              # auditoría genérica (E7)
│   └── utils/
├── server/
│   ├── services/
│   └── repositories/
├── worker/                 # proceso pg-boss (alertas, resúmenes, PDF)
├── db/
│   ├── schema/             # tablas Drizzle por módulo
│   ├── migrations/         # SQL generado y revisado (incluye RLS)
│   ├── policies/           # políticas RLS y roles de base
│   └── seed/               # datos ficticios: dev y escenario "Escala"
├── infra/
│   ├── docker/             # Dockerfile multi-stage
│   ├── compose/            # etapa A: app, worker, postgres, pgbouncer, minio, caddy
│   └── runbooks/           # caída de base, restauración, secretos, incidentes
├── tests/
│   ├── unit/
│   ├── integration/        # Testcontainers + Postgres real, incluye RLS
│   ├── e2e/                # Playwright, viewport móvil
│   └── load/               # escenarios k6
├── docs/
│   ├── architecture.md
│   ├── security.md
│   └── decisions/
├── public/
├── .github/workflows/      # CI/CD
├── .env.example
├── .gitignore
├── drizzle.config.ts
├── package.json
├── README.md
└── ...
```

La estructura es orientativa. No crear carpetas vacías sin propósito.
Mantener una separación consistente entre interfaz, validación,
autorización, lógica de negocio y persistencia.

------------------------------------------------------------------------

# 19. Convenciones de desarrollo para agentes de IA

La IA debe actuar como una desarrolladora responsable, no como un
generador indiscriminado de archivos.

## 19.1 Antes de programar

1.  Leer este documento completo.
2.  Revisar el repositorio existente antes de modificarlo.
3.  Identificar el estado actual y los comandos disponibles.
4.  Crear o actualizar un plan de trabajo.
5.  Anotar supuestos y decisiones pendientes.
6.  Proponer la arquitectura mínima.
7.  No cambiar tecnologías sin explicar la razón.
8.  No implementar todos los módulos a la vez.

## 19.2 Durante el desarrollo

-   Trabajar en pequeñas etapas verificables.
-   Entregar flujos completos.
-   Escribir pruebas para lógica de negocio y permisos.
-   Validar en servidor.
-   Mantener tipos explícitos.
-   Evitar duplicar lógica.
-   Usar migraciones.
-   No inventar APIs ni variables de entorno.
-   No almacenar secretos en el código.
-   No añadir dependencias innecesarias.
-   No introducir datos sensibles reales en fixtures.
-   Actualizar la documentación con cada decisión importante.

## 19.3 Antes de cerrar cada tarea

La IA debe: 1. Ejecutar lint. 2. Ejecutar comprobación de tipos. 3.
Ejecutar pruebas relevantes. 4. Revisar los cambios. 5. Informar qué
archivos modificó. 6. Indicar comandos ejecutados y resultados. 7.
Enumerar limitaciones o pruebas pendientes. 8. No afirmar que una prueba
pasó si no se ejecutó. 9. No desplegar a producción sin autorización
explícita. 10. No realizar cambios destructivos sin respaldo y
aprobación.

## 19.4 Política de decisiones

Si una decisión afecta datos personales, acceso, seguridad,
comportamiento clínico, costos significativos o eliminación de datos, la
IA debe detenerse y pedir confirmación o proponer alternativas con
riesgos claros.

Para decisiones reversibles y de bajo riesgo, puede elegir la opción más
simple y documentarla.

------------------------------------------------------------------------

# 20. Prompt inicial para la IA que desarrollará el proyecto

El siguiente prompt puede utilizarse como punto de partida en un agente
de programación. Debe adaptarse al estado real del repositorio y a las
herramientas disponibles.

------------------------------------------------------------------------

## PROMPT DE PROYECTO

Actúa como arquitecto de software senior, desarrollador full-stack,
especialista en UX de aplicaciones operativas y responsable de calidad
para el proyecto Residencia360.

Lee íntegramente el archivo `RESIDENCIA360_CONTEXT.md` antes de realizar
cambios. Este documento contiene el contexto de negocio, producto,
usuarios, experiencia, arquitectura, seguridad y estrategia de
desarrollo.

### Objetivo

Construir por fases una plataforma web que digitalice la operación
completa de una residencia de adultos mayores: residentes, ficha de
emergencia, empleados, novedades, tareas, incidencias, traspaso de
turno, historia clínica, atenciones profesionales, signos vitales,
medicación y stock (ver secciones 7, 8 y 14).

Se construye **solo la fase 1 (MVP)**: usuarios y roles, ficha del
residente, contactos, ingreso guiado con legajo, ficha de emergencia,
novedades, traspaso de turno, solicitudes de ingreso, abono mensual con
pagos y aviso de vencimiento, y auditoría (sección 7.3). Las fases 2
a 7 no se implementan hasta que
se aprueben, pero la base técnica aplica desde el inicio los cimientos
de escalabilidad de la sección 10.9 (organizaciones y sedes, RLS,
módulos activables, permisos como datos, auditoría genérica, eventos de
dominio) para que cada fase futura sea un módulo nuevo y no una
reescritura. No crees tablas ni pantallas de fases futuras.

El sistema registra lo que indican y hacen los profesionales. No agregues
funciones que diagnostiquen, calculen o sugieran dosis ni tomen
decisiones médicas automatizadas. Los registros clínicos, de medicación
y de stock no se borran ni se editan: se anulan o enmiendan con motivo.

### Principios obligatorios

1.  Seguridad y privacidad desde el diseño.
2.  Separación estricta de datos entre instituciones.
3.  Autorización en servidor para cada operación.
4.  Auditoría de cambios relevantes.
5.  Interfaz responsive, accesible y sencilla.
6.  Código mantenible y pruebas verificables.
7.  Desarrollo incremental.
8.  No utilizar datos reales de residentes en desarrollo.
9.  No afirmar que algo funciona si no se probó.
10. No desplegar en producción ni realizar operaciones destructivas sin
    autorización.

### Stack decidido (sección 10.10)

-   Node.js 24 LTS, pnpm, TypeScript estricto.
-   Next.js 16 (App Router, React 19), `output: "standalone"`.
-   Tailwind CSS v4, shadcn/ui, lucide-react, next-themes; tokens del
    sistema visual del canvas, modo claro, oscuro y sistema.
-   React Hook Form + Zod (esquemas compartidos cliente/servidor).
-   PostgreSQL 18 con RLS, `pg_trgm`, `unaccent`, `citext`,
    `pg_stat_statements`, `pg_partman`.
-   Drizzle ORM + drizzle-kit; `pg` + PgBouncer.
-   Better Auth (adaptador Drizzle, sesiones en base, 2FA para
    administración).
-   pg-boss en un worker separado; almacenamiento S3 (MinIO en piloto;
    **nota v2.4:** MinIO ya no se mantiene, el reemplazo se decide en el
    Apéndice F).
-   Vitest, Testcontainers, Playwright, k6.
-   Docker multi-stage, GitHub Actions.

Fija la versión exacta de cada paquete al crear el repositorio y
regístrala en `docs/decisions/`. Si una librería resulta incompatible o
abandonada, detente y propone la alternativa con sus riesgos antes de
cambiarla. Cumple las reglas de volumen y producción de 10.11 a 10.18
desde la primera migración. No expongas credenciales en el cliente.

### Fase inicial: inspección y planificación

Antes de escribir código: 1. Inspecciona el repositorio y el entorno. 2.
Determina si el proyecto está vacío o ya contiene implementación. 3. Lee
el README y los archivos de configuración existentes. 4. Identifica
comandos disponibles para desarrollo, lint, tipos y pruebas. 5. Resume
el estado actual. 6. Propón un plan de implementación por etapas. 7.
Enumera decisiones pendientes que requieren intervención humana. 8.
Define una primera tarea pequeña y verificable.

No sobrescribas archivos existentes sin entender su función.

### Primer flujo que se debe construir

Una vez aprobada la planificación (orden actualizado en la v2.4):

1.  Estructura base modular de la aplicación.
2.  Configuración de entorno y documentación.
3.  Organizaciones, sedes y membresías.
4.  Autenticación.
5.  Roles y permisos como datos y función única de autorización en
    servidor.
6.  Row Level Security por organización.
7.  Módulos activables.
8.  Auditoría genérica y eventos de dominio (desde el inicio, no al
    final).
9.  Fichas de residentes con cobertura y alergias.
10. Contactos familiares y de emergencia.
11. Ingreso guiado en 4 pasos y legajo documental (7.3-C2).
12. Ficha de emergencia y hoja de derivación.
13. Novedades con seguimiento simple y versiones.
14. Traspaso de turno.
15. Inicio de personal y de dirección.
16. Solicitudes de ingreso: bandeja, carga manual y conversión en
    ingreso (7.3-C3).
17. Abono mensual, pagos y aviso de vencimiento, con las
    notificaciones, el email y el worker (7.3-C4).
18. Pruebas de permisos y separación de instituciones (se escriben
    junto con cada módulo, no al final).
19. Al final: landing pública con el formulario de solicitud de
    ingreso (7.3-C3 y 12.9).

La prioridad es que un flujo pequeño funcione de punta a punta, no que
existan muchas pantallas sin comportamiento real.

### Seguridad

-   No confíes en IDs, roles ni organización enviados por el navegador.
-   Verifica autorización en todas las operaciones.
-   Impide accesos cruzados entre instituciones.
-   Valida entradas en servidor.
-   Usa consultas parametrizadas o un ORM correctamente configurado.
-   Protege sesiones, cookies y endpoints.
-   No expongas archivos privados.
-   No registres información sensible innecesaria en logs.
-   No añadas IA generativa al flujo de cuidados del MVP.
-   No utilices servicios externos con datos reales sin aprobación.
-   Incluye pruebas negativas de autorización.

### Diseño

La interfaz debe ser profesional, clara y mobile-first. Prioriza tareas
cotidianas, legibilidad y pocos pasos. Cada pantalla debe tener estados
de carga, error, vacío y éxito. No uses datos ficticios como si fueran
datos reales de clientes.

### Calidad

Al terminar cada etapa: - Ejecuta lint. - Ejecuta comprobación de
tipos. - Ejecuta pruebas relevantes. - Revisa el diff. - Actualiza
documentación. - Informa resultados reales. - Enumera riesgos y trabajo
pendiente.

### Formato de entrega por etapa

Presenta: 1. Objetivo. 2. Decisiones técnicas. 3. Archivos creados o
modificados. 4. Migraciones y cambios de datos. 5. Pruebas ejecutadas y
resultado. 6. Riesgos o limitaciones. 7. Cómo ejecutar y verificar el
resultado. 8. Próximo paso recomendado.

No continúes automáticamente hacia módulos grandes si hay decisiones
críticas pendientes. Empieza inspeccionando el repositorio y proponiendo
el plan; después implementa la primera etapa aprobada.

------------------------------------------------------------------------

# 21. Decisiones que todavía deben confirmarse

Antes de comprometerse con el producto completo, resolver estas
preguntas:

## Negocio

-   ¿Se busca SaaS propio, servicio de automatización o una combinación?
-   ¿Cuál es el tamaño de residencia objetivo?
-   ¿Quién decide la compra?
-   ¿Qué presupuesto mensual es realista?
-   ¿Qué proveedor o proceso reemplazaría, si alguno?
-   ¿Se venderá en una zona inicial o en toda Argentina?

## Producto

-   ¿El problema más importante es el traspaso de turno, las
    incidencias, las familias o la administración?
-   ¿Qué tareas se realizan hoy en papel, planillas o mensajería?
-   ¿El establecimiento ya usa software?
-   ¿Qué información es imprescindible y cuál no debe recopilarse?
-   ¿El portal familiar es una necesidad real o una función posterior?

## Tecnología

Resuelto en 10.10 a 10.17: stack, base de datos (PostgreSQL 18),
autenticación (Better Auth self-hosted), objetivos de disponibilidad y
backups, y uso del VPS para staging y piloto.

Pendiente:

-   ¿En qué región se alojarán los datos en la etapa B? (revisar con
    asesoría la transferencia internacional según la Ley 25.326).
-   ¿Qué proveedor de PostgreSQL gestionado y de S3 se usará en la
    etapa B?
-   ¿Quién opera las copias de seguridad y las restauraciones de prueba
    durante el piloto?
-   ¿Qué presupuesto mensual hay para infraestructura y monitoreo?
-   ¿Las especificaciones del VPS actual alcanzan para la etapa A
    (≥ 4 vCPU, 8 GB)?

## Cumplimiento

-   ¿Qué categorías de datos se tratarán?
-   ¿Quién será responsable del tratamiento?
-   ¿Qué autorizaciones y contratos son necesarios?
-   ¿Qué obligaciones de conservación y eliminación aplican?
-   ¿Qué revisión profesional debe realizarse antes del piloto?
-   ¿Qué exige la normativa de la jurisdicción del cliente para la
    historia clínica digital (firma, conservación, interoperabilidad)?
-   ¿Qué registros exige la normativa para medicamentos controlados?

## Ingreso en Mis Nonos

-   ¿Cuál es el teléfono de Medicardio y el número de cliente o
    contrato que hay que dar al llamar?
-   ¿Qué documentos se piden en un ingreso privado (sin PAMI)? ¿Hay
    contrato o reglamento distinto?
-   ¿Quién carga el ingreso (administración, dirección) y quién puede
    ver las fotos de los documentos?
-   ¿Se quiere en algún momento firmar la ficha de ingreso y las
    obligaciones en pantalla, o siempre en papel? (los formularios de
    PAMI seguirían en papel).
-   ¿Existe una hoja de historia clínica o de evolución en papel? Sirve
    de modelo para la fase 4.

## Salud y medicación

-   ¿Quién puede crear y validar indicaciones (solo médico, también
    enfermería por orden verbal con validación posterior)?
-   ¿El sistema reemplaza la hoja de indicaciones y la planilla de
    enfermería en papel o las complementa durante un período?
-   ¿Qué medicamentos requieren doble verificación?
-   ¿De quién es la medicación (familia, obra social, residencia) y quién
    repone?
-   ¿Se controla también el stock de insumos (pañales, apósitos)?
-   ¿Qué signos vitales y escalas usa la institución?
-   ¿Los profesionales externos tendrán usuario o se cargará lo que
    informen?

## Personal

-   ¿Qué documentos de empleados se controlan y con qué vencimientos?
-   ¿Cómo se registra hoy la asistencia (reloj, planilla)? ¿Hay que
    integrarse o reemplazarlo?
-   ¿La ficha de emergencia es visible para todo el personal o mediante
    acceso de emergencia?

No resolver estas preguntas por intuición si pueden afectar seguridad,
costos o viabilidad comercial.

------------------------------------------------------------------------

# 22. Criterios para decidir si continuar

Continuar invirtiendo si: - Varias instituciones describen el mismo
problema. - El problema ocurre con frecuencia. - Tiene consecuencias
operativas o económicas apreciables. - Los usuarios entienden y pueden
usar el prototipo. - La institución acepta participar en un piloto. -
Existe disposición real a pagar. - El alcance puede resolverse con un
nivel de riesgo razonable. - La solución no requiere reemplazar todo el
sistema existente para aportar valor.

Replantear el producto si: - Cada residencia requiere un producto
completamente distinto. - Nadie considera el problema prioritario. - Las
instituciones no quieren cambiar el proceso. - El costo de
implementación supera el valor esperado. - Los requisitos legales o de
seguridad no pueden satisfacerse con los recursos disponibles. - El
módulo elegido no tiene suficiente valor por sí solo.

------------------------------------------------------------------------

# 23. Conclusión y recomendación final

Residencia360 debe comenzar como una hipótesis de negocio, no como una
plataforma completa que se construye por entusiasmo técnico.

La mejor secuencia es:

1.  Hablar con instituciones reales.
2.  Elegir un problema específico.
3.  Diseñar un prototipo.
4.  Validar la experiencia.
5.  Construir un MVP pequeño y seguro.
6.  Probarlo con datos ficticios.
7.  Preparar un piloto con autorizaciones y controles adecuados.
8.  Medir el impacto.
9.  Conseguir los primeros clientes pagos.
10. Expandir solo cuando los patrones de uso lo justifiquen.

La IA puede acelerar mucho el diseño, la programación, las pruebas y la
documentación. Pero la validación comercial, la responsabilidad sobre
los datos, las decisiones de producto y la comprobación de que el
sistema funciona siguen siendo esenciales.

**Regla central del proyecto:** construir primero lo que una residencia
necesita y está dispuesta a pagar, no todo lo que técnicamente sea
posible construir.

La visión es digitalizar todo el geriátrico. El camino es: fase 1 en uso
diario, fases 2 a 4 con revisión legal y validación profesional donde
toquen datos clínicos, y luego el resto según demanda. Cada registro, en todas las fases, con autor, fecha
y hora, y sin borrados silenciosos.

------------------------------------------------------------------------

# Apéndice A --- Checklist de seguimiento

Cada ítem tiene un identificador para usar en issues, commits y
reportes de avance (por ejemplo, `F3-MED-03`). Marcar `[x]` al
completar, con fecha y enlace al PR. La IA de desarrollo debe actualizar
este checklist al cerrar cada tarea.

### F0 — Discovery y negocio

-   [ ] F0-01 Entrevistas a 5–10 residencias.
-   [ ] F0-02 Investigación de competidores.
-   [ ] F0-03 Confirmar alcance del MVP (sección 7.3).
-   [ ] F0-04 Prototipo navegable de fases 1 a 3.
-   [ ] F0-05 Pruebas de prototipo con usuarios reales.
-   [ ] F0-06 Respuestas a las decisiones pendientes (sección 21).
-   [ ] F0-07 Revisión legal inicial (datos personales y de salud).

### F1 — MVP: base técnica y cimientos de escala

-   [x] F1-BASE-01 Repositorio, estructura por módulos, lint, tipos.
    (01/11/2026, repositorio local, sin PR)
-   [ ] F1-BASE-02 Entornos (dev, staging, prod) y secretos.
-   [x] F1-BASE-03 Migraciones versionadas. (01/11/2026, repositorio local, sin PR)
-   [x] F1-BASE-04 Autenticación. (01/11/2026, repositorio local, sin PR)
-   [x] F1-ESC-01 Organizaciones y sedes (`site_id` en tablas operativas). (01/11/2026, repositorio local, sin PR)
-   [x] F1-ESC-02 Row Level Security por organización. (01/11/2026, repositorio local, sin PR)
-   [x] F1-ESC-03 Módulos activables por organización. (01/11/2026, repositorio local, sin PR)
-   [x] F1-ESC-04 Roles y permisos como datos + `can()` en servidor. (01/11/2026, repositorio local, sin PR)
-   [x] F1-ESC-05 Auditoría genérica. (01/11/2026, repositorio local, sin PR)
-   [x] F1-ESC-06 Eventos de dominio (outbox). (01/11/2026, repositorio local, sin PR)
-   [x] F1-ESC-07 Almacenamiento de archivos con acceso firmado. (02/11/2026, repositorio local, sin PR)
-   [x] F1-ESC-08 Observabilidad (logs sin datos sensibles, errores,
    disponibilidad). (01/11/2026, repositorio local, sin PR;
    docs/decisions/0005. El monitoreo externo y Sentry siguen en
    F1-PROD-03)
-   [ ] F1-ESC-09 Exportación por organización.
-   [ ] F1-BASE-05 Pipeline de despliegue.
-   [x] F1-STK-01 Versiones exactas fijadas y registradas.
    (01/11/2026, docs/decisions/0001)
-   [x] F1-STK-02 Better Auth con sesiones en base y 2FA para admin. (01/11/2026, repositorio local, sin PR)
-   [ ] F1-STK-03 PgBouncer y rol de app sin `BYPASSRLS`.
-   [ ] F1-STK-04 Particionado mensual de `audit_events` y `domain_events`.
-   [x] F1-STK-05 Búsqueda con `pg_trgm` + `unaccent`. (02/11/2026, repositorio local, sin PR)
-   [ ] F1-STK-06 Paginación por cursor e idempotencia en escrituras.
-   [ ] F1-STK-07 Seguridad HTTP (CSP, HSTS, cookies) y límite de pedidos.
-   [ ] F1-PROD-01 Docker Compose de etapa A y hardening del VPS.
-   [ ] F1-PROD-02 Backups con recuperación a un punto en el tiempo y restauración probada.
-   [ ] F1-PROD-03 Sentry, logs sin datos sensibles, métricas y uptime.
-   [ ] F1-PROD-04 Seed sintético "Escala" y pruebas k6 aprobadas.
-   [x] F1-PROD-05 Manuales de incidentes escritos. (01/11/2026,
    repositorio local, sin PR; docs/runbooks/. Falta practicarlos en
    staging)

### F1 — MVP: funcionalidades

-   [x] F1-USR-01 Invitación, roles y desactivación de usuarios. (01/11/2026, repositorio local, sin PR)
-   [x] F1-USR-02 Perfil básico de empleado. (01/11/2026, repositorio local, sin PR)
-   [x] F1-CFG-01 Datos de la institución, turnos y categorías. (01/11/2026, repositorio local, sin PR)
-   [x] F1-RES-01 Ficha personal del residente. (02/11/2026, repositorio local, sin PR)
-   [x] F1-RES-02 Cobertura de salud. (02/11/2026, repositorio local, sin PR)
-   [x] F1-RES-03 Alergias e indicaciones especiales. (02/11/2026, repositorio local, sin PR)
-   [x] F1-RES-04 Contactos familiares y de emergencia. (02/11/2026, repositorio local, sin PR)
-   [x] F1-RES-05 Egreso sin borrado. (02/11/2026, repositorio local, sin PR)
-   [x] F1-ING-01 Ingreso guiado en 4 pasos con borrador. (02/11/2026, repositorio local, sin PR)
-   [x] F1-ING-02 Responsable de la internación (único por paciente). (02/11/2026, repositorio local, sin PR)
-   [x] F1-ING-03 Catálogo de documentos por modalidad. (02/11/2026, repositorio local, sin PR)
-   [x] F1-ING-04 Legajo documental con fotos privadas y auditadas. (02/11/2026, repositorio local, sin PR)
-   [x] F1-CFG-02 Servicio de emergencias y reglas de la residencia. (01/11/2026, repositorio local, sin PR)
-   [x] F1-EMG-01 Ficha de emergencia con "Llamar". (02/11/2026, repositorio local, sin PR)
-   [x] F1-EMG-02 Hoja de derivación PDF. (02/11/2026, repositorio local, sin PR)
-   [x] F1-EMG-03 Auditoría de aperturas y PDFs. (02/11/2026, repositorio local, sin PR)
-   [x] F1-NOV-01 Novedades con categorías y versiones. (02/11/2026, repositorio local, sin PR)
-   [x] F1-NOV-02 Seguimiento simple (abierta/resuelta). (02/11/2026, repositorio local, sin PR)
-   [x] F1-TUR-01 Traspaso de turno. (02/11/2026, repositorio local, sin PR)
-   [x] F1-DIR-01 Inicio de personal y de dirección. (02/11/2026, repositorio local, sin PR; sin las tarjetas de solicitudes y abonos, que llegan con esos módulos)
-   [x] F1-SOL-01 Bandeja de solicitudes de ingreso y carga manual. (02/11/2026, repositorio local, sin PR)
-   [x] F1-SOL-02 Conversión de una solicitud en ingreso guiado. (02/11/2026, repositorio local, sin PR)
-   [x] F1-SOL-03 Protección del formulario público (rol solo de
    inserción, límites, captcha, consentimiento y borrado por plazo). (02/11/2026, repositorio local, sin PR; sin captcha por ahora (DC-15): campo oculto, sello con hora y límites por IP y por residencia)
-   [x] F1-SOL-04 Landing pública con el formulario (última tarea del
    MVP). (02/11/2026, repositorio local, sin PR; se publica desde Configuración y no se comparte hasta que el abogado revise el aviso de privacidad)
-   [x] F1-FEE-01 Abono mensual en el ingreso y cambio de precio con
    historial. (02/11/2026, repositorio local, sin PR)
-   [x] F1-FEE-02 Cuotas mensuales y registro de pagos. (02/11/2026, repositorio local, sin PR)
-   [x] F1-FEE-03 Aviso de vencimiento 7 días antes a Administración y
    Dirección. (02/11/2026, repositorio local, sin PR)
-   [x] F1-NOT-01 Notificaciones dentro de la app y por email. (02/11/2026, repositorio local, sin PR)
-   [x] F1-ONB-01 Guía de uso de la primera vez: bienvenida según el rol, consejos por pantalla, puesta en marcha de Administración y "Volver a ver la guía". (02/11/2026, repositorio local, sin PR)

### F1 — MVP: calidad y piloto

-   [ ] F1-QA-01 Pruebas unitarias e integración.
-   [ ] F1-QA-02 Pruebas negativas de autorización (A/B).
-   [ ] F1-QA-03 Pruebas end-to-end de flujos clave.
-   [ ] F1-QA-04 Prueba en teléfonos Android comunes.
-   [ ] F1-QA-05 Backups y prueba de restauración.
-   [ ] F1-PIL-01 Piloto del MVP y evaluación.
-   [ ] F1-COM-01 Primeros clientes pagos.

### F2 — Seguimiento del cuidado

-   [ ] F2-TAR-01 Tareas con responsable, vencimiento y recurrencia.
-   [ ] F2-INC-01 Incidencias con tipos configurables.
-   [x] F2-INC-02 "Registrar emergencia" desde la ficha (registro de emergencias, 0017).
-   [ ] F2-NOV-01 Conversión de novedades en tareas/incidencias.
-   [ ] F2-CT-01 Equipo tratante y profesionales externos (profesionales y especialidades hechos, 0017; falta el equipo por paciente).
-   [x] F2-ENC-01 Atenciones y visitas profesionales, incluida enfermería (0017).
-   [ ] F2-ENC-02 "Última visita" por tipo y visitas atrasadas (última visita y próximos controles hechos, 0017; faltan las atrasadas por frecuencia).
-   [ ] F2-VS-01 Signos vitales y gráficos.
-   [ ] F2-VS-02 Controles programados.

### F3 — Medicación y stock

-   [ ] F3-LEG-01 Revisión legal de datos de salud y controlados.
-   [ ] F3-JOB-01 Trabajos programados en producción.
-   [ ] F3-MED-01 Catálogo de medicamentos.
-   [ ] F3-MED-02 Indicaciones y validación.
-   [ ] F3-MED-03 Plan de administración y medicación del turno.
-   [ ] F3-MED-04 Registro de dosis con estados y motivos.
-   [ ] F3-MED-05 Doble verificación configurable.
-   [ ] F3-STK-01 Libro de movimientos de stock por residente.
-   [ ] F3-STK-02 Consumo automático al administrar.
-   [ ] F3-STK-03 Lotes, vencimientos y alertas.
-   [ ] F3-STK-04 Días restantes y alerta de reposición.
-   [ ] F3-STK-05 Conteos físicos y ajustes.
-   [ ] F3-STK-06 Botiquín de la residencia e insumos.
-   [ ] F3-EMG-01 Medicación activa en la ficha de emergencia.
-   [ ] F3-QA-01 Pruebas de medicación y stock.
-   [ ] F3-PIL-01 Piloto en paralelo con papel.

### F4 — Historia clínica

-   [ ] F4-LEG-01 Revisión legal de historia clínica digital.
-   [ ] F4-HC-01 Antecedentes y diagnósticos.
-   [ ] F4-HC-02 Evoluciones inmutables y enmiendas.
-   [ ] F4-HC-03 Adjuntos con acceso restringido.
-   [ ] F4-HC-04 Línea de tiempo del residente.
-   [ ] F4-HC-05 Exportación de historia clínica.
-   [ ] F4-AUD-01 Auditoría de lecturas clínicas.
-   [ ] F4-EMG-01 Acceso de emergencia (break-glass).

### F5 — Personal

-   [ ] F5-EMP-01 Legajo completo.
-   [ ] F5-EMP-02 Documentación y vencimientos.
-   [ ] F5-EMP-03 Turnos y guardias.
-   [ ] F5-EMP-04 Asistencia.
-   [ ] F5-EMP-05 Reporte "quién estaba de guardia".

### F6 — Familias

-   [ ] F6-FAM-01 Portal familiar con autorizaciones.
-   [ ] F6-FAM-02 Comunicados y actividades.
-   [ ] F6-FAM-03 Visitas.

### F7 — Administración y escala

-   [ ] F7-ADM-01 Habitaciones, camas y ocupación.
-   [ ] F7-ADM-02 Documentos.
-   [ ] F7-ADM-03 Cuotas, pagos y gastos.
-   [ ] F7-ESC-01 Multisede con reportes consolidados.
-   [ ] F7-INT-01 Integraciones según demanda.

# Apéndice B --- Glosario

-   **MVP:** producto mínimo viable; la versión más pequeña que permite
    validar una hipótesis real.
-   **SaaS:** software ofrecido como servicio, normalmente mediante
    suscripción.
-   **Multi-tenant:** arquitectura en la que varias instituciones usan
    el mismo producto con separación estricta de datos.
-   **Autenticación:** verificar la identidad de una persona.
-   **Autorización:** decidir qué recursos y acciones puede utilizar esa
    persona.
-   **Auditoría:** registro de acciones relevantes y cambios.
-   **Traspaso de turno:** proceso por el cual el personal comparte
    información operativa entre turnos.
-   **Piloto:** prueba controlada con una institución para evaluar el
    producto antes de escalar.
-   **Desidentificación:** reducir o eliminar elementos que permiten
    identificar a una persona; no garantiza por sí sola que sea
    imposible reidentificarla.
-   **Monolito modular:** aplicación desplegada como una unidad,
    organizada internamente en módulos con responsabilidades separadas.
-   **Indicación médica:** orden de un profesional habilitado que define
    medicamento, dosis, vía y horarios.
-   **Registro de administración:** constancia de cada dosis dada,
    omitida o rechazada, con quién y cuándo.
-   **SOS / "si necesita":** medicación que se da solo ante un criterio
    escrito por el profesional.
-   **Evolución:** anotación clínica de un profesional sobre el estado
    del residente.
-   **Enmienda:** corrección de un registro clínico que conserva el
    original.
-   **Libro de movimientos:** forma de llevar stock en la que el saldo
    surge de la suma de ingresos y egresos registrados.
-   **Acceso de emergencia (break-glass):** acceso excepcional, auditado,
    a datos críticos para atender una urgencia.
-   **Hoja de derivación:** resumen imprimible del residente para
    entregar a la ambulancia o guardia.
-   **RLS (Row Level Security):** reglas de PostgreSQL que impiden leer
    o escribir filas de otra organización aunque la app tenga un error.
-   **Particionado:** dividir una tabla grande en tablas por mes para
    que las consultas y el archivado sigan siendo rápidos.
-   **Paginación por cursor:** traer la página siguiente a partir del
    último registro visto, en lugar de saltear N filas.
-   **PgBouncer:** intermediario que reparte pocas conexiones de base
    entre muchas instancias de la app.
-   **PITR:** recuperación de la base a un minuto exacto del pasado.
-   **Idempotencia:** repetir un pedido no crea un registro duplicado.
-   **p95:** el 95% de los pedidos tarda menos que ese valor.

# Apéndice C --- Matriz de cobertura de lo pedido

Cómo queda cubierto cada requisito planteado para la versión 2.0.

| Pedido | Estaba en v1.0 | Dónde queda | Fase |
|--------|----------------|-------------|------|
| Digitalizar todo el geriátrico | No (MVP acotado a novedades/tareas) | Secciones 2.2, 7, 8 | 1 a 7 |
| MVP básico y crecimiento gradual | Parcial | Secciones 7.1–7.3, 14 | 1 |
| Que la app pueda escalar | Parcial (monolito modular) | Sección 10.9 | Cimientos en 1 |
| Apartado de empleados con todos cargados | No | 5.9, 6.13, 8.5, 11.2, 12.6 | Básico en 1, completo en 5 |
| Medicación disponible por paciente | No (excluida) | 6.10, 8.10, 8.11 | 3 |
| Stock de medicación de cada residente | No | 8.12, 11.2, 17.5 | 3 |
| Datos personales del residente | Parcial (ficha mínima) | 7.3-C, 8.2, 11.1 | 1 |
| Historia clínica | No (excluida) | 8.8, 12.4 | 4 |
| Profesionales que lo atienden | No | 5.7, 5.10, 8.6 | Médico de cabecera en 1, equipo en 2 |
| Contacto familiar rápido para emergencias | No | 6.9, 8.3, 8.4, 12.7 | 1 |
| Última visita (kinesiólogo, urgencia, enfermero, etc.) | No | 6.11, 8.7 | 2 |
| Que quede todo trackeado | Parcial (auditoría de cambios) | 8.14, 11.4, Apéndice A | 1 en adelante |
| Digitalizar el legajo de ingreso real de Mis Nonos | No | 6.12, 7.3-C2, 11.2, Apéndice E | 1 |
| Stack PostgreSQL + React + Next + Tailwind, robusto para producción y escala | Parcial (recomendación sin detalle) | 10.10 a 10.18, 18, 20 | Cimientos en 1 |
| Solicitud de ingreso desde una landing o cargada a mano en la app | No | 6.12, 7.3-C3, 11.2, 12.9, 17.8 | 1 (la landing al final) |
| Abono mensual con registro de pagos y aviso una semana antes del vencimiento | No (cuotas en la fase 7) | 6.12, 7.3-C4, 11.2, 12.10, 17.9 | 1 |
| Guía de uso (onboarding) para toda la app en los primeros ingresos | No | docs/decisions/0013, Apéndice A (F1-ONB-01) | 1 |

# Apéndice D --- Matriz de permisos por rol (propuesta)

L = lee · E = escribe · V = valida · — = sin acceso · (EM) = solo por
acceso de emergencia. La institución puede restringir más, nunca
ampliar más allá de la normativa.

| Recurso | Dirección | Admin. | Médico | Otros prof. | Enfermería | Cuidador | RRHH |
|---------|-----------|--------|--------|-------------|------------|----------|------|
| Ficha personal | L | L/E | L | L | L | L (básica) | — |
| Contactos | L | L/E | L | L | L/E | L | — |
| Ficha de emergencia | L | L | L | L | L | L o (EM) | — |
| Novedades / tareas | L/E | L/E | L/E | L/E | L/E | L/E | — |
| Incidencias | L/E | L/E | L/E | L/E | L/E | L/E | — |
| Historia clínica | L | — | L/E | L/E (su área) | L/E (enfermería) | — | — |
| Atenciones | L | L | L/E | L/E | L/E | — | — |
| Signos vitales | L | — | L | L | L/E | E (si se habilita) | — |
| Indicaciones de medicación | L | — | L/E/V | — | L | — | — |
| Administración de medicación | L | — | L | — | L/E | L (si se habilita) | — |
| Stock | L | L/E (ingresos) | L | — | L/E | — | — |
| Empleados (legajo) | L | L/E | — | — | — | — | L/E |
| Turnos y asistencia | L | L/E | L (propio) | L (propio) | L (propio) | L (propio) | L/E |
| Usuarios y permisos | L | L/E | — | — | — | — | — |
| Auditoría | L | L | — | — | — | — | — |

# Apéndice E --- Modelo real: legajo de ingreso de Mis Nonos

Basado en los papeles que hoy usa la residencia (vistos como modelo, sin
copiar datos de pacientes reales). No son la historia clínica: son el
legajo administrativo del ingreso.

## E.1 De papel a datos

| Papel | Qué contiene | Dónde queda en la app | Fase |
|-------|--------------|-----------------------|------|
| Ficha de ingreso Mis Nonos SRL | Fecha de internación, institución de referencia; paciente: nombre, edad, nacimiento, DNI, domicilio, obra social o prepaga con N.º; responsable de la internación: parentesco, nombre, DNI, domicilio, teléfono, celular y laboral; teléfonos 2 y 3 de otros familiares | Ingreso pasos 1 y 2; contactos con orden y responsable | 1 |
| Obligaciones de las partes (reglamento) | Servicios del hogar; obligaciones de la familia; regla de la cuota; derecho de admisión; seña y cuota no reembolsables; firma | Documento firmado en el legajo; reglas en Configuración | 1 (cálculo de cuotas en 7) |
| Consentimiento PAMI | Datos del afiliado (nombres, nacimiento, edad, lugar de nacimiento, documento, domicilio, teléfono, N.º de beneficiario); familiar que presta consentimiento con DNI; lugar, fecha y firmas | Documento firmado en el legajo; datos del afiliado en la ficha | 1 |
| Acta compromiso PAMI | Familiar firmante y carácter (hijo/a); compromisos: coseguro, entrega del DNI al establecimiento, entrevista previa con documentación médica o psiquiátrica, turnos y acompañamiento a consultas y estudios, presentarse cuando se lo requiera, pañales, tocador, vestimenta | Documento firmado en el legajo; DNI en custodia; compromisos visibles en "Acordado con la familia" | 1 |

## E.2 Reglas de Mis Nonos y qué módulo las usa

| Regla del reglamento | Uso en la app | Fase |
|----------------------|---------------|------|
| Servicio de emergencia contratado (Medicardio) | Primer botón de la ficha de emergencia | 1 |
| Enfermería permanente | Turnos y traspaso | 1 |
| Control médico semanal | Frecuencia esperada del médico de cabecera y aviso de visita atrasada | 2 |
| Respetar las dietas indicadas | Indicaciones especiales en la ficha; avisos a la familia | 1 |
| La familia provee pañales y medicación mensual o a requerimiento | Stock por paciente con origen "familia" y pedido de reposición al responsable | 3 |
| La familia entrega estudios realizados | Documentos opcionales del legajo (1) y adjuntos clínicos (4) | 1 y 4 |
| La familia pide turnos y acompaña a consultas y estudios externos | Atenciones externas con acompañante y tarea para el responsable | 2 |
| Cuota mes adelantado, vence el día del ingreso de cada mes | Vencimiento del abono por paciente = día de ingreso, con aviso 7 días antes (7.3-C4) | 1 (desde la v2.4; antes, 7) |
| Seña no reembolsable; valor mensual no reembolsable | Texto del reglamento; registro de seña en cuotas | 7 |
| Derecho de admisión | Fuera del sistema (decisión de la dirección) | — |

## E.3 Diseño

El canvas "Mis Nonos — Diseño del MVP" incluye la fila "Ingreso y
legajo — modelo real de Mis Nonos": pasos 1 a 4 del ingreso y la pestaña
Legajo de la ficha, con datos ficticios.

# Apéndice F --- Cierre de brechas antes de codear el MVP

Resultado de revisar este documento (v2.3) y el canvas de diseño entre
el 31/10 y el 01/11/2026. Cada punto "A confirmar" trae una propuesta
por defecto: si nadie la objeta, se usa esa. Las que tocan permisos,
seguridad o datos personales necesitan una confirmación explícita
(sección 19.4). La base técnica (Etapa 2) puede empezar sin esperar
estas decisiones, salvo DC-07 (ver F.9).

## F.1 Decisiones tomadas

| ID | Decisión | Fecha |
|----|----------|-------|
| DT-01 | Se programa solo el MVP (fase 1); las fases 2 a 7 esperan su condición de inicio (7.2) | 31/10/2026 |
| DT-02 | La app es para Mis Nonos ahora y SaaS después: se mantienen los cimientos multi-residencia y se simplifica la infraestructura (F.8) | 31/10/2026 |
| DT-03 | Se aloja en un VPS (etapa A de 10.17) | 31/10/2026 |
| DT-04 | Solicitudes de ingreso con carga manual y landing pública en la misma app; la landing se construye al final (7.3-C3) | 01/11/2026 |
| DT-05 | Abono mensual con registro de pagos y aviso 7 días antes del vencimiento a Administración y Dirección, en la app y por email (7.3-C4) | 01/11/2026 |

## F.2 Decisiones a confirmar

| ID | Tema | Opciones | Propuesta | Estado |
|----|------|----------|-----------|--------|
| DC-01 | Permisos del MVP: el Apéndice D y el diseño no coinciden | Seguir el Apéndice D; seguir el diseño; combinar | La matriz de F.3 | Confirmada (01/11/2026): la matriz de F.3 |
| DC-02 | Notificaciones además de las del abono y las solicitudes | Ninguna; seguimiento asignado; turno entregado; ficha de emergencia abierta; push en el teléfono | En la app: seguimiento asignado (si se adopta DC-03) y ficha de emergencia abierta (a Dirección); sin push en el MVP | Confirmada (01/11/2026): solo "ficha de emergencia abierta", a Dirección, en la app |
| DC-03 | Asignar un responsable a una novedad con seguimiento | No; opcional | Opcional: si no se asigna, la ve todo el turno | Confirmada (01/11/2026): no se asigna; los seguimientos los ve todo el turno |
| DC-04 | Qué guarda la auditoría | Solo metadatos; valores anteriores y nuevos | Valores anteriores y nuevos de los campos que cambian, protegidos por RLS y visibles según F.3; los logs técnicos nunca guardan datos personales | Confirmada (01/11/2026): valores anteriores y nuevos |
| DC-05 | Turno habitual del empleado ("Turno mañana", "En turno ahora") | Agregarlo a la membresía; sacarlo del diseño | Agregar `usual_shift_id` opcional a la membresía | A confirmar |
| DC-06 | Novedades de las últimas 24 h en la hoja de derivación | Incluirlas; no incluirlas | No incluirlas por defecto (8.4); que cada sede pueda activarlas | A confirmar |
| DC-07 | Cómo se usa Better Auth | Solo identidad, sesiones y 2FA; también su plugin de organizaciones | Solo identidad, sesiones y 2FA; organizaciones, membresías, invitaciones y roles en tablas propias (encaja con RLS y E4) | Aceptada sin objeciones (01/11/2026); docs/decisions/0003 |
| DC-08 | Almacenamiento de archivos (MinIO ya no se mantiene) | Disco local detrás de la interfaz (E12); Garage autoalojado; S3 gestionado | Disco local en el VPS detrás de la interfaz, con backup cifrado fuera del servidor; S3 gestionado en la etapa B | Confirmada (01/11/2026): disco del VPS con copia cifrada fuera del servidor |
| DC-09 | Marca del producto y dominio | Residencia360 u otro nombre; dominio de la residencia | Marca del producto aparte de "Mis Nonos"; landing en el dominio principal y app en un subdominio (por ejemplo, `app.`) | A confirmar |
| DC-10 | Duración de la sesión | Corta; larga; según la casilla "Mantener sesión" | 12 h sin la casilla y 14 días con ella; Administración y Dirección cierran por inactividad a las 8 h | Confirmada (01/11/2026) |
| DC-11 | Personal sin email | Exigir email; usuario y contraseña | Usuario y contraseña creados por Administración, que también los restablece | Confirmada (01/11/2026) |
| DC-12 | Alta de la residencia y del primer administrador | Script; panel de plataforma | Script de línea de comandos, con registro en la auditoría | Aceptada sin objeciones (01/11/2026); `corepack pnpm org:create` |
| DC-13 | "Nuevo paciente" y el ingreso guiado | Mantener los dos; solo el ingreso guiado | Solo el ingreso guiado crea pacientes; `PacienteForm` pasa a ser "Editar paciente" | A confirmar |
| DC-14 | Solicitudes: plazo de borrado de las no convertidas | 6, 12 o 24 meses | 12 meses desde la última actividad, a confirmar con el abogado | Confirmada (02/11/2026): 12 meses; el plazo se revisa con el abogado antes de publicar la landing |
| DC-15 | Solicitudes: captcha | ALTCHA; Cloudflare Turnstile; ninguno | ALTCHA autoalojado, más campo oculto y límites de envío | Confirmada (02/11/2026): por ahora sin captcha; campo oculto, sello con hora y límites de envío (docs/decisions/0016) |
| DC-16 | Solicitudes: email de confirmación a la familia | Sí; no | Sí, genérico y solo si la familia deja un email | Aplicada la propuesta (02/11/2026), a confirmar |
| DC-17 | Solicitudes: campos obligatorios del formulario público | Mínimos; todos los de los pasos 1 y 2 | Nombre y apellido, fecha de nacimiento, modalidad, y nombre y teléfono del responsable; el resto, opcional | Aplicada la propuesta (02/11/2026), a confirmar |
| DC-18 | Solicitudes: estados | Los de 7.3-C3; sin "en espera" | Los de 7.3-C3 | Confirmada (02/11/2026): la propuesta |
| DC-19 | Landing: textos, fotos y datos de contacto | No aplica | Los provee Mis Nonos; sin fotos de residentes | Pendiente de contenido: la presentación se escribe en Configuración › Formulario público; sin fotos |
| DC-20 | Abono: pagos parciales | Sí; no | Sí, con saldo | Confirmada (02/11/2026): la propuesta |
| DC-21 | Abono: medios de pago | Lista fija; configurable por sede | Efectivo, transferencia y otro, configurables por sede | Confirmada (02/11/2026): la propuesta |
| DC-22 | Abono: monto 0 e "internado fuera" | No aplica | Monto 0 permitido, sin avisos; "internado fuera" sigue generando cuotas | Confirmada (02/11/2026): la propuesta |
| DC-23 | Abono: avisos además del de 7 días | Ninguno; el día del vencimiento; cuando queda vencida | Ninguno: las vencidas se ven en el Inicio y en la lista "Abonos" | Confirmada (02/11/2026): la propuesta |
| DC-24 | Abono: constancia de pago imprimible (no fiscal) | Sí; no | No en el MVP | Confirmada (02/11/2026): la propuesta |
| DC-25 | Ubicación del VPS y de los backups | Argentina; otro país | Definirla con el abogado antes de cargar datos reales (12.2) | A confirmar |

## F.3 Matriz de permisos del MVP (propuesta)

Reemplaza al Apéndice D para la fase 1. ✓ = sí; — = no. Administración
y Dirección usan 2FA obligatoria (10.10). Los números entre paréntesis
remiten a las notas de abajo, que marcan dónde la propuesta se aparta
del Apéndice D o del diseño.

| Permiso | Qué permite | Admin. | Dirección | Enfermería | Cuidador/a |
|---------|-------------|--------|-----------|------------|------------|
| `residents.read` | Ver la lista y la ficha del paciente | ✓ | ✓ | ✓ | ✓ (5) |
| `residents.update` | Editar datos, cobertura, alergias, indicaciones y médico de cabecera | ✓ | ✓ (4) | ✓ (1) | — |
| `residents.status` | Marcar "internado fuera" y volver a "activo" | ✓ | ✓ | ✓ | — |
| `residents.discharge` | Registrar el egreso | ✓ | ✓ | — | — |
| `admissions.manage` | Hacer, retomar y confirmar ingresos guiados | ✓ | ✓ | — | — |
| `admission_requests.manage` | Cargar, gestionar y convertir solicitudes de ingreso | ✓ | ✓ | — | — |
| `documents.files` | Ver, subir y reemplazar las fotos del legajo | ✓ | ✓ | — | — |
| `contacts.manage` | Agregar, editar y ordenar contactos | ✓ | ✓ | ✓ | — |
| `emergency.view` | Abrir la ficha de emergencia | ✓ | ✓ | ✓ | ✓ |
| `emergency.pdf` | Generar la hoja de derivación | ✓ | ✓ | ✓ | ✓ |
| `notes.create` | Registrar novedades | ✓ | ✓ | ✓ | ✓ |
| `notes.edit_own` | Corregir las novedades propias (nueva versión) | ✓ | ✓ | ✓ | ✓ |
| `notes.resolve` | Resolver seguimientos | ✓ | ✓ | ✓ | ✓ |
| `handover.deliver` | Entregar el turno | — | ✓ | ✓ | ✓ |
| `handover.confirm` | Confirmar la recepción del turno | — | ✓ | ✓ | ✓ |
| `staff.read` | Ver empleados (nombre, rol y teléfono) | ✓ | ✓ | ✓ | ✓ |
| `users.manage` | Invitar, cambiar el rol y desactivar usuarios | ✓ | — (2) | — | — |
| `settings.manage` | Datos de la residencia, turnos, categorías, documentos y aviso del abono | ✓ | — | — | — |
| `fees.read` | Ver abonos, cuotas y pagos | ✓ | ✓ | — | — |
| `fees.manage` | Fijar precios y registrar o anular pagos | ✓ | ✓ | — | — |
| `audit.read_resident` | Ver el historial de cambios de un paciente y de sus novedades | ✓ | ✓ | ✓ (3) | ✓ (3) |
| `audit.read_all` | Ver toda la actividad, incluidas las aperturas de la ficha de emergencia y de las fotos | ✓ | ✓ | — | — |
| `org.export` | Exportar los datos de la residencia (E14) | ✓ | ✓ | — | — |

Notas:

1.  El Apéndice D da a Enfermería solo lectura de la ficha personal; el
    diseño ("Invitar usuario") dice que la edita. Se propone seguir al
    diseño.
2.  El diseño dice que Dirección puede "todo"; el Apéndice D le da solo
    lectura de usuarios y permisos. Se propone seguir al Apéndice D.
3.  El Apéndice D reserva la auditoría a Administración y Dirección; el
    diseño muestra "ver cambios" y Actividad a todo el personal. Se
    propone que el historial de un paciente lo vea quien puede ver al
    paciente, y que la actividad completa la vean solo Administración y
    Dirección.
4.  El Apéndice D da a Dirección solo lectura de la ficha personal; el
    diseño, todo. Se propone que pueda editar.
5.  El Apéndice D habla de una ficha "básica" para Cuidador/a. Como la
    ficha de emergencia ya muestra DNI y cobertura, se propone la misma
    ficha, con el legajo sin fotos (las fotos exigen `documents.files`).

## F.4 Reglas de negocio propuestas (a confirmar)

**Traspaso de turno** (confirmadas el 01/11/2026)

-   El turno actual sale del reloj y de los turnos de la sede (no hay
    asignación de turnos hasta la fase 5). El turno noche se identifica
    por la fecha en que empieza.
-   Hay una entrega por turno y por sede. La registra cualquier usuario
    con `handover.deliver`, desde 1 h antes hasta 2 h después del fin
    del turno; si otra persona la completa, queda como nueva versión de
    la nota.
-   Si nadie entrega, el turno siguiente ve igual el resumen, marcado
    "sin entrega".
-   La confirmación de recepción es opcional y se activa por sede
    (`handover_requires_confirmation`); confirma cualquier usuario del
    turno entrante con `handover.confirm`.
-   El resumen incluye las novedades creadas dentro del horario del
    turno y los seguimientos abiertos al momento de la entrega.

**Novedades** (confirmadas el 01/11/2026)

-   Solo el autor corrige su novedad, hasta 24 h después de crearla;
    cada corrección es una versión nueva (`note_versions`).
-   Resuelve cualquier usuario con `notes.resolve`; el comentario al
    resolver es opcional y se guardan quién y cuándo.
-   "General" es una opción fija al elegir el residente.
-   Responsable asignado: según DC-03 (confirmada: no se asigna).

**Ingreso en borrador**

-   El paso 1 crea el paciente con estado `admission_draft`, que no
    aparece en listas, búsqueda, emergencia ni traspaso.
-   Los borradores se retoman desde "Ingresos en curso", dentro de
    Pacientes, para quienes tienen `admissions.manage`.
-   Un borrador se puede cancelar (`admission_cancelled`); no se borra.

**Egreso y estados**

-   "Registrar egreso": motivo (alta, traslado, fallecimiento u otro),
    fecha y observación. El paciente deja de aparecer entre los
    activos, en emergencia y en el traspaso; se conservan sus datos y
    contactos, y dejan de generarse cuotas.
-   "Internado fuera": lugar y fecha; vuelve a "activo" con fecha. Todo
    queda en la auditoría.

**Sesión y acceso**

-   Duración de la sesión según DC-10 y acceso sin email según DC-11.
-   2FA obligatoria para Administración y Dirección, con códigos de
    respaldo.
-   Enlace de recuperación de contraseña: 30 minutos. Invitación: 72
    horas (según el diseño).

## F.5 Agregados al modelo de datos

-   `files`: `storage_key`, `mime_type`, `size_bytes`, `sha256`,
    `uploaded_by`, `created_at` (más `organization_id` y `site_id`). Se
    valida el tipo real del archivo, no la extensión.
-   `resident_document_files`: `document_id`, `file_id`, `position`.
    Permite varias fotos por documento (DNI frente y dorso, reglamentos
    de varias hojas) y reemplaza el `file_id` único de
    `resident_documents`.
-   `shifts`: `name`, `starts_at` y `ends_at` (horas), `position`,
    `active`.
-   `shift_handovers`: `shift_id`, `shift_date`, `delivered_by`,
    `delivered_at`, `note`, `confirmed_by` nullable, `confirmed_at`
    nullable, `version`.
-   `note_categories`: `name`, `position`, `active`.
-   `note_versions`: `note_id`, `version`, `content`, `category_id`,
    `edited_by`, `edited_at`. `resident_notes` guarda la versión vigente
    y `resolved_by`, `resolved_at` y `resolution_note`.
-   `invitations`: `email`, `role_id`, `token_hash`, `expires_at` (72
    h), `invited_by`, `accepted_at` nullable, `revoked_at` nullable.
-   `residents.status` suma `admission_draft` y `admission_cancelled`
    (F.4).
-   `organization_memberships`: `usual_shift_id` nullable (si se
    confirma DC-05).
-   `sites` o `site_settings`: `phone`, `emergency_service_account`
    (N.º de cliente de Medicardio) y `handover_requires_confirmation`,
    además de los campos de solicitudes y abono de 11.2.
-   Tablas de solicitudes, abono, pagos y notificaciones: ver 11.2.

## F.6 Pantallas sin diseño

**Prioridad A** (tienen reglas propias: conviene diseñarlas o
especificarlas antes de programarlas):

-   Aceptar invitación y crear contraseña.
-   Nueva contraseña (desde el email de recuperación).
-   Activar 2FA (QR y códigos de respaldo) y pedir el código al
    ingresar.
-   Elegir residente en "Nueva novedad", con la opción "General".
-   Detalle de novedad: corregir, resolver y ver cambios.
-   Recepción del turno e historial de traspasos.
-   Egreso y cambio de estado del paciente.
-   Foto de documento: cámara, varias fotos, visor auditado y reemplazo.
-   Ingresos en curso (borradores).
-   Acciones sobre un usuario: cambiar el rol, desactivar y reenviar la
    invitación.
-   Inicio de Administración y Dirección: solicitudes nuevas, abonos por
    vencer y vencidos, documentos faltantes y actividad.
-   Solicitudes: bandeja, detalle (convertir y descartar) y "Nueva
    solicitud".
-   Abono: campos en el paso 4 del ingreso, sección "Abono" de la ficha,
    lista "Abonos" (base: "Cuotas" de la fase 7) y "Registrar pago".
-   Landing pública, formulario en 2 pasos y confirmación (se hacen al
    final).

**Prioridad B** (se arman con componentes de shadcn, sin diseño previo):

-   Perfil y cambio de contraseña.
-   Configuración: residencia y servicio de emergencias, turnos,
    categorías, documentos por modalidad y días de aviso del abono.
-   Búsqueda global.
-   Versiones de escritorio de las pantallas móviles.
-   Errores 403, 404 y sesión vencida.

## F.7 Pantallas a actualizar

-   Ficha de escritorio y hoja de derivación: "responsable de la
    internación" en lugar de "referente legal", modalidad y N.º de
    beneficiario PAMI. La ficha de escritorio suma la pestaña Legajo.
-   `PacienteForm`: pasa a ser "Editar paciente", con los campos de la
    v2.2 (DC-13).
-   Contacto: responsable (con DNI y domicilio), celular, teléfono
    laboral, WhatsApp, autorizaciones (recibe información, retira,
    paga) y fecha de verificación.
-   Alergias con "reacción"; nombre y apellido en campos separados en el
    ingreso; médico de cabecera con nombre y teléfono por separado.
-   Mismas pestañas de la ficha en móvil y en escritorio: Resumen,
    Contactos, Novedades, Legajo, Abono (con permiso) y Actividad.
-   El nombre de la residencia sale de la organización; la marca del
    producto va aparte (DC-09).
-   Menú "Más": Usuarios y roles, Configuración y Abonos aparecen solo
    con permiso.

## F.8 Perfil de despliegue en el VPS (etapa A simplificada)

Servicios en Docker Compose: proxy (Caddy, o Nginx si se prefiere),
Next.js (app y landing en el mismo contenedor), worker de pg-boss y
PostgreSQL 18. Los archivos van a disco local detrás de la interfaz de
almacenamiento (DC-08).

| Mantener desde el día 1 (barato ahora, caro después) | Postergar hasta tener más residencias |
|------------------------------------------------------|---------------------------------------|
| `organization_id` y `site_id`, RLS, UUIDv7, permisos como datos con `can()`, `audit_events`, `domain_events`, interfaz de almacenamiento, `timestamptz`, idempotencia, migraciones versionadas, `organization_modules` | PgBouncer (con una sola instancia de la app), `pg_partman` (particionado nativo con un trabajo mensual, o ninguno con ~0,5 GB por año), 2 o más instancias, OpenTelemetry, Prometheus y Grafana, seed y pruebas de carga de 1.000 residencias (hacerlas a escala de piloto, con el doble del pico) |

Lista para el VPS:

-   Ubicación del VPS y de los backups definida con el abogado (DC-25).
-   Especificaciones: al menos 4 vCPU y 8 GB, y disco suficiente para
    las fotos.
-   Staging separado de producción: otro VPS chico o, como mínimo, otro
    proyecto de Compose con otra base y otros secretos.
-   Dominio: landing en el dominio principal y app en un subdominio, con
    certificados automáticos.
-   Email transaccional con SPF, DKIM y DMARC: invitaciones,
    recuperación de contraseña y avisos del abono y de solicitudes.
-   Secretos fuera del repositorio: en el VPS, un archivo de entorno que
    solo puede leer el usuario de despliegue, o cargados desde GitHub
    Actions en cada deploy.
-   Deploy: GitHub Actions construye la imagen, la sube a GHCR, corre
    las migraciones y actualiza el VPS por SSH con `docker compose`.
    Volver atrás es desplegar la etiqueta anterior.
-   Backups: PostgreSQL con WAL continuo (pgBackRest o WAL-G) y
    **también las fotos** (por ejemplo, con restic), cifrados y fuera
    del servidor. Restauración de prueba mensual de ambos.
-   Monitoreo: Sentry sin datos personales, un chequeo de disponibilidad
    que corra fuera del VPS y alertas de disco.
-   Hardening de 10.8: SSH solo con claves, firewall, actualizaciones
    automáticas de seguridad, base no expuesta y contenedores sin root.
-   El worker y el email son obligatorios en el MVP.

Manuales a escribir (F1-PROD-05): caída de la base, restauración de la
base y de las fotos, rotación de secretos, incidente con datos
personales, y deploy y vuelta atrás.

## F.9 Qué puede empezar ya y qué espera decisiones

Puede empezar ya (Etapa 2, base técnica):

-   Repositorio, TypeScript estricto, lint, CI y Docker Compose.
-   Organizaciones, sedes y membresías, con RLS y sus pruebas.
-   Autenticación con Better Auth, una vez confirmada DC-07.
-   Mecanismo de permisos (`can()` y sus tablas), auditoría genérica y
    eventos de dominio.
-   Interfaz de almacenamiento con un adaptador de disco local.
-   Worker de pg-boss y envío de email detrás de una interfaz.

Espera decisiones:

-   La matriz de permisos (DC-01), antes de cerrar cualquier pantalla.
-   Las reglas de traspaso y de novedades (F.4), antes de esos módulos.
-   Las pantallas de prioridad A (F.6), antes de programar cada una.
-   El almacenamiento (DC-08) y la ubicación de los datos (DC-25), antes
    de cargar datos reales.
-   El aviso de privacidad del abogado, antes de publicar la landing.
