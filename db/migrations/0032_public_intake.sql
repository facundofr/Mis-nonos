ALTER TABLE "sites" ADD COLUMN "public_intake_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "public_slug" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "public_intro" text;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_public_slug_unique" UNIQUE("public_slug");--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_public_slug_check" CHECK ("sites"."public_slug" is null or ("sites"."public_slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length("sites"."public_slug") between 3 and 60));--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_public_intake_check" CHECK (not "sites"."public_intake_enabled" or "sites"."public_slug" is not null);--> statement-breakpoint
CREATE POLICY "admission_requests_public_insert" ON "admission_requests" AS PERMISSIVE FOR INSERT TO "r360_public" WITH CHECK (organization_id = (select app.current_org_id())
        and "admission_requests"."origin" = 'landing'
        and "admission_requests"."status" = 'new'
        and "admission_requests"."created_by" is null
        and "admission_requests"."updated_by" is null
        and "admission_requests"."internal_notes" is null
        and "admission_requests"."converted_admission_id" is null
        and "admission_requests"."discard_reason" is null
        and "admission_requests"."version" = 1);--> statement-breakpoint
CREATE POLICY "audit_events_public_insert" ON "audit_events" AS PERMISSIVE FOR INSERT TO "r360_public" WITH CHECK (organization_id = (select app.current_org_id())
        and "audit_events"."actor_user_id" is null
        and "audit_events"."action" = 'admission_request.created'
        and "audit_events"."entity_type" = 'admission_request');--> statement-breakpoint
CREATE POLICY "domain_events_public_insert" ON "domain_events" AS PERMISSIVE FOR INSERT TO "r360_public" WITH CHECK (organization_id = (select app.current_org_id())
        and "domain_events"."type" = 'admission_request.created'
        and "domain_events"."entity_type" = 'admission_request'
        and "domain_events"."processed_at" is null);