-- Etapa 2.4: catálogo de permisos y matriz por rol (F.3; DC-01 confirmada
-- el 01/11/2026). La misma matriz está en lib/auth/permissions.ts y una
-- prueba unitaria compara las dos. Cambiar un permiso = migración nueva.

INSERT INTO permissions (key, module_key, description) VALUES
  ('residents.read', 'core', 'Ver la lista y la ficha del paciente'),
  ('residents.update', 'core', 'Editar datos, cobertura, alergias, indicaciones y médico de cabecera'),
  ('residents.status', 'core', 'Marcar «internado fuera» y volver a «activo»'),
  ('residents.discharge', 'core', 'Registrar el egreso'),
  ('admissions.manage', 'core', 'Hacer, retomar y confirmar ingresos guiados'),
  ('admission_requests.manage', 'core', 'Cargar, gestionar y convertir solicitudes de ingreso'),
  ('documents.files', 'core', 'Ver, subir y reemplazar las fotos del legajo'),
  ('contacts.manage', 'core', 'Agregar, editar y ordenar contactos'),
  ('emergency.view', 'core', 'Abrir la ficha de emergencia'),
  ('emergency.pdf', 'core', 'Generar la hoja de derivación'),
  ('notes.create', 'core', 'Registrar novedades'),
  ('notes.edit_own', 'core', 'Corregir las novedades propias (nueva versión)'),
  ('notes.resolve', 'core', 'Resolver seguimientos'),
  ('handover.deliver', 'core', 'Entregar el turno'),
  ('handover.confirm', 'core', 'Confirmar la recepción del turno'),
  ('staff.read', 'core', 'Ver empleados (nombre, rol y teléfono)'),
  ('users.manage', 'core', 'Invitar, cambiar el rol y desactivar usuarios'),
  ('settings.manage', 'core', 'Datos de la residencia, turnos, categorías, documentos y aviso del abono'),
  ('fees.read', 'fees', 'Ver abonos, cuotas y pagos'),
  ('fees.manage', 'fees', 'Fijar precios y registrar o anular pagos'),
  ('audit.read_resident', 'core', 'Ver el historial de cambios de un paciente y de sus novedades'),
  ('audit.read_all', 'core', 'Ver toda la actividad, incluidas las aperturas de la ficha de emergencia y de las fotos'),
  ('org.export', 'core', 'Exportar los datos de la residencia (E14)');
--> statement-breakpoint

-- Matriz F.3: un par (permiso, rol) por fila, para los roles de sistema.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, m.permission_key
FROM (VALUES
  ('residents.read', 'admin'), ('residents.read', 'direccion'), ('residents.read', 'enfermeria'), ('residents.read', 'cuidado'),
  ('residents.update', 'admin'), ('residents.update', 'direccion'), ('residents.update', 'enfermeria'),
  ('residents.status', 'admin'), ('residents.status', 'direccion'), ('residents.status', 'enfermeria'),
  ('residents.discharge', 'admin'), ('residents.discharge', 'direccion'),
  ('admissions.manage', 'admin'), ('admissions.manage', 'direccion'),
  ('admission_requests.manage', 'admin'), ('admission_requests.manage', 'direccion'),
  ('documents.files', 'admin'), ('documents.files', 'direccion'),
  ('contacts.manage', 'admin'), ('contacts.manage', 'direccion'), ('contacts.manage', 'enfermeria'),
  ('emergency.view', 'admin'), ('emergency.view', 'direccion'), ('emergency.view', 'enfermeria'), ('emergency.view', 'cuidado'),
  ('emergency.pdf', 'admin'), ('emergency.pdf', 'direccion'), ('emergency.pdf', 'enfermeria'), ('emergency.pdf', 'cuidado'),
  ('notes.create', 'admin'), ('notes.create', 'direccion'), ('notes.create', 'enfermeria'), ('notes.create', 'cuidado'),
  ('notes.edit_own', 'admin'), ('notes.edit_own', 'direccion'), ('notes.edit_own', 'enfermeria'), ('notes.edit_own', 'cuidado'),
  ('notes.resolve', 'admin'), ('notes.resolve', 'direccion'), ('notes.resolve', 'enfermeria'), ('notes.resolve', 'cuidado'),
  ('handover.deliver', 'direccion'), ('handover.deliver', 'enfermeria'), ('handover.deliver', 'cuidado'),
  ('handover.confirm', 'direccion'), ('handover.confirm', 'enfermeria'), ('handover.confirm', 'cuidado'),
  ('staff.read', 'admin'), ('staff.read', 'direccion'), ('staff.read', 'enfermeria'), ('staff.read', 'cuidado'),
  ('users.manage', 'admin'),
  ('settings.manage', 'admin'),
  ('fees.read', 'admin'), ('fees.read', 'direccion'),
  ('fees.manage', 'admin'), ('fees.manage', 'direccion'),
  ('audit.read_resident', 'admin'), ('audit.read_resident', 'direccion'), ('audit.read_resident', 'enfermeria'), ('audit.read_resident', 'cuidado'),
  ('audit.read_all', 'admin'), ('audit.read_all', 'direccion'),
  ('org.export', 'admin'), ('org.export', 'direccion')
) AS m(permission_key, role_key)
JOIN roles r ON r.key = m.role_key AND r.organization_id IS NULL;
