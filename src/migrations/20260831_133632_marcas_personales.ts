import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "members_personal_bests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"distance_meters" numeric NOT NULL,
  	"mark" varchar NOT NULL,
  	"date" timestamp(3) with time zone,
  	"event_name" varchar,
  	"mark_seconds" numeric
  );
  
  ALTER TABLE "members" ADD COLUMN "public_profile" boolean DEFAULT false;
  ALTER TABLE "members" ADD COLUMN "slug" varchar;
  ALTER TABLE "members" ADD COLUMN "public_bio" varchar;
  ALTER TABLE "events" ADD COLUMN "distance_meters" numeric;
  ALTER TABLE "results" ADD COLUMN "distance_meters" numeric;
  ALTER TABLE "results" ADD COLUMN "mark_seconds" numeric;
  ALTER TABLE "team" ADD COLUMN "member_id" integer;
  ALTER TABLE "members_personal_bests" ADD CONSTRAINT "members_personal_bests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "members_personal_bests_order_idx" ON "members_personal_bests" USING btree ("_order");
  CREATE INDEX "members_personal_bests_parent_id_idx" ON "members_personal_bests" USING btree ("_parent_id");
  ALTER TABLE "team" ADD CONSTRAINT "team_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "members_slug_idx" ON "members" USING btree ("slug");
  CREATE INDEX "results_distance_meters_idx" ON "results" USING btree ("distance_meters");
  CREATE INDEX "results_mark_seconds_idx" ON "results" USING btree ("mark_seconds");
  CREATE INDEX "team_member_idx" ON "team" USING btree ("member_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members_personal_bests" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "members_personal_bests" CASCADE;
  ALTER TABLE "team" DROP CONSTRAINT "team_member_id_members_id_fk";
  
  DROP INDEX "members_slug_idx";
  DROP INDEX "results_distance_meters_idx";
  DROP INDEX "results_mark_seconds_idx";
  DROP INDEX "team_member_idx";
  ALTER TABLE "members" DROP COLUMN "public_profile";
  ALTER TABLE "members" DROP COLUMN "slug";
  ALTER TABLE "members" DROP COLUMN "public_bio";
  ALTER TABLE "events" DROP COLUMN "distance_meters";
  ALTER TABLE "results" DROP COLUMN "distance_meters";
  ALTER TABLE "results" DROP COLUMN "mark_seconds";
  ALTER TABLE "team" DROP COLUMN "member_id";`)
}
