-- Permisos del legajo documental (0013). Los archivos son inmutables:
-- solo se crean y se leen. Las fotos quitadas o reemplazadas se marcan, no
-- se borran (E6). Quién ve y sube fotos lo decide can() (documents.files,
-- solo Administración y Dirección, 12.7); RLS limita todo a la residencia.
GRANT SELECT, INSERT ON files TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON resident_documents, resident_document_files TO r360_app;
