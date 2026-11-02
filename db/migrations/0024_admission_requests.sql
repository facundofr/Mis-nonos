CREATE TABLE "admission_request_contacts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text,
	"phone" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admission_request_contacts_position_unique" UNIQUE("request_id","position"),
	CONSTRAINT "admission_request_contacts_name_check" CHECK (length(trim("admission_request_contacts"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "admission_request_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admission_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"contact_channel" text,
	"status" text DEFAULT 'new' NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"national_id" text,
	"birth_date" date,
	"admission_modality" text,
	"coverage_type" text,
	"coverage_name" text,
	"coverage_member_number" text,
	"referral_institution" text,
	"desired_admission_date" date,
	"responsible_name" text NOT NULL,
	"responsible_relationship" text,
	"responsible_national_id" text,
	"responsible_phone" text NOT NULL,
	"responsible_email" "citext",
	"responsible_address" text,
	"family_message" text,
	"internal_notes" text,
	"consent_accepted_at" timestamp with time zone,
	"consent_text_version" text,
	"client_request_id" uuid NOT NULL,
	"discard_reason" text,
	"discard_notes" text,
	"converted_admission_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admission_requests_client_request_unique" UNIQUE("organization_id","client_request_id"),
	CONSTRAINT "admission_requests_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "admission_requests_origin_check" CHECK ("admission_requests"."origin" in ('staff', 'landing')),
	CONSTRAINT "admission_requests_status_check" CHECK ("admission_requests"."status" in ('new', 'contacting', 'waitlisted', 'converted', 'discarded')),
	CONSTRAINT "admission_requests_channel_check" CHECK ("admission_requests"."contact_channel" is null or "admission_requests"."contact_channel" in ('phone', 'whatsapp', 'in_person', 'referral', 'email', 'other')),
	CONSTRAINT "admission_requests_modality_check" CHECK ("admission_requests"."admission_modality" is null or "admission_requests"."admission_modality" in ('pami', 'private')),
	CONSTRAINT "admission_requests_coverage_check" CHECK ("admission_requests"."coverage_type" is null or "admission_requests"."coverage_type" in ('pami', 'obra_social', 'prepaga', 'none')),
	CONSTRAINT "admission_requests_names_check" CHECK (length(trim("admission_requests"."first_name")) > 0 and length(trim("admission_requests"."last_name")) > 0 and length(trim("admission_requests"."responsible_name")) > 0),
	CONSTRAINT "admission_requests_discard_check" CHECK (("admission_requests"."status" = 'discarded') = ("admission_requests"."discard_reason" is not null)
        and ("admission_requests"."discard_reason" is null or "admission_requests"."discard_reason" in ('no_vacancy', 'requirements', 'withdrew', 'duplicate', 'spam', 'other'))),
	CONSTRAINT "admission_requests_converted_check" CHECK (("admission_requests"."status" = 'converted') = ("admission_requests"."converted_admission_id" is not null)),
	CONSTRAINT "admission_requests_consent_check" CHECK ("admission_requests"."origin" <> 'landing' or ("admission_requests"."consent_accepted_at" is not null and "admission_requests"."consent_text_version" is not null))
);
--> statement-breakpoint
ALTER TABLE "admission_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_request_contacts" ADD CONSTRAINT "admission_request_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_request_contacts" ADD CONSTRAINT "admission_request_contacts_request_organization_fk" FOREIGN KEY ("request_id","organization_id") REFERENCES "public"."admission_requests"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_admission_organization_fk" FOREIGN KEY ("converted_admission_id","organization_id") REFERENCES "public"."admissions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admission_requests_site_status_idx" ON "admission_requests" USING btree ("site_id","status","created_at");--> statement-breakpoint
CREATE INDEX "admission_requests_national_id_idx" ON "admission_requests" USING btree ("organization_id","national_id") WHERE "admission_requests"."national_id" is not null;--> statement-breakpoint
CREATE POLICY "admission_request_contacts_select" ON "admission_request_contacts" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "admission_request_contacts_insert" ON "admission_request_contacts" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "admission_request_contacts_update" ON "admission_request_contacts" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "admission_requests_select" ON "admission_requests" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "admission_requests_insert" ON "admission_requests" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "admission_requests_update" ON "admission_requests" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));