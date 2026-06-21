CREATE TYPE "public"."canvas_asset_format" AS ENUM('svg', 'png');--> statement-breakpoint
CREATE TABLE "canvas_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"public_slug" text,
	"visibility" "visibility_kind" DEFAULT 'public' NOT NULL,
	"format" "canvas_asset_format" DEFAULT 'svg' NOT NULL,
	"width" integer,
	"height" integer,
	"content" "bytea" NOT NULL,
	"content_type" text DEFAULT 'image/svg+xml' NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "canvas_assets_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
ALTER TABLE "canvas_assets" ADD CONSTRAINT "canvas_assets_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_assets" ADD CONSTRAINT "canvas_assets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "canvas_assets_canvas_id_idx" ON "canvas_assets" USING btree ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_assets_public_slug_idx" ON "canvas_assets" USING btree ("public_slug");