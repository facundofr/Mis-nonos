CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "files_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "files_mime_type_check" CHECK ("files"."mime_type" in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
	CONSTRAINT "files_size_check" CHECK ("files"."size_bytes" > 0 and "files"."size_bytes" <= 10485760),
	CONSTRAINT "files_sha256_check" CHECK ("files"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resident_document_files" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"added_by" uuid,
	"replaced_at" timestamp with time zone,
	"replaced_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_document_files_replaced_check" CHECK (("resident_document_files"."replaced_at" is null) = ("resident_document_files"."replaced_by" is null))
);
--> statement-breakpoint
ALTER TABLE "resident_document_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resident_documents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"document_type_id" uuid NOT NULL,
	"signed_on" date,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_documents_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "resident_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_document_files" ADD CONSTRAINT "resident_document_files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_document_files" ADD CONSTRAINT "resident_document_files_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_document_files" ADD CONSTRAINT "resident_document_files_replaced_by_users_id_fk" FOREIGN KEY ("replaced_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_document_files" ADD CONSTRAINT "resident_document_files_document_organization_fk" FOREIGN KEY ("document_id","organization_id") REFERENCES "public"."resident_documents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_document_files" ADD CONSTRAINT "resident_document_files_file_organization_fk" FOREIGN KEY ("file_id","organization_id") REFERENCES "public"."files"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_documents" ADD CONSTRAINT "resident_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_documents" ADD CONSTRAINT "resident_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_documents" ADD CONSTRAINT "resident_documents_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_documents" ADD CONSTRAINT "resident_documents_type_organization_fk" FOREIGN KEY ("document_type_id","organization_id") REFERENCES "public"."document_types"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_organization_idx" ON "files" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "resident_document_files_document_idx" ON "resident_document_files" USING btree ("document_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "resident_document_files_file_unique" ON "resident_document_files" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resident_documents_resident_type_unique" ON "resident_documents" USING btree ("resident_id","document_type_id");--> statement-breakpoint
CREATE POLICY "files_select" ON "files" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "files_insert" ON "files" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_document_files_select" ON "resident_document_files" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_document_files_insert" ON "resident_document_files" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_document_files_update" ON "resident_document_files" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_documents_select" ON "resident_documents" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_documents_insert" ON "resident_documents" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_documents_update" ON "resident_documents" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));