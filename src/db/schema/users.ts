import {
  pgTable,
  pgSchema,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

// Get schema name based on environment
const schemaName = process.env.NODE_ENV === "production" ? "sfdc" : "dev";
const schema = pgSchema(schemaName);

export const users = schema.table("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 255 }),
  password: varchar("password", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  google_id: varchar("google_id", { length: 255 }),
  verification_code: varchar("verification_code", { length: 255 }),
  verify: integer("verify").default(0),
  dashboard: text("dashboard"),
  organization_name: varchar("organization_name", { length: 255 }),
  organization_country: varchar("organization_country", { length: 255 }),
  organization_domain: varchar("organization_domain", { length: 255 }),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 100 }).default("Admin"),
  plan: varchar("plan", { length: 100 }),
  requests_made: integer("requests_made").default(0),
  passwod_reset_token: varchar("passwod_reset_token", { length: 255 }),
  usertype: varchar("usertype", { length: 100 }),
  organisation_id: uuid("organisation_id"),
  is_super_admin: boolean("is_super_admin").default(false),
  createdDate: timestamp("createdDate").defaultNow(),
});

export const userSessions = schema.table("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull(),
  session_token: varchar("session_token", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
  expires_at: timestamp("expires_at").notNull(),
  is_valid: boolean("is_valid").default(true),
  ip: varchar("ip", { length: 45 }),
  jwt_token: text("jwt_token"),
});

export const organisations = schema.table("organisation", {
  organisation_id: uuid("organisation_id").defaultRandom().primaryKey(),
  organisation_name: varchar("organisation_name", { length: 255 }).notNull(),
  plan_id: uuid("plan_id"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  step: integer("step").default(1),
});

export const inviteMembers = schema.table("invite_members", {
  invitation_id: uuid("invitation_id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }),
  invited_by: uuid("invited_by"),
  accepted: boolean("accepted").default(false),
  organisation_id: uuid("organisation_id"),
  is_deleted: timestamp("is_deleted"),
  deleted_by: uuid("deleted_by"),
  created_date: timestamp("created_date").defaultNow(),
});

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
export type InviteMember = typeof inviteMembers.$inferSelect;
export type NewInviteMember = typeof inviteMembers.$inferInsert;
