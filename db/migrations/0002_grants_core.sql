-- Permisos del rol de la app (r360_app) sobre las tablas de 0001.
-- Regla: cada tabla nueva recibe permisos explícitos en su migración; no
-- hay privilegios por defecto. Ninguna tabla tiene DELETE: no hay borrados
-- físicos (E6). RLS filtra además las filas por organización (10.13).

-- Identidad global (excepción a RLS documentada en docs/decisions/0002).
GRANT SELECT, INSERT, UPDATE ON users TO r360_app;
--> statement-breakpoint

-- Las organizaciones y las sedes las da de alta un script con el rol dueño
-- (DC-12). La app puede leerlas y actualizar sus datos.
GRANT SELECT, UPDATE ON organizations TO r360_app;
--> statement-breakpoint
GRANT SELECT, UPDATE ON sites TO r360_app;
--> statement-breakpoint

-- Los módulos los activa la plataforma: la app solo los lee.
GRANT SELECT ON organization_modules TO r360_app;
--> statement-breakpoint

-- Roles y permisos como datos: en el MVP solo hay roles de sistema, que
-- se cargan con el rol dueño. La app los lee.
GRANT SELECT ON roles, permissions, role_permissions TO r360_app;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON organization_memberships TO r360_app;
--> statement-breakpoint

-- Auditoría y eventos: solo agregar y leer.
GRANT SELECT, INSERT ON audit_events TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON domain_events TO r360_app;
