import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('es');
  CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_members_category" AS ENUM('sub18', 'senior', 'master', 'popular');
  CREATE TYPE "public"."enum_members_membership_status" AS ENUM('pending', 'active', 'inactive');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_events_categories" AS ENUM('sub18', 'senior', 'master', 'popular');
  CREATE TYPE "public"."enum_events_series" AS ENUM('carrera-principal', 'social-run', 'club', 'carrera-externa');
  CREATE TYPE "public"."enum_event_registrations_category" AS ENUM('sub18', 'senior', 'master', 'popular');
  CREATE TYPE "public"."enum_event_registrations_status" AS ENUM('pending', 'confirmed', 'cancelled');
  CREATE TYPE "public"."enum_results_category" AS ENUM('sub18', 'senior', 'master', 'popular');
  CREATE TYPE "public"."enum_sponsors_tier" AS ENUM('principal', 'oro', 'plata', 'bronce', 'colaborador');
  CREATE TYPE "public"."enum_membership_types_period" AS ENUM('temporada', 'anual', 'mensual');
  CREATE TYPE "public"."enum_memberships_payment_status" AS ENUM('pending', 'paid', 'exempt', 'cancelled');
  CREATE TYPE "public"."enum_attribute_definitions_type" AS ENUM('text', 'longtext', 'number', 'date', 'boolean', 'select', 'file');
  CREATE TYPE "public"."enum_equipment_deliveries_status" AS ENUM('requested', 'reserved', 'delivered', 'returned');
  CREATE TYPE "public"."enum_equipment_deliveries_payment" AS ENUM('included', 'paid', 'pending');
  CREATE TYPE "public"."enum_contact_messages_subject" AS ENUM('general', 'inscripciones', 'patrocinio', 'socios');
  CREATE TYPE "public"."enum_home_page_hero_theme" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum_home_page_hero_overlay" AS ENUM('none', 'subtle', 'medium', 'strong');
  CREATE TYPE "public"."enum_home_page_hero_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_home_page_hero_height" AS ENUM('compact', 'medium', 'tall');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "members_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"category" "enum_members_category" DEFAULT 'popular',
  	"federation_number" varchar,
  	"phone" varchar,
  	"image_rights_accepted" boolean DEFAULT false,
  	"image_rights_accepted_at" timestamp(3) with time zone,
  	"photo_id" integer,
  	"current_membership_type_id" integer,
  	"membership_status" "enum_members_membership_status" DEFAULT 'pending',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"cover_id" integer,
  	"excerpt" varchar,
  	"content" jsonb,
  	"status" "enum_posts_status" DEFAULT 'draft',
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_categories" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_events_categories",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"series" "enum_events_series" DEFAULT 'club' NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"location" varchar,
  	"image_id" integer,
  	"description" jsonb,
  	"registration_open" boolean DEFAULT false,
  	"capacity" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sponsors_id" integer
  );
  
  CREATE TABLE "event_registrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"member_id" integer,
  	"category" "enum_event_registrations_category",
  	"status" "enum_event_registrations_status" DEFAULT 'pending',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "results" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"member_id" integer,
  	"athlete_name" varchar NOT NULL,
  	"dorsal" numeric,
  	"position" numeric,
  	"mark" varchar,
  	"category" "enum_results_category",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar,
  	"photo_id" integer,
  	"bio" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sponsors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"logo_id" integer,
  	"url" varchar,
  	"tier" "enum_sponsors_tier" DEFAULT 'colaborador' NOT NULL,
  	"global" boolean DEFAULT false,
  	"club_sponsor" boolean DEFAULT false,
  	"main_race_sponsor" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "seasons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"is_current" boolean DEFAULT false,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "membership_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"requires_payment" boolean DEFAULT true,
  	"amount" numeric,
  	"period" "enum_membership_types_period" DEFAULT 'temporada',
  	"includes" varchar,
  	"show_on_website" boolean DEFAULT false,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "memberships" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"season_id" integer NOT NULL,
  	"type_id" integer,
  	"payment_status" "enum_memberships_payment_status" DEFAULT 'pending',
  	"paid_at" timestamp(3) with time zone,
  	"amount" numeric,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attribute_definitions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "attribute_definitions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"slug" varchar,
  	"type" "enum_attribute_definitions_type" DEFAULT 'text' NOT NULL,
  	"group" varchar DEFAULT 'General',
  	"visible_to_member" boolean DEFAULT true,
  	"editable_by_member" boolean DEFAULT false,
  	"required" boolean DEFAULT false,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "member_attributes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"definition_id" integer NOT NULL,
  	"label" varchar,
  	"value_text" varchar,
  	"value_longtext" varchar,
  	"value_number" numeric,
  	"value_date" timestamp(3) with time zone,
  	"value_boolean" boolean,
  	"value_option" varchar,
  	"value_file_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "size_scales" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sizes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"scale_id" integer NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "equipment_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"size_scale_id" integer NOT NULL,
  	"description" varchar,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "equipment_stock" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"size_id" integer NOT NULL,
  	"season_id" integer NOT NULL,
  	"quantity_total" numeric DEFAULT 0,
  	"quantity_delivered" numeric DEFAULT 0,
  	"quantity_reserved" numeric DEFAULT 0,
  	"quantity_available" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "equipment_deliveries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"season_id" integer NOT NULL,
  	"item_id" integer NOT NULL,
  	"size_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"status" "enum_equipment_deliveries_status" DEFAULT 'requested',
  	"payment" "enum_equipment_deliveries_payment" DEFAULT 'included',
  	"delivered_at" timestamp(3) with time zone,
  	"label" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
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
  
  CREATE TABLE "contact_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"subject" "enum_contact_messages_subject" DEFAULT 'general',
  	"message" varchar NOT NULL,
  	"handled" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"members_id" integer,
  	"media_id" integer,
  	"posts_id" integer,
  	"events_id" integer,
  	"event_registrations_id" integer,
  	"results_id" integer,
  	"team_id" integer,
  	"sponsors_id" integer,
  	"seasons_id" integer,
  	"membership_types_id" integer,
  	"memberships_id" integer,
  	"attribute_definitions_id" integer,
  	"member_attributes_id" integer,
  	"size_scales_id" integer,
  	"sizes_id" integer,
  	"equipment_items_id" integer,
  	"equipment_stock_id" integer,
  	"equipment_deliveries_id" integer,
  	"equipment_packs_id" integer,
  	"contact_messages_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"members_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_eyebrow" varchar DEFAULT 'Albatera · Alicante',
  	"hero_title" varchar DEFAULT 'Club de Running Albatera',
  	"hero_subtitle" varchar DEFAULT 'Un objetivo, un municipio, un deporte.',
  	"hero_image_id" integer,
  	"hero_foreground_image_id" integer,
  	"hero_show_brand_pattern" boolean DEFAULT true,
  	"hero_theme" "enum_home_page_hero_theme" DEFAULT 'dark',
  	"hero_overlay" "enum_home_page_hero_overlay" DEFAULT 'medium',
  	"hero_align" "enum_home_page_hero_align" DEFAULT 'left',
  	"hero_height" "enum_home_page_hero_height" DEFAULT 'medium',
  	"hero_primary_label" varchar DEFAULT 'Hazte socio',
  	"hero_primary_href" varchar DEFAULT '/hazte-socio',
  	"hero_secondary_label" varchar DEFAULT 'Próximos eventos',
  	"hero_secondary_href" varchar DEFAULT '/eventos',
  	"about_title" varchar DEFAULT 'Sobre el club',
  	"about_body" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"instagram" varchar,
  	"facebook" varchar,
  	"strava" varchar,
  	"logo_light_id" integer,
  	"logo_dark_id" integer,
  	"brand_primary" varchar,
  	"brand_secondary" varchar,
  	"brand_accent" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_sessions" ADD CONSTRAINT "members_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_current_membership_type_id_membership_types_id_fk" FOREIGN KEY ("current_membership_type_id") REFERENCES "public"."membership_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_categories" ADD CONSTRAINT "events_categories_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_sponsors_fk" FOREIGN KEY ("sponsors_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "results" ADD CONSTRAINT "results_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "results" ADD CONSTRAINT "results_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team" ADD CONSTRAINT "team_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_type_id_membership_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."membership_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attribute_definitions_options" ADD CONSTRAINT "attribute_definitions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "member_attributes" ADD CONSTRAINT "member_attributes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "member_attributes" ADD CONSTRAINT "member_attributes_definition_id_attribute_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "member_attributes" ADD CONSTRAINT "member_attributes_value_file_id_media_id_fk" FOREIGN KEY ("value_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sizes" ADD CONSTRAINT "sizes_scale_id_size_scales_id_fk" FOREIGN KEY ("scale_id") REFERENCES "public"."size_scales"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_size_scale_id_size_scales_id_fk" FOREIGN KEY ("size_scale_id") REFERENCES "public"."size_scales"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_stock" ADD CONSTRAINT "equipment_stock_item_id_equipment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."equipment_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_stock" ADD CONSTRAINT "equipment_stock_size_id_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."sizes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_stock" ADD CONSTRAINT "equipment_stock_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_deliveries" ADD CONSTRAINT "equipment_deliveries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_deliveries" ADD CONSTRAINT "equipment_deliveries_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_deliveries" ADD CONSTRAINT "equipment_deliveries_item_id_equipment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."equipment_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_deliveries" ADD CONSTRAINT "equipment_deliveries_size_id_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."sizes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_packs_lines" ADD CONSTRAINT "equipment_packs_lines_item_id_equipment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."equipment_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_packs_lines" ADD CONSTRAINT "equipment_packs_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."equipment_packs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "equipment_packs" ADD CONSTRAINT "equipment_packs_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_packs_rels" ADD CONSTRAINT "equipment_packs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."equipment_packs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "equipment_packs_rels" ADD CONSTRAINT "equipment_packs_rels_membership_types_fk" FOREIGN KEY ("membership_types_id") REFERENCES "public"."membership_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_registrations_fk" FOREIGN KEY ("event_registrations_id") REFERENCES "public"."event_registrations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_results_fk" FOREIGN KEY ("results_id") REFERENCES "public"."results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sponsors_fk" FOREIGN KEY ("sponsors_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_seasons_fk" FOREIGN KEY ("seasons_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_membership_types_fk" FOREIGN KEY ("membership_types_id") REFERENCES "public"."membership_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_memberships_fk" FOREIGN KEY ("memberships_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attribute_definitions_fk" FOREIGN KEY ("attribute_definitions_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_member_attributes_fk" FOREIGN KEY ("member_attributes_id") REFERENCES "public"."member_attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_size_scales_fk" FOREIGN KEY ("size_scales_id") REFERENCES "public"."size_scales"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sizes_fk" FOREIGN KEY ("sizes_id") REFERENCES "public"."sizes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_equipment_items_fk" FOREIGN KEY ("equipment_items_id") REFERENCES "public"."equipment_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_equipment_stock_fk" FOREIGN KEY ("equipment_stock_id") REFERENCES "public"."equipment_stock"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_equipment_deliveries_fk" FOREIGN KEY ("equipment_deliveries_id") REFERENCES "public"."equipment_deliveries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_equipment_packs_fk" FOREIGN KEY ("equipment_packs_id") REFERENCES "public"."equipment_packs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_messages_fk" FOREIGN KEY ("contact_messages_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_hero_foreground_image_id_media_id_fk" FOREIGN KEY ("hero_foreground_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_light_id_media_id_fk" FOREIGN KEY ("logo_light_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "members_sessions_order_idx" ON "members_sessions" USING btree ("_order");
  CREATE INDEX "members_sessions_parent_id_idx" ON "members_sessions" USING btree ("_parent_id");
  CREATE INDEX "members_photo_idx" ON "members" USING btree ("photo_id");
  CREATE INDEX "members_current_membership_type_idx" ON "members" USING btree ("current_membership_type_id");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE UNIQUE INDEX "members_email_idx" ON "members" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_cover_idx" ON "posts" USING btree ("cover_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "events_categories_order_idx" ON "events_categories" USING btree ("order");
  CREATE INDEX "events_categories_parent_idx" ON "events_categories" USING btree ("parent_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_image_idx" ON "events" USING btree ("image_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_sponsors_id_idx" ON "events_rels" USING btree ("sponsors_id");
  CREATE INDEX "event_registrations_event_idx" ON "event_registrations" USING btree ("event_id");
  CREATE INDEX "event_registrations_member_idx" ON "event_registrations" USING btree ("member_id");
  CREATE INDEX "event_registrations_updated_at_idx" ON "event_registrations" USING btree ("updated_at");
  CREATE INDEX "event_registrations_created_at_idx" ON "event_registrations" USING btree ("created_at");
  CREATE UNIQUE INDEX "event_member_idx" ON "event_registrations" USING btree ("event_id","member_id");
  CREATE INDEX "results_event_idx" ON "results" USING btree ("event_id");
  CREATE INDEX "results_member_idx" ON "results" USING btree ("member_id");
  CREATE INDEX "results_updated_at_idx" ON "results" USING btree ("updated_at");
  CREATE INDEX "results_created_at_idx" ON "results" USING btree ("created_at");
  CREATE INDEX "team_photo_idx" ON "team" USING btree ("photo_id");
  CREATE INDEX "team_updated_at_idx" ON "team" USING btree ("updated_at");
  CREATE INDEX "team_created_at_idx" ON "team" USING btree ("created_at");
  CREATE INDEX "sponsors_logo_idx" ON "sponsors" USING btree ("logo_id");
  CREATE INDEX "sponsors_updated_at_idx" ON "sponsors" USING btree ("updated_at");
  CREATE INDEX "sponsors_created_at_idx" ON "sponsors" USING btree ("created_at");
  CREATE UNIQUE INDEX "seasons_slug_idx" ON "seasons" USING btree ("slug");
  CREATE INDEX "seasons_updated_at_idx" ON "seasons" USING btree ("updated_at");
  CREATE INDEX "seasons_created_at_idx" ON "seasons" USING btree ("created_at");
  CREATE UNIQUE INDEX "membership_types_slug_idx" ON "membership_types" USING btree ("slug");
  CREATE INDEX "membership_types_updated_at_idx" ON "membership_types" USING btree ("updated_at");
  CREATE INDEX "membership_types_created_at_idx" ON "membership_types" USING btree ("created_at");
  CREATE INDEX "memberships_member_idx" ON "memberships" USING btree ("member_id");
  CREATE INDEX "memberships_season_idx" ON "memberships" USING btree ("season_id");
  CREATE INDEX "memberships_type_idx" ON "memberships" USING btree ("type_id");
  CREATE INDEX "memberships_updated_at_idx" ON "memberships" USING btree ("updated_at");
  CREATE INDEX "memberships_created_at_idx" ON "memberships" USING btree ("created_at");
  CREATE UNIQUE INDEX "member_season_idx" ON "memberships" USING btree ("member_id","season_id");
  CREATE INDEX "attribute_definitions_options_order_idx" ON "attribute_definitions_options" USING btree ("_order");
  CREATE INDEX "attribute_definitions_options_parent_id_idx" ON "attribute_definitions_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "attribute_definitions_slug_idx" ON "attribute_definitions" USING btree ("slug");
  CREATE INDEX "attribute_definitions_updated_at_idx" ON "attribute_definitions" USING btree ("updated_at");
  CREATE INDEX "attribute_definitions_created_at_idx" ON "attribute_definitions" USING btree ("created_at");
  CREATE INDEX "member_attributes_member_idx" ON "member_attributes" USING btree ("member_id");
  CREATE INDEX "member_attributes_definition_idx" ON "member_attributes" USING btree ("definition_id");
  CREATE INDEX "member_attributes_value_file_idx" ON "member_attributes" USING btree ("value_file_id");
  CREATE INDEX "member_attributes_updated_at_idx" ON "member_attributes" USING btree ("updated_at");
  CREATE INDEX "member_attributes_created_at_idx" ON "member_attributes" USING btree ("created_at");
  CREATE UNIQUE INDEX "member_definition_idx" ON "member_attributes" USING btree ("member_id","definition_id");
  CREATE UNIQUE INDEX "size_scales_slug_idx" ON "size_scales" USING btree ("slug");
  CREATE INDEX "size_scales_updated_at_idx" ON "size_scales" USING btree ("updated_at");
  CREATE INDEX "size_scales_created_at_idx" ON "size_scales" USING btree ("created_at");
  CREATE INDEX "sizes_scale_idx" ON "sizes" USING btree ("scale_id");
  CREATE INDEX "sizes_updated_at_idx" ON "sizes" USING btree ("updated_at");
  CREATE INDEX "sizes_created_at_idx" ON "sizes" USING btree ("created_at");
  CREATE UNIQUE INDEX "equipment_items_slug_idx" ON "equipment_items" USING btree ("slug");
  CREATE INDEX "equipment_items_size_scale_idx" ON "equipment_items" USING btree ("size_scale_id");
  CREATE INDEX "equipment_items_updated_at_idx" ON "equipment_items" USING btree ("updated_at");
  CREATE INDEX "equipment_items_created_at_idx" ON "equipment_items" USING btree ("created_at");
  CREATE INDEX "equipment_stock_item_idx" ON "equipment_stock" USING btree ("item_id");
  CREATE INDEX "equipment_stock_size_idx" ON "equipment_stock" USING btree ("size_id");
  CREATE INDEX "equipment_stock_season_idx" ON "equipment_stock" USING btree ("season_id");
  CREATE INDEX "equipment_stock_updated_at_idx" ON "equipment_stock" USING btree ("updated_at");
  CREATE INDEX "equipment_stock_created_at_idx" ON "equipment_stock" USING btree ("created_at");
  CREATE UNIQUE INDEX "item_size_season_idx" ON "equipment_stock" USING btree ("item_id","size_id","season_id");
  CREATE INDEX "equipment_deliveries_member_idx" ON "equipment_deliveries" USING btree ("member_id");
  CREATE INDEX "equipment_deliveries_season_idx" ON "equipment_deliveries" USING btree ("season_id");
  CREATE INDEX "equipment_deliveries_item_idx" ON "equipment_deliveries" USING btree ("item_id");
  CREATE INDEX "equipment_deliveries_size_idx" ON "equipment_deliveries" USING btree ("size_id");
  CREATE INDEX "equipment_deliveries_updated_at_idx" ON "equipment_deliveries" USING btree ("updated_at");
  CREATE INDEX "equipment_deliveries_created_at_idx" ON "equipment_deliveries" USING btree ("created_at");
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
  CREATE INDEX "contact_messages_updated_at_idx" ON "contact_messages" USING btree ("updated_at");
  CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_event_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("event_registrations_id");
  CREATE INDEX "payload_locked_documents_rels_results_id_idx" ON "payload_locked_documents_rels" USING btree ("results_id");
  CREATE INDEX "payload_locked_documents_rels_team_id_idx" ON "payload_locked_documents_rels" USING btree ("team_id");
  CREATE INDEX "payload_locked_documents_rels_sponsors_id_idx" ON "payload_locked_documents_rels" USING btree ("sponsors_id");
  CREATE INDEX "payload_locked_documents_rels_seasons_id_idx" ON "payload_locked_documents_rels" USING btree ("seasons_id");
  CREATE INDEX "payload_locked_documents_rels_membership_types_id_idx" ON "payload_locked_documents_rels" USING btree ("membership_types_id");
  CREATE INDEX "payload_locked_documents_rels_memberships_id_idx" ON "payload_locked_documents_rels" USING btree ("memberships_id");
  CREATE INDEX "payload_locked_documents_rels_attribute_definitions_id_idx" ON "payload_locked_documents_rels" USING btree ("attribute_definitions_id");
  CREATE INDEX "payload_locked_documents_rels_member_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("member_attributes_id");
  CREATE INDEX "payload_locked_documents_rels_size_scales_id_idx" ON "payload_locked_documents_rels" USING btree ("size_scales_id");
  CREATE INDEX "payload_locked_documents_rels_sizes_id_idx" ON "payload_locked_documents_rels" USING btree ("sizes_id");
  CREATE INDEX "payload_locked_documents_rels_equipment_items_id_idx" ON "payload_locked_documents_rels" USING btree ("equipment_items_id");
  CREATE INDEX "payload_locked_documents_rels_equipment_stock_id_idx" ON "payload_locked_documents_rels" USING btree ("equipment_stock_id");
  CREATE INDEX "payload_locked_documents_rels_equipment_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("equipment_deliveries_id");
  CREATE INDEX "payload_locked_documents_rels_equipment_packs_id_idx" ON "payload_locked_documents_rels" USING btree ("equipment_packs_id");
  CREATE INDEX "payload_locked_documents_rels_contact_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_messages_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_members_id_idx" ON "payload_preferences_rels" USING btree ("members_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "home_page_hero_image_idx" ON "home_page" USING btree ("hero_image_id");
  CREATE INDEX "home_page_hero_foreground_image_idx" ON "home_page" USING btree ("hero_foreground_image_id");
  CREATE INDEX "site_settings_logo_light_idx" ON "site_settings" USING btree ("logo_light_id");
  CREATE INDEX "site_settings_logo_dark_idx" ON "site_settings" USING btree ("logo_dark_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "members_sessions" CASCADE;
  DROP TABLE "members" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "events_categories" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_rels" CASCADE;
  DROP TABLE "event_registrations" CASCADE;
  DROP TABLE "results" CASCADE;
  DROP TABLE "team" CASCADE;
  DROP TABLE "sponsors" CASCADE;
  DROP TABLE "seasons" CASCADE;
  DROP TABLE "membership_types" CASCADE;
  DROP TABLE "memberships" CASCADE;
  DROP TABLE "attribute_definitions_options" CASCADE;
  DROP TABLE "attribute_definitions" CASCADE;
  DROP TABLE "member_attributes" CASCADE;
  DROP TABLE "size_scales" CASCADE;
  DROP TABLE "sizes" CASCADE;
  DROP TABLE "equipment_items" CASCADE;
  DROP TABLE "equipment_stock" CASCADE;
  DROP TABLE "equipment_deliveries" CASCADE;
  DROP TABLE "equipment_packs_lines" CASCADE;
  DROP TABLE "equipment_packs" CASCADE;
  DROP TABLE "equipment_packs_rels" CASCADE;
  DROP TABLE "contact_messages" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_members_category";
  DROP TYPE "public"."enum_members_membership_status";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum_events_categories";
  DROP TYPE "public"."enum_events_series";
  DROP TYPE "public"."enum_event_registrations_category";
  DROP TYPE "public"."enum_event_registrations_status";
  DROP TYPE "public"."enum_results_category";
  DROP TYPE "public"."enum_sponsors_tier";
  DROP TYPE "public"."enum_membership_types_period";
  DROP TYPE "public"."enum_memberships_payment_status";
  DROP TYPE "public"."enum_attribute_definitions_type";
  DROP TYPE "public"."enum_equipment_deliveries_status";
  DROP TYPE "public"."enum_equipment_deliveries_payment";
  DROP TYPE "public"."enum_contact_messages_subject";
  DROP TYPE "public"."enum_home_page_hero_theme";
  DROP TYPE "public"."enum_home_page_hero_overlay";
  DROP TYPE "public"."enum_home_page_hero_align";
  DROP TYPE "public"."enum_home_page_hero_height";`)
}
