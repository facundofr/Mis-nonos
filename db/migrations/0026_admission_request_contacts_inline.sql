-- Los dos familiares opcionales de la solicitud pasan a columnas: así se
-- editan sin borrar filas (la app no tiene DELETE). La tabla aparte se creó
-- en 0024, todavía sin uso ni datos (nunca se desplegó).
DROP POLICY "admission_request_contacts_select" ON "admission_request_contacts" CASCADE;--> statement-breakpoint
DROP POLICY "admission_request_contacts_insert" ON "admission_request_contacts" CASCADE;--> statement-breakpoint
DROP POLICY "admission_request_contacts_update" ON "admission_request_contacts" CASCADE;--> statement-breakpoint
DROP TABLE "admission_request_contacts" CASCADE;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD COLUMN "contact2_name" text;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD COLUMN "contact2_relationship" text;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD COLUMN "contact2_phone" text;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD COLUMN "contact3_name" text;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD COLUMN "contact3_relationship" text;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD COLUMN "contact3_phone" text;