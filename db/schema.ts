import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const aiRateLimits = sqliteTable("ai_rate_limits", {
  key: text("key").primaryKey(),
  requestCount: integer("request_count").notNull().default(1),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("idx_ai_rate_limits_expires_at").on(table.expiresAt)]);
