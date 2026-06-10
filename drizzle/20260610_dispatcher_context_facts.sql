CREATE TABLE "dispatcher_context_facts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "context_key" text NOT NULL,
  "context_value" text NOT NULL,
  "source_type" text DEFAULT 'dispatcher_entered' NOT NULL,
  "confidence" numeric(5, 4) DEFAULT '1' NOT NULL,
  "source_note" text,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dispatcher_context_facts_entity_type_check"
    CHECK ("entity_type" IN ('driver', 'organization', 'load', 'load_stop')),
  CONSTRAINT "dispatcher_context_facts_source_type_check"
    CHECK ("source_type" IN ('dispatcher_entered', 'imported', 'system_inferred', 'ai_surfaced')),
  CONSTRAINT "dispatcher_context_facts_confidence_check"
    CHECK ("confidence" >= 0 AND "confidence" <= 1)
);

ALTER TABLE "dispatcher_context_facts"
  ADD CONSTRAINT "dispatcher_context_facts_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "dispatcher_context_facts"
  ADD CONSTRAINT "dispatcher_context_facts_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE no action ON UPDATE no action;

CREATE INDEX "dispatcher_context_facts_org_entity_idx"
  ON "dispatcher_context_facts" USING btree ("organization_id", "entity_type", "entity_id");

CREATE INDEX "dispatcher_context_facts_org_key_idx"
  ON "dispatcher_context_facts" USING btree ("organization_id", "entity_type", "context_key");

CREATE UNIQUE INDEX "dispatcher_context_facts_unique_fact_idx"
  ON "dispatcher_context_facts" USING btree ("organization_id", "entity_type", "entity_id", "context_key");
