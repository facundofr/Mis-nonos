-- Permisos del traspaso de turno (0020). Nada se borra (E6). La app puede
-- completar la entrega (nueva versión) y confirmar la recepción; el turno,
-- la fecha y la sede quedan fijos. Las versiones solo se agregan.
GRANT SELECT, INSERT ON shift_handovers TO r360_app;
--> statement-breakpoint
GRANT UPDATE (note, version, delivered_by, delivered_at, confirmed_by, confirmed_at, updated_at) ON shift_handovers TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON shift_handover_versions TO r360_app;
