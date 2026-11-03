# 0018 — Alta de usuarios con email y contraseña provisoria

- **Fecha:** 03/11/2026
- **Estado:** aceptada. El responsable del proyecto pidió el 03/11/2026 que
  Administración pueda sumar usuarios de cualquier rol con una validación
  simple: una contraseña que llega al email y después se cambia.
- **Contexto:** 7.3-A, DC-11 (personal sin email), 0007 (usuarios y roles).

## Decisiones

1. **"Agregar usuario"** es la opción principal de Usuarios y roles.
   - Administración carga nombre, email, rol (cualquiera de los cuatro) y,
     si quiere, teléfono, profesión y matrícula.
   - La app genera la contraseña provisoria, con el mismo formato fácil de
     dictar que DC-11 ("k7m2-p9qx-4rtz"), y se la manda por email.
   - Al primer ingreso, la persona tiene que elegir una propia
     (`password_change_required`, el mismo paso que el personal sin email).
2. **Si el email no sale**, porque falta el SMTP o falla el proveedor, el
   usuario igual queda creado.
   - La pantalla le muestra la contraseña a Administración **una sola
     vez**, para que se la dé a la persona.
   - La contraseña nunca va a los logs ni a la auditoría.
3. **Las otras dos formas siguen:**
   - "Invitar con enlace": un enlace de 72 h para que la persona cree su
     contraseña. Se usa también cuando el email ya tiene cuenta en otra
     residencia;
   - "Crear sin email": usuario y contraseña provisoria (DC-11).
4. **Contraseña olvidada:** Administración puede dar una provisoria nueva a
   cualquier persona, con o sin email.
   - Si tiene email, se le manda.
   - Se cierran sus sesiones y al entrar elige una propia.
   - Antes, para quien tenía email solo existía "¿La olvidaste?", que
     depende del SMTP.
5. **2FA:** en este servidor sigue apagada para Administración y Dirección
   (`REQUIRE_PRIVILEGED_2FA=false`). Cada persona la puede activar desde
   su perfil.

## Riesgos

- El email con la contraseña puede quedar en la casilla. Por eso la
  contraseña sirve solo para entrar una vez: la app obliga a cambiarla.
