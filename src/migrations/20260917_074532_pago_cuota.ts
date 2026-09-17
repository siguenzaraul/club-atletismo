import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "memberships" ADD COLUMN "payment_reported_at" timestamp(3) with time zone;
  ALTER TABLE "site_settings" ADD COLUMN "bank_iban" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "bank_holder" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "payment_notes" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "memberships" DROP COLUMN "payment_reported_at";
  ALTER TABLE "site_settings" DROP COLUMN "bank_iban";
  ALTER TABLE "site_settings" DROP COLUMN "bank_holder";
  ALTER TABLE "site_settings" DROP COLUMN "payment_notes";`)
}
