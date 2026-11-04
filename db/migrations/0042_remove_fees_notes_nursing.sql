-- Se quitan el abono, las novedades y la sección Enfermería
-- (docs/decisions/0024). Primero los datos que dependen de ellos; después,
-- las tablas y columnas (generado por drizzle-kit).

-- Abono: que no quede registro de montos ni de pagos.
DELETE FROM notifications WHERE type = 'fee.due_soon';
--> statement-breakpoint
DELETE FROM audit_events
WHERE action LIKE 'fee.%'
   OR action LIKE 'settings.payment_method_%'
   OR entity_type IN ('fee_charge', 'fee_payment', 'resident_fee_plan', 'payment_method');
--> statement-breakpoint
DELETE FROM organization_modules WHERE module_key = 'fees';
--> statement-breakpoint

-- Permisos del abono y de las novedades (la matriz de lib/auth/permissions.ts).
DELETE FROM role_permissions
WHERE permission_key IN ('fees.read', 'fees.manage', 'notes.create', 'notes.edit_own', 'notes.resolve');
--> statement-breakpoint
DELETE FROM permissions
WHERE key IN ('fees.read', 'fees.manage', 'notes.create', 'notes.edit_own', 'notes.resolve');
--> statement-breakpoint

UPDATE permissions SET description = 'Datos de la residencia, turnos y documentos' WHERE key = 'settings.manage';
--> statement-breakpoint
UPDATE permissions SET description = 'Ver el historial de cambios de un paciente' WHERE key = 'audit.read_resident';
--> statement-breakpoint
UPDATE permissions SET description = 'Registrar y anular atenciones' WHERE key = 'care.record';
--> statement-breakpoint

-- Enfermería deja de ser una especialidad especial: queda inactiva, con sus
-- atenciones ya registradas.
UPDATE specialties SET active = false, updated_at = now() WHERE key = 'enfermeria';
--> statement-breakpoint

ALTER TABLE "note_categories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fee_charges" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fee_payments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_methods" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resident_fee_plans" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "note_versions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resident_notes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "note_categories_select" ON "note_categories" CASCADE;--> statement-breakpoint
DROP POLICY "note_categories_insert" ON "note_categories" CASCADE;--> statement-breakpoint
DROP POLICY "note_categories_update" ON "note_categories" CASCADE;--> statement-breakpoint
DROP TABLE "note_categories" CASCADE;--> statement-breakpoint
DROP POLICY "fee_charges_select" ON "fee_charges" CASCADE;--> statement-breakpoint
DROP POLICY "fee_charges_insert" ON "fee_charges" CASCADE;--> statement-breakpoint
DROP POLICY "fee_charges_update" ON "fee_charges" CASCADE;--> statement-breakpoint
DROP TABLE "fee_charges" CASCADE;--> statement-breakpoint
DROP POLICY "fee_payments_select" ON "fee_payments" CASCADE;--> statement-breakpoint
DROP POLICY "fee_payments_insert" ON "fee_payments" CASCADE;--> statement-breakpoint
DROP POLICY "fee_payments_update" ON "fee_payments" CASCADE;--> statement-breakpoint
DROP TABLE "fee_payments" CASCADE;--> statement-breakpoint
DROP POLICY "payment_methods_select" ON "payment_methods" CASCADE;--> statement-breakpoint
DROP POLICY "payment_methods_insert" ON "payment_methods" CASCADE;--> statement-breakpoint
DROP POLICY "payment_methods_update" ON "payment_methods" CASCADE;--> statement-breakpoint
DROP TABLE "payment_methods" CASCADE;--> statement-breakpoint
DROP POLICY "resident_fee_plans_select" ON "resident_fee_plans" CASCADE;--> statement-breakpoint
DROP POLICY "resident_fee_plans_insert" ON "resident_fee_plans" CASCADE;--> statement-breakpoint
DROP POLICY "resident_fee_plans_update" ON "resident_fee_plans" CASCADE;--> statement-breakpoint
DROP TABLE "resident_fee_plans" CASCADE;--> statement-breakpoint
DROP POLICY "note_versions_select" ON "note_versions" CASCADE;--> statement-breakpoint
DROP POLICY "note_versions_insert" ON "note_versions" CASCADE;--> statement-breakpoint
DROP POLICY "note_versions_update" ON "note_versions" CASCADE;--> statement-breakpoint
DROP TABLE "note_versions" CASCADE;--> statement-breakpoint
DROP POLICY "resident_notes_select" ON "resident_notes" CASCADE;--> statement-breakpoint
DROP POLICY "resident_notes_insert" ON "resident_notes" CASCADE;--> statement-breakpoint
DROP POLICY "resident_notes_update" ON "resident_notes" CASCADE;--> statement-breakpoint
DROP TABLE "resident_notes" CASCADE;--> statement-breakpoint
ALTER TABLE "organization_modules" DROP CONSTRAINT "organization_modules_key_check";--> statement-breakpoint
ALTER TABLE "sites" DROP CONSTRAINT "sites_fee_reminder_days_check";--> statement-breakpoint
DROP INDEX "specialties_organization_key_unique";--> statement-breakpoint
ALTER TABLE "specialties" DROP COLUMN "key";--> statement-breakpoint
ALTER TABLE "resident_contacts" DROP COLUMN "is_payer";--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "fee_rule_text";--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "fee_reminder_days_before";--> statement-breakpoint
ALTER TABLE "organization_modules" ADD CONSTRAINT "organization_modules_key_check" CHECK ("organization_modules"."module_key" in ('core', 'care', 'medication', 'clinical_record', 'staff', 'family', 'admin'));