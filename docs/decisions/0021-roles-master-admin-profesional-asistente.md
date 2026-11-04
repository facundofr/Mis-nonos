# 0021 — Roles: Master, Administración, Profesional y Asistente

- **Fecha:** 04/11/2026
- **Estado:** aceptada. El responsable del proyecto pidió dejar solo cuatro
  roles y quitar Dirección y Enfermería. Reemplaza la matriz de F.3
  (`RESIDENCIA360_CONTEXT.md`, Apéndice F) y los cambios de 0017 y 0020 en
  cuanto a quién tiene cada permiso.

## Decisiones

1. **Los cuatro roles:**
   - **Master:** una sola persona por residencia. Tiene todo lo de
     Administración más el **Registro de cambios** (`audit.master`).
   - **Administración:** la única que edita y gestiona: pacientes,
     contactos, ingresos, solicitudes, legajo, cuotas, personal, usuarios,
     configuración y fichaje. También escribe, registra atenciones y hace
     el traspaso de turno.
   - **Profesional:** escribe sobre los pacientes, pero no edita sus datos.
     Registra novedades y atenciones, hace el traspaso de turno y registra
     emergencias. Lleva su profesión escrita a mano (Kinesiólogo, Médica,
     Nutricionista…); es obligatoria y se puede cambiar.
   - **Asistente:** solo ve los pacientes, su ficha de emergencia y la hoja
     de derivación, ve al personal y ficha con el QR. No carga ni edita
     nada; no ve Turno ni Emergencias en el menú.
2. **Los roles anteriores se pasan solos** (migración 0040):
   - Dirección pasa a Administración;
   - Enfermería pasa a Profesional, con la profesión "Enfermería" si no
     tenía otra;
   - Cuidador/a pasa a llamarse Asistente (misma fila de `roles`, clave
     `asistente`).

   Las invitaciones pendientes se pasan igual. La matriz se borra y se
   vuelve a cargar entera.

3. **El Master no se maneja desde la app:**
   - no aparece entre los roles que se eligen;
   - nadie puede cambiarle el rol, desactivarlo ni darle una contraseña
     provisoria;
   - se asigna con `corepack pnpm user:master`, que recibe el email y la
     contraseña por variables de entorno y nunca los muestra. Si la
     residencia ya tiene otro Master, no hace nada.
4. **Registro de cambios (`/registro`):** muestra todo lo auditado de la
   residencia, con los valores de antes y después.
   - Filtra por persona, tipo de cambio, fechas y nombre.
   - Los tipos son alta, cambio, baja o anulación, y apertura de fichas;
     se deducen de la acción (`features/activity/log-groups.ts`).
   - En la app nada se borra de verdad: anular, descartar, desactivar o
     quitar queda en el registro con quién lo hizo.
   - Los ingresos a la app (inicios de sesión) todavía no se auditan.
5. **2FA y cierre por inactividad:** los tienen Master y Administración.
6. **Avisos:**
   - la apertura de una ficha de emergencia avisa al Master, que antes
     correspondía a Dirección;
   - las solicitudes de ingreso nuevas y las cuotas por vencer avisan a
     Administración y al Master.

## Consecuencias

- Las asistentes ya no cargan novedades ni entregan el turno: el traspaso
  queda en manos de Profesional y Administración.
- El rol se muestra con la profesión ("Profesional · Kinesiólogo") en el
  menú, Personal, Usuarios y Fichaje (`lib/auth/role-label.ts`).
- La prueba unitaria de permisos lee el catálogo de 0005, 0035, 0037 y
  0040, y la matriz solo de 0040.
