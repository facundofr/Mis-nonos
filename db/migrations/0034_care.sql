CREATE TABLE "care_encounters" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"specialty_id" uuid NOT NULL,
	"professional_id" uuid,
	"occurred_at" timestamp with time zone NOT NULL,
	"location" text DEFAULT 'in_house' NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"instructions" text,
	"next_control_on" date,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"void_reason" text,
	CONSTRAINT "care_encounters_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "care_encounters_location_check" CHECK ("care_encounters"."location" in ('in_house', 'external')),
	CONSTRAINT "care_encounters_reason_check" CHECK (length(trim("care_encounters"."reason")) between 1 and 200),
	CONSTRAINT "care_encounters_texts_check" CHECK (("care_encounters"."notes" is null or length("care_encounters"."notes") <= 2000)
        and ("care_encounters"."instructions" is null or length("care_encounters"."instructions") <= 2000)),
	CONSTRAINT "care_encounters_void_check" CHECK (("care_encounters"."voided_at" is null and "care_encounters"."voided_by" is null and "care_encounters"."void_reason" is null)
        or ("care_encounters"."voided_at" is not null and "care_encounters"."voided_by" is not null and length(trim("care_encounters"."void_reason")) between 1 and 200))
);
--> statement-breakpoint
ALTER TABLE "care_encounters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "emergencies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"calls" text,
	"transferred" boolean DEFAULT false NOT NULL,
	"transfer_destination" text,
	"status" text DEFAULT 'open' NOT NULL,
	"outcome" text,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emergencies_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "emergencies_status_check" CHECK ("emergencies"."status" in ('open', 'closed')),
	CONSTRAINT "emergencies_description_check" CHECK (length(trim("emergencies"."description")) between 1 and 2000),
	CONSTRAINT "emergencies_texts_check" CHECK (("emergencies"."calls" is null or length("emergencies"."calls") <= 2000)
        and ("emergencies"."outcome" is null or length("emergencies"."outcome") <= 2000)
        and ("emergencies"."transfer_destination" is null or length("emergencies"."transfer_destination") <= 200)),
	CONSTRAINT "emergencies_transfer_check" CHECK ("emergencies"."transferred" or "emergencies"."transfer_destination" is null),
	CONSTRAINT "emergencies_closed_check" CHECK (("emergencies"."status" = 'open' and "emergencies"."closed_at" is null and "emergencies"."closed_by" is null)
        or ("emergencies"."status" = 'closed' and "emergencies"."closed_at" is not null and "emergencies"."closed_by" is not null))
);
--> statement-breakpoint
ALTER TABLE "emergencies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"specialty_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'external' NOT NULL,
	"license_number" text,
	"phone" text,
	"institution" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "professionals_kind_check" CHECK ("professionals"."kind" in ('internal', 'external')),
	CONSTRAINT "professionals_name_check" CHECK (length(trim("professionals"."name")) between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "professionals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "specialties_organization_name_unique" UNIQUE("organization_id","name"),
	CONSTRAINT "specialties_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "specialties_name_check" CHECK (length(trim("specialties"."name")) between 1 and 60)
);
--> statement-breakpoint
ALTER TABLE "specialties" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "care_encounters" ADD CONSTRAINT "care_encounters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_encounters" ADD CONSTRAINT "care_encounters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_encounters" ADD CONSTRAINT "care_encounters_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_encounters" ADD CONSTRAINT "care_encounters_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_encounters" ADD CONSTRAINT "care_encounters_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_encounters" ADD CONSTRAINT "care_encounters_specialty_organization_fk" FOREIGN KEY ("specialty_id","organization_id") REFERENCES "public"."specialties"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_encounters" ADD CONSTRAINT "care_encounters_professional_organization_fk" FOREIGN KEY ("professional_id","organization_id") REFERENCES "public"."professionals"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_specialty_organization_fk" FOREIGN KEY ("specialty_id","organization_id") REFERENCES "public"."specialties"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialties" ADD CONSTRAINT "specialties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_encounters_site_occurred_idx" ON "care_encounters" USING btree ("site_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "care_encounters_resident_specialty_idx" ON "care_encounters" USING btree ("resident_id","specialty_id","occurred_at");--> statement-breakpoint
CREATE INDEX "care_encounters_specialty_occurred_idx" ON "care_encounters" USING btree ("specialty_id","occurred_at");--> statement-breakpoint
CREATE INDEX "emergencies_site_started_idx" ON "emergencies" USING btree ("site_id","started_at","id");--> statement-breakpoint
CREATE INDEX "emergencies_resident_started_idx" ON "emergencies" USING btree ("resident_id","started_at");--> statement-breakpoint
CREATE INDEX "emergencies_open_idx" ON "emergencies" USING btree ("site_id","started_at") WHERE "emergencies"."status" = 'open';--> statement-breakpoint
CREATE INDEX "professionals_specialty_idx" ON "professionals" USING btree ("specialty_id");--> statement-breakpoint
CREATE UNIQUE INDEX "specialties_organization_key_unique" ON "specialties" USING btree ("organization_id","key") WHERE "specialties"."key" is not null;--> statement-breakpoint
CREATE POLICY "care_encounters_select" ON "care_encounters" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.read'))));--> statement-breakpoint
CREATE POLICY "care_encounters_insert" ON "care_encounters" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.record'))));--> statement-breakpoint
CREATE POLICY "care_encounters_update" ON "care_encounters" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.record')))) WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.record'))));--> statement-breakpoint
CREATE POLICY "emergencies_select" ON "emergencies" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('emergencies.manage'))));--> statement-breakpoint
CREATE POLICY "emergencies_insert" ON "emergencies" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('emergencies.manage'))));--> statement-breakpoint
CREATE POLICY "emergencies_update" ON "emergencies" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('emergencies.manage')))) WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('emergencies.manage'))));--> statement-breakpoint
CREATE POLICY "professionals_select" ON "professionals" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.read'))));--> statement-breakpoint
CREATE POLICY "professionals_insert" ON "professionals" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.manage'))));--> statement-breakpoint
CREATE POLICY "professionals_update" ON "professionals" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.manage')))) WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.manage'))));--> statement-breakpoint
CREATE POLICY "specialties_select" ON "specialties" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.read'))));--> statement-breakpoint
CREATE POLICY "specialties_insert" ON "specialties" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.manage'))));--> statement-breakpoint
CREATE POLICY "specialties_update" ON "specialties" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.manage')))) WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('care.manage'))));