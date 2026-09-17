import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Corregida a mano, que normalmente no se hace: el generador emitía
 * `DROP CONSTRAINT "payload_locked_documents_rels_equipment_packs_fk"` DESPUÉS del
 * `DROP TABLE "equipment_packs" CASCADE`, que ya se la había llevado. Postgres cortaba con
 * «constraint … does not exist» y la migración no llegaba a aplicarse nunca.
 *
 * El único cambio es añadir `IF EXISTS` a esas dos líneas: el esquema resultante es idéntico al
 * que describe el snapshot, así que no hay deriva.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "equipment_packs_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "equipment_packs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "equipment_packs_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "equipment_packs_lines" CASCADE;
  DROP TABLE "equipment_packs" CASCADE;
  DROP TABLE "equipment_packs_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_equipment_packs_fk";

  DROP INDEX IF EXISTS "payload_locked_documents_rels_equipment_packs_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "equipment_packs_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "equipment_packs_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "equipment_packs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"season_id" integer NOT NULL,
  	"applies_to_all" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "equipment_packs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"membership_types_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "equipment_packs_id" integer;
  ALTER TABLE "equipment_packs_lines" ADD CONSTRAINT "equipment_packs_lines_item_id_equipment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."equipment_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_packs_lines" ADD CONSTRAINT "equipment_packs_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."equipment_packs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "equipment_packs" ADD CONSTRAINT "equipment_packs_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_packs_rels" ADD CONSTRAINT "equipment_packs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."equipment_packs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "equipment_packs_rels" ADD CONSTRAINT "equipment_packs_rels_membership_types_fk" FOREIGN KEY ("membership_types_id") REFERENCES "public"."membership_types"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "equipment_packs_lines_order_idx" ON "equipment_packs_lines" USING btree ("_order");
  CREATE INDEX "equipment_packs_lines_parent_id_idx" ON "equipment_packs_lines" USING btree ("_parent_id");
  CREATE INDEX "equipment_packs_lines_item_idx" ON "equipment_packs_lines" USING btree ("item_id");
  CREATE INDEX "equipment_packs_season_idx" ON "equipment_packs" USING btree ("season_id");
  CREATE INDEX "equipment_packs_updated_at_idx" ON "equipment_packs" USING btree ("updated_at");
  CREATE INDEX "equipment_packs_created_at_idx" ON "equipment_packs" USING btree ("created_at");
  CREATE INDEX "equipment_packs_rels_order_idx" ON "equipment_packs_rels" USING btree ("order");
  CREATE INDEX "equipment_packs_rels_parent_idx" ON "equipment_packs_rels" USING btree ("parent_id");
  CREATE INDEX "equipment_packs_rels_path_idx" ON "equipment_packs_rels" USING btree ("path");
  CREATE INDEX "equipment_packs_rels_membership_types_id_idx" ON "equipment_packs_rels" USING btree ("membership_types_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_equipment_packs_fk" FOREIGN KEY ("equipment_packs_id") REFERENCES "public"."equipment_packs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_equipment_packs_id_idx" ON "payload_locked_documents_rels" USING btree ("equipment_packs_id");`)
}
