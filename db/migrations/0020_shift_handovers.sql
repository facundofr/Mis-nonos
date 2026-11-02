CREATE TABLE "shift_handover_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"handover_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"note" text,
	"delivered_by" uuid NOT NULL,
	"delivered_at" timestamp with time zone NOT NULL,
	CONSTRAINT "shift_handover_versions_handover_version_unique" UNIQUE("handover_id","version")
);
--> statement-breakpoint
ALTER TABLE "shift_handover_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shift_handovers" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"shift_id" uuid NOT NULL,
	"shift_date" date NOT NULL,
	"note" text,
	"version" integer DEFAULT 1 NOT NULL,
	"delivered_by" uuid NOT NULL,
	"delivered_at" timestamp with time zone NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shift_handovers_site_shift_date_unique" UNIQUE("site_id","shift_id","shift_date"),
	CONSTRAINT "shift_handovers_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "shift_handovers_note_check" CHECK ("shift_handovers"."note" is null or length(trim("shift_handovers"."note")) between 1 and 1000),
	CONSTRAINT "shift_handovers_version_check" CHECK ("shift_handovers"."version" >= 1),
	CONSTRAINT "shift_handovers_confirmation_check" CHECK (("shift_handovers"."confirmed_at" is null) = ("shift_handovers"."confirmed_by" is null))
);
--> statement-breakpoint
ALTER TABLE "shift_handovers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shift_handover_versions" ADD CONSTRAINT "shift_handover_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handover_versions" ADD CONSTRAINT "shift_handover_versions_delivered_by_users_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handover_versions" ADD CONSTRAINT "shift_handover_versions_handover_organization_fk" FOREIGN KEY ("handover_id","organization_id") REFERENCES "public"."shift_handovers"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_delivered_by_users_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_shift_organization_fk" FOREIGN KEY ("shift_id","organization_id") REFERENCES "public"."shifts"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shift_handovers_site_date_idx" ON "shift_handovers" USING btree ("site_id","shift_date");--> statement-breakpoint
CREATE POLICY "shift_handover_versions_select" ON "shift_handover_versions" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "shift_handover_versions_insert" ON "shift_handover_versions" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "shift_handover_versions_update" ON "shift_handover_versions" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "shift_handovers_select" ON "shift_handovers" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "shift_handovers_insert" ON "shift_handovers" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "shift_handovers_update" ON "shift_handovers" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));