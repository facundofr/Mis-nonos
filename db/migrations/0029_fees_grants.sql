-- Permisos del abono (0028). Nada se borra (E6):
-- - un plan solo se cierra (effective_to) al cambiar el precio;
-- - una cuota cambia de estado, y de monto solo si todavía no tiene pagos
--   (cambio de precio, lo controla la app);
-- - un pago solo se anula.
GRANT SELECT, INSERT, UPDATE ON payment_methods TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON resident_fee_plans TO r360_app;
--> statement-breakpoint
GRANT UPDATE (effective_to) ON resident_fee_plans TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON fee_charges TO r360_app;
--> statement-breakpoint
GRANT UPDATE (status, void_reason, amount, fee_plan_id, updated_at) ON fee_charges TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON fee_payments TO r360_app;
--> statement-breakpoint
GRANT UPDATE (voided_at, voided_by, void_reason) ON fee_payments TO r360_app;
--> statement-breakpoint
-- Medios de pago iniciales (DC-21) en las sedes que ya existen.
INSERT INTO payment_methods (organization_id, site_id, name, position)
SELECT s.organization_id, s.id, m.name, m.position
FROM sites s
CROSS JOIN (VALUES ('Efectivo', 1), ('Transferencia', 2), ('Otro', 3)) AS m(name, position)
ON CONFLICT (site_id, name) DO NOTHING;
