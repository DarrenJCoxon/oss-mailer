CREATE TABLE "send_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"to" text NOT NULL,
	"provider" text NOT NULL,
	"success" boolean NOT NULL,
	"message_id" text,
	"error_detail" text,
	"sent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_ms" integer NOT NULL
);
