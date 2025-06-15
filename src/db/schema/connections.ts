import { pgSchema, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// Get schema name based on environment
const schemaName = process.env.NODE_ENV === "production" ? "sfdc" : "dev";
const schema = pgSchema(schemaName);

// Connections table schema
export const connections = schema.table('connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  organisationId: varchar('organisation_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('bigquery'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  credentialsPath: text('credentials_path'),
  credentialsEncrypted: text('credentials_encrypted').notNull(),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    organisationIdIdx: index('idx_connections_organisation_id').on(table.organisationId),
    typeIdx: index('idx_connections_type').on(table.type),
    statusIdx: index('idx_connections_status').on(table.status),
  };
});

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
