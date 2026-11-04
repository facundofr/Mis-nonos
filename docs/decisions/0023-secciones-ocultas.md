# 0023 — Se ocultan Novedades, Enfermería, Abonos, Traspaso y Especialidades

- **Fecha:** 04/11/2026
- **Estado:** reemplazada en parte por 0024: Novedades, Enfermería y Abonos
  ya no se ocultan, se quitaron. Sigue vigente el punto 1.

## Decisiones

1. **Traspaso de turno y Especialidades:** no aparecen en el menú ni en
   Inicio. Sus pantallas siguen abriendo por su dirección.
2. **Novedades y Enfermería:** no aparecen en el menú, en Inicio, en la
   ficha del paciente, en Configuración ni en la guía de bienvenida. Sus
   pantallas responden "no encontrada" (un `layout.tsx` en cada carpeta).
   Sin novedades, el botón "+" de la barra del teléfono no está.
3. **Abonos:** se apaga el módulo `fees` de las organizaciones existentes
   (migración 0041). Sin el módulo no valen los permisos `fees.*`, y el
   worker deja de generar cuotas, avisos y emails. Las organizaciones nuevas
   lo siguen teniendo encendido.
4. **No se borra nada:** ni código ni datos. La lista de secciones ocultas
   está en `lib/navigation/hidden.ts`; el abono se vuelve a encender con
   `organization_modules.enabled = true`.
