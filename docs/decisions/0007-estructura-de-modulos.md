# 0007 — Estructura de los módulos, formularios y pruebas de punta a punta

- **Fecha:** 01/11/2026
- **Estado:** aceptada.
- **Contexto:** Etapa 3.1 (marco de la app, usuarios, empleados, perfil y
  configuración). Secciones 10.9 (E5, E13), 13.2 y 18 del plan. DC-02,
  DC-03 y las reglas de F.4 se confirmaron el 01/11/2026.

## Decisiones

1. **Un módulo por carpeta en `features/<módulo>`** (E5):
   - `schemas.ts`: validación con Zod, la misma en el servidor y el navegador;
   - `queries.ts`: lecturas;
   - `service.ts`: reglas de negocio, escrituras y auditoría.

   Reciben la transacción de `withTenant` y no importan `server-only`, así
   las prueban las de integración. Las Server Actions viven junto a cada
   pantalla, en `app/`.

2. **Envoltorio común de las Server Actions** (`lib/actions.ts`,
   `runAction`). En cada acción:
   - vuelve a exigir la sesión y el permiso con `can()`;
   - aplica el tope de escrituras por persona: 60 por minuto (10.14);
   - muestra tal cual los errores de negocio (`DomainError`);
   - registra los demás errores sin datos personales y muestra un mensaje
     genérico.

3. **Formularios con Server Actions y `useActionState`, sin React Hook
   Form.** El plan nombra React Hook Form (10.10). Se deja de lado porque:
   - con Server Actions, el formulario funciona aunque el JavaScript no
     haya cargado;
   - suma menos JavaScript en el teléfono;
   - el servidor valida igual con el mismo esquema Zod, devuelve los errores
     por campo y conserva lo escrito.

   Se puede sumar si un formulario lo necesita (por ejemplo, el ingreso en
   4 pasos).

4. **Navegación según permisos** (`components/layout/nav-items.ts`).
   - Se muestra solo lo que la persona puede usar y lo que ya funciona
     (13.2).
   - En escritorio, menú lateral; en el teléfono, barra inferior y "Más".
   - Mientras falta un paso obligatorio (contraseña provisoria o 2FA), solo
     se ve ese paso.

5. **Personal sin email (DC-11)**:
   - Administración crea el usuario con una contraseña provisoria fácil de
     dictar;
   - al entrar, la persona tiene que elegir una propia
     (`users.password_change_required`);
   - si se la olvida, Administración le da otra provisoria, lo que cierra
     sus sesiones.

6. **Reglas de usuarios:**
   - nadie cambia su propio rol ni se desactiva a sí mismo;
   - siempre queda una persona de Administración activa;
   - desactivar cierra en el momento las sesiones de esa persona en la
     residencia.

7. **Turno actual** (`lib/time`).
   - Se calcula con el reloj, los turnos de la sede y su zona horaria, con
     `Intl` y sin librerías.
   - El turno noche se identifica por la fecha en que empieza (F.4).
   - Los turnos activos no pueden superponerse.
   - Turno habitual de cada persona: opcional, en la membresía (DC-05,
     tomado por defecto).

8. **Catálogos iniciales.** Al dar de alta una residencia se cargan:
   - 3 turnos;
   - 6 categorías de novedades;
   - los 8 documentos del legajo de Mis Nonos (Apéndice E).

   Se cambian desde Configuración; nada se borra, se desactiva.

9. **Pruebas de punta a punta con Playwright 1.64.1** (F1-QA-03), en un
   teléfono emulado.
   - Localmente usan el Edge instalado; en CI, Chromium.
   - Cada prueba crea su propia residencia ficticia.
   - Los resultados van a la carpeta temporal del sistema: dentro del
     proyecto, el servidor de desarrollo los toma como cambios y recarga la
     página sin parar.
   - `CAPTURAS=<carpeta> corepack pnpm test:e2e capturas` genera capturas
     de las pantallas.

10. **Desarrollo local:**
    - la base de este proyecto usa el puerto 5436, porque el 5432 lo
      ocupaban otros proyectos;
    - los emails van a Mailpit.

## Consecuencias

- Cada módulo nuevo sigue esta estructura y suma pruebas de integración
  (reglas y aislamiento entre residencias) y de punta a punta (el flujo en
  el teléfono).
- La navegación crece a medida que cada módulo funciona.
