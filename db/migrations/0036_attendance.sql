CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_records_kind_check" CHECK ("attendance_records"."kind" in ('in', 'out'))
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "attendance_token" text DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_records_site_user_idx" ON "attendance_records" USING btree ("site_id","user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "attendance_records_site_occurred_idx" ON "attendance_records" USING btree ("site_id","occurred_at");--> statement-breakpoint
CREATE POLICY "attendance_records_select" ON "attendance_records" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or user_id = (select app.current_user_id()) or (select app.current_user_can('attendance.read'))));--> statement-breakpoint
CREATE POLICY "attendance_records_insert" ON "attendance_records" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()) and user_id = (select app.current_user_id()) and (select app.current_user_can('attendance.record')));