CREATE TABLE "user_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_onboarding_user_key_unique" UNIQUE("organization_id","user_id","key"),
	CONSTRAINT "user_onboarding_key_check" CHECK ("user_onboarding"."key" ~ '^[a-z][a-z0-9_:-]{1,59}$')
);
--> statement-breakpoint
ALTER TABLE "user_onboarding" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "user_onboarding_select" ON "user_onboarding" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()) and user_id = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "user_onboarding_insert" ON "user_onboarding" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()) and user_id = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "user_onboarding_update" ON "user_onboarding" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id()) and user_id = (select app.current_user_id())) WITH CHECK (organization_id = (select app.current_org_id()) and user_id = (select app.current_user_id()));