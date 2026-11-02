# 0013 — Guía de uso de la primera vez (onboarding)

- **Fecha:** 02/11/2026
- **Estado:** aceptada. Pedido del usuario el 02/11/2026 ("un onboarding
  para toda la app las primeras veces que se ingrese").
- **Contexto:** se suma al MVP (Apéndice A, F1-ONB-01; Apéndice C).

## Decisiones

1. **Tres partes:**
   - **Bienvenida:** un diálogo de pasos la primera vez que la persona
     entra a una residencia. Los pasos dependen de sus permisos (una
     cuidadora ve 5; Administración ve también ingresos, actividad y
     configuración). Se puede saltar (botón o Esc).
   - **Consejos por pantalla:** una tarjeta breve la primera vez en
     Pacientes, la ficha, Novedades, Nueva novedad, Turno, Ingresos,
     Configuración, Usuarios y Notificaciones. Se cierran con
     "Entendido". No hay consejo en la ficha de emergencia, para no
     demorar a nadie en un momento urgente.
   - **Puesta en marcha** (solo `settings.manage`): lista en el Inicio que
     se completa sola con los datos reales (datos de la residencia,
     servicio de emergencias, personal, primer ingreso) y un paso manual
     ("Turnos, categorías y documentos": "Ya los revisé"). Se puede
     ocultar y desaparece al completarse.
2. **Se guarda en la base** (`user_onboarding`, por persona y residencia),
   no en el navegador: los teléfonos del turno se comparten. RLS: cada
   persona ve y marca solo lo suyo. "Volver a ver la guía" (en Más y en
   Mi perfil) pone `seen_at` en nulo; no se borra nada.
3. **No se audita.** Es una preferencia de pantalla, no un dato de la
   residencia ni de un paciente; registrarlo llenaría la actividad de
   ruido. Es una excepción explícita a "cada cambio se audita".
4. **Arreglo en el camino:** al terminar un paso obligatorio (contraseña
   provisoria o 2FA) la app seguía mostrando el marco mínimo hasta
   recargar. Ahora esas acciones vuelven a armar el marco
   (`revalidatePath("/", "layout")`), y la bienvenida aparece en ese
   momento.
5. Los textos están en `features/onboarding/content.ts`. Cada módulo
   nuevo (solicitudes, abono) suma su paso y su consejo ahí.

## Consecuencias

- En las pruebas de punta a punta la bienvenida se saltea sola
  (`skipWelcomeAutomatically`), salvo en `tests/e2e/guia.spec.ts`, que
  la prueba. Integración: `tests/integration/onboarding.test.ts`.
