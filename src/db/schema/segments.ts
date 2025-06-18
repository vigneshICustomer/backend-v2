import {
  pgSchema,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
  jsonb,
} from "drizzle-orm/pg-core";

// Get schema name based on environment
const schemaName = process.env.NODE_ENV === "production" ? "sfdc" : "dev";
const schema = pgSchema(schemaName);

export const folders = schema.table("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  tenant_id: varchar("tenant_id", { length: 255 }).notNull(),
  root_folder: boolean("root_folder").default(false),
  childern_folders: jsonb("childern_folders").default([]),
  segments: jsonb("segments").default([]),
  is_deleted: timestamp("is_deleted"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const userFilters = schema.table("user_filters", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  filter_data: jsonb("filter_data").notNull(),
  tenant_id: varchar("tenant_id", { length: 255 }).notNull(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  model_id: uuid("model_id"),
  is_deleted: timestamp("is_deleted"),
  created_at: timestamp("created_at").defaultNow(),
});

export const audience = schema.table("audience", {
  id: uuid("id").defaultRandom().primaryKey(),
  audience_name: varchar("audience_name", { length: 255 }).notNull(),
  created_by: varchar("created_by", { length: 255 }),
  tenant_id: varchar("tenant_id", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  data_table: varchar("data_table", { length: 255 }),
  signal_info: jsonb("signal_info"),
  size: integer("size"),
  filter_data: jsonb("filter_data"),
  signals_info: jsonb("signals_info"),
  lookalike_contribution: jsonb("lookalike_contribution"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const integration = schema.table("userintegration", {
  user_id: varchar("user_id", { length: 255 }).notNull(),
  integration_id: varchar("integration_id", { length: 255 }),
  integrationname: varchar("integrationname", { length: 255 }),
  status: varchar("status", { length: 100 }),
  refresh_token: text("refresh_token"),
  createddate: timestamp("createddate").defaultNow(),
  updateddate: timestamp("updateddate").defaultNow(),
  connection_id: varchar("connection_id", { length: 255 }),
});

// Export types for TypeScript
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type UserFilter = typeof userFilters.$inferSelect;
export type NewUserFilter = typeof userFilters.$inferInsert;
export type Audience = typeof audience.$inferSelect;
export type NewAudience = typeof audience.$inferInsert;
export type Integration = typeof integration.$inferSelect;
export type NewIntegration = typeof integration.$inferInsert;
