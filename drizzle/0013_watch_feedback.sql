CREATE TABLE "watch_feedback" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
 "match_id" uuid NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
 "actor_user_id" uuid NOT NULL REFERENCES "users"("id"),
 "own_application_id" varchar(30) NOT NULL,"offered_application_id" varchar(30) NOT NULL,"score" real NOT NULL,
 "search_id" uuid,"vote" varchar(4) NOT NULL,"rationale" text DEFAULT '' NOT NULL,
 "delivery" varchar(20) DEFAULT 'pending' NOT NULL,"version" integer DEFAULT 1 NOT NULL,"attempts" integer DEFAULT 0 NOT NULL,
 "lease_token" uuid,"lease_until" timestamp with time zone,"available_at" timestamp with time zone DEFAULT now() NOT NULL,"sent_at" timestamp with time zone,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "watch_feedback_vote_ck" CHECK("vote" IN ('up','down')),
 CONSTRAINT "watch_feedback_score_ck" CHECK("score" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "watch_feedback_judge_uq" ON "watch_feedback"("organization_id","match_id","actor_user_id");
--> statement-breakpoint
CREATE INDEX "watch_feedback_delivery_idx" ON "watch_feedback"("delivery","available_at");
--> statement-breakpoint
CREATE TRIGGER "watch_feedback_snapshot_revision" AFTER INSERT OR UPDATE OR DELETE ON "watch_feedback" FOR EACH ROW EXECUTE FUNCTION bump_snapshot_revision('watch');
