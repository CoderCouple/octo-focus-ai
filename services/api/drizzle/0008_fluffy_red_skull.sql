ALTER TYPE "public"."resource_kind" ADD VALUE 'figure';--> statement-breakpoint
CREATE TABLE "figures" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"dsl" text NOT NULL,
	"public_slug" text,
	"visibility" "visibility_kind" DEFAULT 'unlisted' NOT NULL,
	"published_at" timestamp with time zone,
	"last_published_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "figures_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
ALTER TABLE "figures" ADD CONSTRAINT "figures_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "figures" ADD CONSTRAINT "figures_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "figures_workspace_id_idx" ON "figures" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "figures_created_by_user_id_idx" ON "figures" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "figures_public_slug_idx" ON "figures" USING btree ("public_slug");