# 0022 — La app arranca en /ingresar; la landing queda oculta

- **Fecha:** 04/11/2026
- **Estado:** aceptada. Lo pidió el responsable del proyecto. Cambia el
  punto 7 de 0016 (`HOME_LANDING_SLUG`).

## Decisiones

1. **La raíz lleva al ingreso:**
   - sin sesión, `https://mis-nonos.facundofr.com/` va a `/ingresar`;
   - con sesión, va a `/inicio`;
   - `HOME_LANDING_SLUG` ya no se usa. Se sigue aceptando para no romper
     configuraciones existentes.
2. **La landing (`/residencia/<dirección>`) no se muestra:** lleva a
   `/ingresar`, o a `/inicio` si hay sesión. El código queda, por si se
   vuelve a publicar.
3. **El formulario para familias sigue funcionando:**
   - está en `/residencia/<dirección>/solicitar`, junto con el aviso de
     privacidad y la página de "enviada";
   - Configuración › Formulario público muestra ese enlace para
     compartirlo.
