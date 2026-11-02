-- Permisos del rol de la app sobre los catálogos de 0008 (turnos,
-- categorías de novedades y documentos del legajo). Sin DELETE: lo que no
-- se usa se desactiva (E6). Quién puede cambiarlos lo decide can()
-- (settings.manage); RLS limita cada fila a su residencia.
GRANT SELECT, INSERT, UPDATE ON shifts, note_categories, document_types TO r360_app;
