import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const sendLog = pgTable('send_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  to: text('to').notNull(),
  provider: text('provider').notNull(),
  success: boolean('success').notNull(),
  message_id: text('message_id'),
  error_detail: text('error_detail'),
  sent_at: timestamp('sent_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  duration_ms: integer('duration_ms').notNull(),
})

export type InsertSendLog = typeof sendLog.$inferInsert
export type SelectSendLog = typeof sendLog.$inferSelect

export const emailTemplates = pgTable('email_templates', {
  category: text('category').primaryKey(),
  subject: text('subject'),
  html: text('html'),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type InsertEmailTemplate = typeof emailTemplates.$inferInsert
export type SelectEmailTemplate = typeof emailTemplates.$inferSelect
