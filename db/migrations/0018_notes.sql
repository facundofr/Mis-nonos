CREATE TABLE "note_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"category_id" uuid NOT NULL,
	"follow_up" boolean NOT NULL,
	"edited_by" uuid NOT NULL,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_versions_note_version_unique" UNIQUE("note_id","version")
);
--> statement-breakpoint
ALTER TABLE "note_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resident_notes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"resident_id" uuid,
	"category_id" uuid NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"follow_up" boolean DEFAULT false NOT NULL,
	"shift_id" uuid,
	"shift_date" date,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	CONSTRAINT "resident_notes_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "resident_notes_content_check" CHECK (length(trim("resident_notes"."content")) between 1 and 2000),
	CONSTRAINT "resident_notes_version_check" CHECK ("resident_notes"."version" >= 1),
	CONSTRAINT "resident_notes_shift_check" CHECK (("resident_notes"."shift_id" is null) = ("resident_notes"."shift_date" is null)),
	CONSTRAINT "resident_notes_resolution_check" CHECK (("resident_notes"."resolved_at" is null and "resident_notes"."resolved_by" is null and "resident_notes"."resolution_note" is null)
        or ("resident_notes"."follow_up" and "resident_notes"."resolved_at" is not null and "resident_notes"."resolved_by" is not null)),
	CONSTRAINT "resident_notes_resolution_note_check" CHECK ("resident_notes"."resolution_note" is null or length(trim("resident_notes"."resolution_note")) between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "resident_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_note_organization_fk" FOREIGN KEY ("note_id","organization_id") REFERENCES "public"."resident_notes"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_category_organization_fk" FOREIGN KEY ("category_id","organization_id") REFERENCES "public"."note_categories"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_notes" ADD CONSTRAINT "resident_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_notes" ADD CONSTRAINT "resident_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_notes" ADD CONSTRAINT "resident_notes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_notes" ADD CONSTRAINT "resident_notes_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_notes" ADD CONSTRAINT "resident_notes_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_notes" ADD CONSTRAINT "resident_notes_category_organization_fk" FOREIGN KEY ("category_id","organization_id") REFERENCES "public"."note_categories"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_notes" ADD CONSTRAINT "resident_notes_shift_organization_fk" FOREIGN KEY ("shift_id","organization_id") REFERENCES "public"."shifts"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resident_notes_site_created_idx" ON "resident_notes" USING btree ("site_id","created_at","id");--> statement-breakpoint
CREATE INDEX "resident_notes_resident_created_idx" ON "resident_notes" USING btree ("resident_id","created_at","id");--> statement-breakpoint
CREATE INDEX "resident_notes_pending_idx" ON "resident_notes" USING btree ("site_id","created_at") WHERE "resident_notes"."follow_up" and "resident_notes"."resolved_at" is null;--> statement-breakpoint
CREATE POLICY "note_versions_select" ON "note_versions" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "note_versions_insert" ON "note_versions" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "note_versions_update" ON "note_versions" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_notes_select" ON "resident_notes" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_notes_insert" ON "resident_notes" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_notes_update" ON "resident_notes" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));