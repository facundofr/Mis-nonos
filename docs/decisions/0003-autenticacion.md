# 0003 — Autenticación con Better Auth

- **Fecha:** 01/11/2026
- **Estado:** aceptada. DC-10 y DC-11 confirmadas el 01/11/2026; DC-07 y
  DC-12 aceptadas sin objeciones el mismo día.
- **Contexto:** Etapa 2.3. Secciones 10.10, 10.14, 10.16 y 12 del plan;
  Apéndice F (F.4 y F.6).

## Decisiones

1. **Better Auth solo para identidad, sesiones y 2FA (DC-07).**
   Organizaciones, membresías, roles e invitaciones están en tablas propias
   con RLS. Versión fijada: 1.7.14 (ver 0001).

2. **Sin rutas HTTP de Better Auth.** Las pantallas usan Server Actions que
   llaman a `auth.api` (con el plugin `nextCookies`). No se publica
   `/api/auth/*`: hay menos superficie expuesta.
   - Consecuencia: el límite de intentos de Better Auth vive en su router
     HTTP y no se aplica. Por eso hay límites propios (punto 3).

3. **Límites de intentos propios** (`lib/auth/limiters.ts`), en memoria,
   porque el piloto corre en una sola instancia:
   - Contraseña incorrecta: 5 por cuenta cada 15 minutos (10.14) y 30 por
     IP, más alto porque el personal de una residencia suele compartir la
     conexión.
   - Pedidos de recuperación: 3 por email y 10 por IP cada 15 minutos.
   - Códigos 2FA o enlaces fallidos: 10 por IP cada 15 minutos.
   - Además, Better Auth bloquea la cuenta 15 minutos después de 10 códigos
     2FA incorrectos.

4. **Sesiones (DC-10).** Se guardan en la base, sin caché en cookie: una
   sesión cerrada deja de valer en el pedido siguiente.
   - Con "Mantener sesión en este dispositivo": 14 días, renovables con el
     uso.
   - Sin tildar: 12 h desde el ingreso. Better Auth fija 1 día; un hook al
     crear la sesión la recorta y guarda `absolute_expires_at`. Ese tope se
     conserva cuando Better Auth renueva la sesión (por ejemplo, al activar
     el 2FA).
   - Administración y Dirección: se cierra a las 8 h sin actividad. La
     actividad se anota en `last_active_at` cada 5 minutos como máximo.

5. **Personal sin email (DC-11).** Plugin `username`: minúsculas, números,
   punto y guion bajo, de 3 a 30 caracteres, único en toda la plataforma.
   Better Auth exige un email, así que estas personas tienen uno técnico
   (`usuario@sin-email.invalid`, dominio reservado por la RFC 2606), al que
   nunca se envía correo.

6. **Alta de la residencia (DC-12).** El script `corepack pnpm org:create`
   corre con el rol dueño. Crea la organización, la sede, los módulos
   `core` y `fees`, y una invitación con el rol Administración. Muestra el
   enlace en la terminal.

7. **Invitaciones.**
   - El enlace lleva un token de 256 bits; la base guarda solo su SHA-256.
   - Vencen a las 72 h, y una invitación nueva anula las pendientes del
     mismo email.
   - Quien abre el enlace no tiene sesión: la búsqueda pasa por
     `app.find_invitation`, una función `SECURITY DEFINER` con `search_path`
     fijo que devuelve solo la fila de ese hash.
   - Aceptarla crea, en una sola transacción, el usuario, la contraseña,
     la membresía y el registro de auditoría.
   - Si la persona ya tiene cuenta (por ejemplo, trabaja en otra
     residencia), ingresa y acepta con su sesión.

8. **2FA (TOTP), obligatoria para Administración y Dirección.**
   `requireAppContext()` lleva a `/activar-2fa` hasta que la persona la
   activa.
   - Se activa con el primer código correcto y entrega 10 códigos de
     respaldo.
   - No se ofrece "confiar en este dispositivo".

9. **Contraseñas.**
   - Hash con scrypt de Better Auth; de 10 a 128 caracteres.
   - El enlace de recuperación vence a los 30 minutos y cierra las sesiones
     abiertas de la cuenta.
   - No hay registro público (`disableSignUp`).

10. **Excepciones a RLS y a la regla de no borrar.**
    - `users`, `accounts`, `sessions`, `verifications` y `two_factors` son
      identidad global, sin RLS.
    - `sessions`, `verifications` y `two_factors` admiten `DELETE`, porque
      son credenciales temporales: cerrar la sesión, usar un enlace, rehacer
      el 2FA. `accounts` no lo admite.

11. **Cookies.** Prefijo `r360`, `HttpOnly` y `SameSite=Lax`. Con HTTPS
    son `Secure` y llevan el prefijo `__Secure-`. Valen solo en el host de
    la app, sin compartirse entre subdominios (12.9).

12. **Capa de acceso** (`lib/auth/session.ts`). Cada página y cada Server
    Action llama a `requireAppContext()`, que devuelve la persona, la
    residencia activa, el rol y el contexto para `withTenant`.
    - `proxy.ts` solo redirige al ingreso cuando no hay cookie de sesión.
    - Si la persona trabaja en varias residencias, la elige al entrar.

13. **Email.** Hay una interfaz con un adaptador de consola para
    desarrollo. En producción falla hasta la Etapa 2.5, que suma el
    proveedor real.

## Consecuencias y pendientes

- Con más de una instancia de la app, los límites de intentos pasan a un
  almacenamiento compartido.
- Los errores de base de Drizzle incluyen los parámetros de la consulta
  (por ejemplo, un email). Resuelto en la Etapa 2.5: los logs y la consola
  de producción los limpian (docs/decisions/0005, punto 6).
- Las pruebas de integración (`tests/integration/auth.test.ts`) están
  escritas y falta correrlas con Docker.
- Pantallas para la Etapa 3:
  - invitar usuario;
  - crear un usuario sin email;
  - restablecer la contraseña de otra persona;
  - perfil y cambio de contraseña.
