import { pgSchema, uuid, varchar, integer, timestamp, text, jsonb } from 'drizzle-orm/pg-core';

// Get schema name based on environment
const schemaName = process.env.NODE_ENV === "production" ? "audience_hub" : "audience_hub";
const schema = pgSchema(schemaName);

// Objects table - defines available data entities (unified_accounts, unified_contacts, etc.)
export const objects = schema.table('objects', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 64 }).notNull().unique(), // e.g., 'unified_accounts', 'unified_contacts'
  displayName: varchar('display_name', { length: 128 }).notNull(), // e.g., 'Companies', 'Contacts'
  description: text('description'),
  bigqueryTable: varchar('bigquery_table', { length: 256 }), // BigQuery table reference
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relationships table - defines how objects can be joined
export const relationships = schema.table('relationships', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  fromObjectId: integer('from_object_id').notNull().references(() => objects.id),
  toObjectId: integer('to_object_id').notNull().references(() => objects.id),
  joinCondition: varchar('join_condition', { length: 256 }).notNull(), // e.g., 'c.account_id = a.id'
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audiences table - saved data models connecting objects
export const audiences = schema.table('audiences', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  tenantId: varchar('tenant_id', { length: 255 }).notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Audience Objects table - defines which objects are included in an audience
export const audienceObjects = schema.table('audience_objects', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  audienceId: uuid('audience_id').notNull().references(() => audiences.id, { onDelete: 'cascade' }),
  objectId: integer('object_id').notNull().references(() => objects.id),
  alias: varchar('alias', { length: 8 }).notNull(), // e.g., 'a', 'c'
  createdAt: timestamp('created_at').defaultNow(),
});

// Cohorts table - filtered subsets of audiences
export const cohorts = schema.table('cohorts', {
  id: uuid('id').defaultRandom().primaryKey(),
  audienceId: uuid('audience_id').notNull().references(() => audiences.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  tenantId: varchar('tenant_id', { length: 255 }).notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  
  // Store filters as JSON - contains both company and contact filters
  filters: jsonb('filters').notNull().default('{"companyFilters": [], "contactFilters": []}'),
  
  // Cached counts for performance
  companyCount: integer('company_count').default(0),
  peopleCount: integer('people_count').default(0),
  
  // Status and metadata
  status: varchar('status', { length: 50 }).default('active'), // active, processing, error
  lastProcessedAt: timestamp('last_processed_at'),
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Export types for TypeScript
export type Object = typeof objects.$inferSelect;
export type NewObject = typeof objects.$inferInsert;

export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;

export type Audience = typeof audiences.$inferSelect;
export type NewAudience = typeof audiences.$inferInsert;

export type AudienceObject = typeof audienceObjects.$inferSelect;
export type NewAudienceObject = typeof audienceObjects.$inferInsert;

export type Cohort = typeof cohorts.$inferSelect;
export type NewCohort = typeof cohorts.$inferInsert;

// Filter types based on UI structure
export interface CohortFilter {
  id: string;
  category: 'company_properties' | 'company_engagement' | 'contact_properties' | 'contact_engagement';
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: string | number | string[];
  logicalOperator?: 'AND' | 'OR';
}

export interface CohortFilters {
  companyFilters: CohortFilter[];
  contactFilters: CohortFilter[];
}
