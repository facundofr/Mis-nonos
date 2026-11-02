-- Permisos de las novedades (0018). Nada se borra (E6). La app solo puede
-- cambiar la versión vigente y la resolución: el autor, la fecha, el
-- paciente y el turno quedan fijos. Las versiones solo se agregan.
GRANT SELECT, INSERT ON resident_notes TO r360_app;
--> statement-breakpoint
GRANT UPDATE (category_id, content, version, follow_up, updated_at, resolved_by, resolved_at, resolution_note) ON resident_notes TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON note_versions TO r360_app;
