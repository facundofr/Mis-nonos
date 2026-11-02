CREATE TABLE "admissions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admissions_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "admissions_status_check" CHECK ("admissions"."status" in ('draft', 'confirmed', 'cancelled')),
	CONSTRAINT "admissions_step_check" CHECK ("admissions"."current_step" between 1 and 4)
);
--> statement-breakpoint
ALTER TABLE "admissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resident_allergies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"substance" text NOT NULL,
	"reaction" text,
	"severity" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_allergies_status_check" CHECK ("resident_allergies"."status" in ('active', 'discarded')),
	CONSTRAINT "resident_allergies_substance_check" CHECK (length(trim("resident_allergies"."substance")) > 0)
);
--> statement-breakpoint
ALTER TABLE "resident_allergies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resident_contacts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text,
	"national_id" text,
	"address" text,
	"phone_primary" text,
	"phone_mobile" text,
	"phone_work" text,
	"whatsapp" boolean DEFAULT false NOT NULL,
	"email" "citext",
	"emergency_priority" integer,
	"is_admission_responsible" boolean DEFAULT false NOT NULL,
	"is_legal_representative" boolean DEFAULT false NOT NULL,
	"can_receive_info" boolean DEFAULT true NOT NULL,
	"can_pick_up" boolean DEFAULT false NOT NULL,
	"is_payer" boolean DEFAULT false NOT NULL,
	"availability_notes" text,
	"last_verified_at" date,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_contacts_name_check" CHECK (length(trim("resident_contacts"."name")) > 0),
	CONSTRAINT "resident_contacts_priority_check" CHECK ("resident_contacts"."emergency_priority" is null or "resident_contacts"."emergency_priority" between 1 and 99),
	CONSTRAINT "resident_contacts_phone_check" CHECK (not "resident_contacts"."active" or coalesce("resident_contacts"."phone_primary", "resident_contacts"."phone_mobile", "resident_contacts"."phone_work") is not null)
);
--> statement-breakpoint
ALTER TABLE "resident_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "residents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"national_id" text,
	"birth_date" date,
	"birth_place" text,
	"previous_address" text,
	"room_label" text,
	"admission_date" date,
	"referral_institution" text,
	"admission_modality" text DEFAULT 'private' NOT NULL,
	"coverage_type" text DEFAULT 'none' NOT NULL,
	"coverage_name" text,
	"coverage_member_number" text,
	"coverage_plan" text,
	"national_id_in_custody" boolean DEFAULT false NOT NULL,
	"primary_physician_name" text,
	"primary_physician_phone" text,
	"special_instructions" text,
	"status" text DEFAULT 'admission_draft' NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hospitalization_place" text,
	"hospitalized_since" date,
	"discharge_date" date,
	"discharge_reason" text,
	"discharge_notes" text,
	"search_text" text GENERATED ALWAYS AS (app.normalize_search(first_name || ' ' || last_name || ' ' || coalesce(room_label, '') || ' ' || coalesce(national_id, ''))) STORED,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "residents_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "residents_status_check" CHECK ("residents"."status" in ('admission_draft', 'admission_cancelled', 'active', 'hospitalized', 'discharged')),
	CONSTRAINT "residents_modality_check" CHECK ("residents"."admission_modality" in ('pami', 'private')),
	CONSTRAINT "residents_coverage_type_check" CHECK ("residents"."coverage_type" in ('pami', 'obra_social', 'prepaga', 'none')),
	CONSTRAINT "residents_discharge_check" CHECK (("residents"."status" = 'discharged') = ("residents"."discharge_date" is not null and "residents"."discharge_reason" is not null)),
	CONSTRAINT "residents_discharge_reason_check" CHECK ("residents"."discharge_reason" is null or "residents"."discharge_reason" in ('alta', 'traslado', 'fallecimiento', 'otro')),
	CONSTRAINT "residents_hospitalized_check" CHECK (("residents"."status" = 'hospitalized') = ("residents"."hospitalization_place" is not null)),
	CONSTRAINT "residents_names_check" CHECK (length(trim("residents"."first_name")) > 0 and length(trim("residents"."last_name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "residents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_allergies" ADD CONSTRAINT "resident_allergies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_allergies" ADD CONSTRAINT "resident_allergies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_allergies" ADD CONSTRAINT "resident_allergies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_allergies" ADD CONSTRAINT "resident_allergies_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_contacts" ADD CONSTRAINT "resident_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_contacts" ADD CONSTRAINT "resident_contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_contacts" ADD CONSTRAINT "resident_contacts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_contacts" ADD CONSTRAINT "resident_contacts_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admissions_organization_status_idx" ON "admissions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "admissions_resident_unique" ON "admissions" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "resident_allergies_resident_idx" ON "resident_allergies" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "resident_contacts_resident_idx" ON "resident_contacts" USING btree ("resident_id","emergency_priority");--> statement-breakpoint
CREATE UNIQUE INDEX "resident_contacts_one_responsible" ON "resident_contacts" USING btree ("resident_id") WHERE "resident_contacts"."is_admission_responsible" and "resident_contacts"."active";--> statement-breakpoint
CREATE INDEX "residents_organization_status_idx" ON "residents" USING btree ("organization_id","status","last_name");--> statement-breakpoint
CREATE INDEX "residents_search_idx" ON "residents" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE POLICY "admissions_select" ON "admissions" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "admissions_insert" ON "admissions" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "admissions_update" ON "admissions" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_allergies_select" ON "resident_allergies" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_allergies_insert" ON "resident_allergies" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_allergies_update" ON "resident_allergies" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_contacts_select" ON "resident_contacts" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_contacts_insert" ON "resident_contacts" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_contacts_update" ON "resident_contacts" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "residents_select" ON "residents" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "residents_insert" ON "residents" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "residents_update" ON "residents" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));