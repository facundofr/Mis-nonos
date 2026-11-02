-- Permisos del rol de la app sobre las tablas de pacientes (0011). Sin
-- DELETE: los pacientes egresan, las alergias se descartan y los contactos
-- se desactivan (E6). Quién puede qué lo decide can(); RLS limita cada
-- fila a su residencia.
GRANT SELECT, INSERT, UPDATE ON residents, resident_allergies, resident_contacts, admissions TO r360_app;
