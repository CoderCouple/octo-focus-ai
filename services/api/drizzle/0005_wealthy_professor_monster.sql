-- Dev-only: createdByUserId is NOT NULL, but existing rows have no value
-- to backfill. Wipe content (projects cascade to pages + canvases via
-- their projectId FK; ai_runs / agents don't cascade so we clear them
-- by hand; shares + share_links reference by free-form resourceKind +
-- resourceId so we wipe those too). Safe because we are pre-production.
DELETE FROM "ai_runs" WHERE "project_id" IS NOT NULL OR "page_id" IS NOT NULL OR "canvas_id" IS NOT NULL;--> statement-breakpoint
DELETE FROM "resource_shares" WHERE "resource_kind" IN ('project','page','canvas');--> statement-breakpoint
DELETE FROM "share_links" WHERE "resource_kind" IN ('project','page','canvas');--> statement-breakpoint
DELETE FROM "projects";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "canvases" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvases" ADD CONSTRAINT "canvases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_created_by_user_id_idx" ON "projects" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "pages_created_by_user_id_idx" ON "pages" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "canvases_created_by_user_id_idx" ON "canvases" USING btree ("created_by_user_id");