CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"required_for" text DEFAULT 'all' NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_types_organization_key_unique" UNIQUE("organization_id","key"),
	CONSTRAINT "document_types_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "document_types_required_for_check" CHECK ("document_types"."required_for" in ('all', 'pami', 'private')),
	CONSTRAINT "document_types_key_check" CHECK ("document_types"."key" ~ '^[a-z][a-z0-9_]{1,39}$'),
	CONSTRAINT "document_types_name_check" CHECK (length(trim("document_types"."name")) between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "document_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_categories" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_categories_organization_name_unique" UNIQUE("organization_id","name"),
	CONSTRAINT "note_categories_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "note_categories_name_check" CHECK (length(trim("note_categories"."name")) between 1 and 40)
);
--> statement-breakpoint
ALTER TABLE "note_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_site_name_unique" UNIQUE("site_id","name"),
	CONSTRAINT "shifts_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "shifts_hours_check" CHECK ("shifts"."starts_at" <> "shifts"."ends_at"),
	CONSTRAINT "shifts_name_check" CHECK (length(trim("shifts"."name")) between 1 and 40)
);
--> statement-breakpoint
ALTER TABLE "shifts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD COLUMN "usual_shift_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_change_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "emergency_service_name" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "emergency_service_phone" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "emergency_service_account" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "medical_control_text" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "fee_rule_text" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "family_provides_text" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "handover_requires_confirmation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "fee_reminder_days_before" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_categories" ADD CONSTRAINT "note_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shifts_site_idx" ON "shifts" USING btree ("site_id","position");--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_shift_organization_fk" FOREIGN KEY ("usual_shift_id","organization_id") REFERENCES "public"."shifts"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_fee_reminder_days_check" CHECK ("sites"."fee_reminder_days_before" between 1 and 30);--> statement-breakpoint
CREATE POLICY "document_types_select" ON "document_types" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "document_types_insert" ON "document_types" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "document_types_update" ON "document_types" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "note_categories_select" ON "note_categories" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "note_categories_insert" ON "note_categories" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "note_categories_update" ON "note_categories" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "shifts_select" ON "shifts" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "shifts_insert" ON "shifts" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "shifts_update" ON "shifts" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));