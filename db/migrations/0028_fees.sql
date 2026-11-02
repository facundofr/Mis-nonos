CREATE TABLE "fee_charges" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"fee_plan_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_charges_resident_due_unique" UNIQUE("resident_id","due_date"),
	CONSTRAINT "fee_charges_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "fee_charges_amount_check" CHECK ("fee_charges"."amount" > 0),
	CONSTRAINT "fee_charges_status_check" CHECK ("fee_charges"."status" in ('pending', 'paid', 'void')),
	CONSTRAINT "fee_charges_void_check" CHECK (("fee_charges"."status" = 'void') = ("fee_charges"."void_reason" is not null)),
	CONSTRAINT "fee_charges_period_check" CHECK ("fee_charges"."period_end" >= "fee_charges"."period_start")
);
--> statement-breakpoint
ALTER TABLE "fee_charges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_on" date NOT NULL,
	"method_id" uuid NOT NULL,
	"notes" text,
	"received_by" uuid NOT NULL,
	"client_request_id" uuid NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_payments_client_request_unique" UNIQUE("organization_id","client_request_id"),
	CONSTRAINT "fee_payments_amount_check" CHECK ("fee_payments"."amount" > 0),
	CONSTRAINT "fee_payments_void_check" CHECK (("fee_payments"."voided_at" is null and "fee_payments"."voided_by" is null and "fee_payments"."void_reason" is null)
        or ("fee_payments"."voided_at" is not null and "fee_payments"."voided_by" is not null and length(trim("fee_payments"."void_reason")) > 0))
);
--> statement-breakpoint
ALTER TABLE "fee_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_site_name_unique" UNIQUE("site_id","name"),
	CONSTRAINT "payment_methods_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "payment_methods_name_check" CHECK (length(trim("payment_methods"."name")) between 1 and 40)
);
--> statement-breakpoint
ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resident_fee_plans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"billing_day" integer NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_fee_plans_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "resident_fee_plans_amount_check" CHECK ("resident_fee_plans"."amount" >= 0),
	CONSTRAINT "resident_fee_plans_day_check" CHECK ("resident_fee_plans"."billing_day" between 1 and 31),
	CONSTRAINT "resident_fee_plans_dates_check" CHECK ("resident_fee_plans"."effective_to" is null or "resident_fee_plans"."effective_to" >= "resident_fee_plans"."effective_from")
);
--> statement-breakpoint
ALTER TABLE "resident_fee_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_plan_organization_fk" FOREIGN KEY ("fee_plan_id","organization_id") REFERENCES "public"."resident_fee_plans"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_charge_organization_fk" FOREIGN KEY ("charge_id","organization_id") REFERENCES "public"."fee_charges"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_method_organization_fk" FOREIGN KEY ("method_id","organization_id") REFERENCES "public"."payment_methods"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_site_organization_fk" FOREIGN KEY ("site_id","organization_id") REFERENCES "public"."sites"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_fee_plans" ADD CONSTRAINT "resident_fee_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_fee_plans" ADD CONSTRAINT "resident_fee_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_fee_plans" ADD CONSTRAINT "resident_fee_plans_resident_organization_fk" FOREIGN KEY ("resident_id","organization_id") REFERENCES "public"."residents"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fee_charges_site_due_idx" ON "fee_charges" USING btree ("site_id","due_date");--> statement-breakpoint
CREATE INDEX "fee_charges_pending_idx" ON "fee_charges" USING btree ("site_id","due_date") WHERE "fee_charges"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "fee_payments_charge_idx" ON "fee_payments" USING btree ("charge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resident_fee_plans_current_unique" ON "resident_fee_plans" USING btree ("resident_id") WHERE "resident_fee_plans"."effective_to" is null;--> statement-breakpoint
CREATE POLICY "fee_charges_select" ON "fee_charges" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.read'))));--> statement-breakpoint
CREATE POLICY "fee_charges_insert" ON "fee_charges" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.manage'))));--> statement-breakpoint
CREATE POLICY "fee_charges_update" ON "fee_charges" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.manage')))) WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.manage'))));--> statement-breakpoint
CREATE POLICY "fee_payments_select" ON "fee_payments" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.read'))));--> statement-breakpoint
CREATE POLICY "fee_payments_insert" ON "fee_payments" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.manage'))));--> statement-breakpoint
CREATE POLICY "fee_payments_update" ON "fee_payments" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.manage')))) WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.manage'))));--> statement-breakpoint
CREATE POLICY "payment_methods_select" ON "payment_methods" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "payment_methods_insert" ON "payment_methods" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "payment_methods_update" ON "payment_methods" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id())) WITH CHECK (organization_id = (select app.current_org_id()));--> statement-breakpoint
CREATE POLICY "resident_fee_plans_select" ON "resident_fee_plans" AS PERMISSIVE FOR SELECT TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.read'))));--> statement-breakpoint
CREATE POLICY "resident_fee_plans_insert" ON "resident_fee_plans" AS PERMISSIVE FOR INSERT TO "r360_app" WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.manage'))));--> statement-breakpoint
CREATE POLICY "resident_fee_plans_update" ON "resident_fee_plans" AS PERMISSIVE FOR UPDATE TO "r360_app" USING (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.manage')))) WITH CHECK (organization_id = (select app.current_org_id()) and ((select app.current_user_id()) is null or (select app.current_user_can('fees.manage'))));