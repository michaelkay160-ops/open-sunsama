CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"color" varchar(7) NOT NULL,
	CONSTRAINT "tags_name_check" CHECK (length(btrim("tags"."name")) > 0 AND "tags"."name" = btrim("tags"."name")),
	CONSTRAINT "tags_color_check" CHECK ("tags"."color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_tags" (
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "task_tags_user_id_task_id_tag_id_pk" PRIMARY KEY("user_id","task_id","tag_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tags_user_id_id_idx" ON "tags" USING btree ("user_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_user_id_id_idx" ON "tasks" USING btree ("user_id","id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_user_id_task_id_tasks_user_id_id_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_user_id_tag_id_tags_user_id_id_fk" FOREIGN KEY ("user_id","tag_id") REFERENCES "public"."tags"("user_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tags_user_name_idx" ON "tags" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_tags_user_tag_idx" ON "task_tags" USING btree ("user_id","tag_id","task_id");
