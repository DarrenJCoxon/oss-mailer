CREATE TABLE IF NOT EXISTS "email_templates" (
  "category" text PRIMARY KEY NOT NULL,
  "subject" text,
  "html" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
