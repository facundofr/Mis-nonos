-- Permisos de 0015. Las hojas de derivación generadas solo se registran
-- (no se modifican). Las notificaciones se crean (worker) y su destinatario
-- las marca como leídas; no se borran.
GRANT SELECT, INSERT ON emergency_sheet_exports TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON notifications TO r360_app;
