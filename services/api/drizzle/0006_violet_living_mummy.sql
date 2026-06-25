ALTER TYPE "public"."resource_kind" ADD VALUE 'meeting';--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"transcript" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"audio_content" "bytea",
	"audio_content_type" text,
	"audio_duration_sec" integer,
	"audio_size_bytes" integer,
	"audio_uploaded_at" timestamp with time zone,
	"public_slug" text,
	"visibility" "visibility_kind" DEFAULT 'private' NOT NULL,
	"published_at" timestamp with time zone,
	"last_published_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "meetings_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meetings_workspace_id_idx" ON "meetings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "meetings_created_by_user_id_idx" ON "meetings" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "meetings_public_slug_idx" ON "meetings" USING btree ("public_slug");