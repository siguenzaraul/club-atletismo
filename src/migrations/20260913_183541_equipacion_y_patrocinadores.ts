import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "equipment_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"public_label" varchar,
  	"description" varchar,
  	"exclusive" boolean DEFAULT true,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "registration_form_garments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"required" boolean DEFAULT true,
  	"ask_size" boolean DEFAULT true,
  	"help" varchar
  );
  
  CREATE TABLE "registration_form" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"intro" varchar,
  	"phone_enabled" boolean DEFAULT true,
  	"phone_required" boolean DEFAULT true,
  	"membership_type_enabled" boolean DEFAULT true,
  	"membership_type_required" boolean DEFAULT false,
  	"reserve_stock" boolean DEFAULT true,
  	"allow_overbooking" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "sponsors" ADD COLUMN "order" numeric DEFAULT 0;
  ALTER TABLE "sponsors" ADD COLUMN "active" boolean DEFAULT true;
  ALTER TABLE "sizes" ADD COLUMN "active" boolean DEFAULT true;
  ALTER TABLE "equipment_items" ADD COLUMN "category_id" integer;
  ALTER TABLE "equipment_deliveries" ADD COLUMN "category_id" integer;
  ALTER TABLE "equipment_deliveries" ADD COLUMN "slot_key" varchar;
  ALTER TABLE "equipment_deliveries" ADD COLUMN "source" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "equipment_categories_id" integer;
  ALTER TABLE "registration_form_garments" ADD CONSTRAINT "registration_form_garments_category_id_equipment_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registration_form_garments" ADD CONSTRAINT "registration_form_garments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."registration_form"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "equipment_categories_slug_idx" ON "equipment_categories" USING btree ("slug");
  CREATE INDEX "equipment_categories_updated_at_idx" ON "equipment_categories" USING btree ("updated_at");
  CREATE INDEX "equipment_categories_created_at_idx" ON "equipment_categories" USING btree ("created_at");
  CREATE INDEX "registration_form_garments_order_idx" ON "registration_form_garments" USING btree ("_order");
  CREATE INDEX "registration_form_garments_parent_id_idx" ON "registration_form_garments" USING btree ("_parent_id");
  CREATE INDEX "registration_form_garments_category_idx" ON "registration_form_garments" USING btree ("category_id");
  ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_category_id_equipment_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_deliveries" ADD CONSTRAINT "equipment_deliveries_category_id_equipment_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_equipment_categories_fk" FOREIGN KEY ("equipment_categories_id") REFERENCES "public"."equipment_categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "equipment_items_category_idx" ON "equipment_items" USING btree ("category_id");
  CREATE INDEX "equipment_deliveries_category_idx" ON "equipment_deliveries" USING btree ("category_id");
  CREATE UNIQUE INDEX "equipment_deliveries_slot_key_idx" ON "equipment_deliveries" USING btree ("slot_key");
  CREATE INDEX "payload_locked_documents_rels_equipment_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("equipment_categories_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "equipment_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "registration_form_garments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "registration_form" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "equipment_categories" CASCADE;
  DROP TABLE "registration_form_garments" CASCADE;
  DROP TABLE "registration_form" CASCADE;
  ALTER TABLE "equipment_items" DROP CONSTRAINT "equipment_items_category_id_equipment_categories_id_fk";
  
  ALTER TABLE "equipment_deliveries" DROP CONSTRAINT "equipment_deliveries_category_id_equipment_categories_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_equipment_categories_fk";
  
  DROP INDEX "equipment_items_category_idx";
  DROP INDEX "equipment_deliveries_category_idx";
  DROP INDEX "equipment_deliveries_slot_key_idx";
  DROP INDEX "payload_locked_documents_rels_equipment_categories_id_idx";
  ALTER TABLE "sponsors" DROP COLUMN "order";
  ALTER TABLE "sponsors" DROP COLUMN "active";
  ALTER TABLE "sizes" DROP COLUMN "active";
  ALTER TABLE "equipment_items" DROP COLUMN "category_id";
  ALTER TABLE "equipment_deliveries" DROP COLUMN "category_id";
  ALTER TABLE "equipment_deliveries" DROP COLUMN "slot_key";
  ALTER TABLE "equipment_deliveries" DROP COLUMN "source";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "equipment_categories_id";`)
}
