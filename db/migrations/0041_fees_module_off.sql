-- La residencia no usa el abono mensual: se apaga el módulo "fees". Sin él
-- no valen los permisos fees.* (no se ve Abonos en el menú, en Inicio ni en
-- la ficha) y el worker deja de generar cuotas, avisos y emails del abono.
-- No se borra nada: se vuelve a encender poniendo enabled = true.
UPDATE organization_modules
SET enabled = false
WHERE module_key = 'fees' AND enabled;
