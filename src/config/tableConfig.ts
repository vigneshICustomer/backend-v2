// Table configuration based on environment
const schemaName = process.env.NODE_ENV === "production" ? "sfdc" : "dev";

export interface TableConfig {
  schemaTableName: string;
  [key: string]: string;
}

export const usersTable: TableConfig = {
  schemaTableName: `${schemaName}.users`,
  id: "id",
  username: "username",
  password: "password",
  email: "email",
  google_id: "google_id",
  verification_code: "verification_code",
  verify: "verify",
  dashboard: "dashboard",
  organization_name: "organization_name",
  organization_country: "organization_country",
  organization_domain: "organization_domain",
  name: "name",
  role: "role",
  plan: "plan",
  requests_made: "requests_made",
  passwod_reset_token: "passwod_reset_token",
  usertype: "usertype",
  organisation_id: "organisation_id",
  is_super_admin: "is_super_admin",
  createdDate: "createdDate"
};

export const userSessionsTable: TableConfig = {
  schemaTableName: `${schemaName}.user_sessions`,
  id: "id",
  user_id: "user_id",
  session_token: "session_token",
  created_at: "created_at",
  expires_at: "expires_at",
  is_valid: "is_valid",
  ip: "ip",
  jwt_token: "jwt_token"
};

export const userAuthTable: TableConfig = {
  schemaTableName: "copilot_api.user_auth",
  user_id: "user_id",
  oauth_token: "oauth_token",
  allotedcredits: "alloted_credits", 
  remaining_credits: "remaining_credits"
};

export const organisationTable: TableConfig = {
  schemaTableName: `${schemaName}.organisation`,
  organisation_id: "organisation_id",
  organisation_name: "organisation_name",
  plan_id: "plan_id",
  created_at: "created_at",
  updated_at: "updated_at",
  step: "step"
};

export const inviteMemberTable: TableConfig = {
  schemaTableName: `${schemaName}.invite_members`,
  invitation_id: "invitation_id",
  email: "email",
  role: "role",
  invited_by: "invited_by",
  accepted: "accepted",
  organisation_id: "organisation_id",
  is_deleted: "is_deleted",
  deleted_by: "deleted_by",
  created_date: "created_date"
};

export const tenantTable: TableConfig = {
  schemaTableName: `${schemaName}.tenant`,
  tenantname: "tenantname",
  userids: "userids",
  firstuserid: "firstuserid",
  firsttimeregdate: "firsttimeregdate",
  subscriptionstatus: "subscriptionstatus",
  subscriptiontype: "subscriptiontype",
  subscriptionstartdate: "subscriptionstartdate",
  subscriptionexpdate: "subscriptionexpdate",
  allotedcredits: "allotedcredits",
  remainingcredits: "remainingcredits",
  createddate: "createddate",
  updateddate: "updateddate",
  tenantid: "tenantid",
};

export const chatTable: TableConfig = {
  schemaTableName: `${schemaName}.chat`,
  id: "id",
  chat_name: "chat_name",
  current_timestamp: "current_timestamp",
  is_deleted: "is_deleted",
  user_id: "user_id"
};

export const chatV4Table: TableConfig = {
  schemaTableName: `${schemaName}.chat_v4`,
  session_id: "session_id",
  chat_name: "chat_name",
  chat_array: "chat_array",
  user_id: "user_id",
  tenant_name: "tenant_name",
  is_fileAttached: "is_file_attached",
  file_table_name: "file_table_name",
  is_enriched: "is_enriched",
  enriched_table_name: "enriched_table_name",
  schema_name: "schema_name",
  query: "query",
  flag: "flag",
  async_out: "async_out",
  created_date: "created_date",
  is_starred: "is_starred",
  file: "files",
  reports: "reports", 
  dashboard: "dashboard",
  report_list: "report_list",
  file_list: "file_list",
};

export const audienceTable: TableConfig = {
  schemaTableName: `${schemaName}.audience`,
  id: "id",
  audience_name: "audience_name",
  created_by: "created_by",
  tenant_id: "tenant_id",
  created_at: "created_at",
  data_table: "data_table",
  signal_info: 'signal_info',
  size: "size",
  filter_data: "filter_data",
  signals_info: "signals_info",
  lookalike_contribution: "lookalike_contribution",
  updated_at: "updated_at"
};

export const accountLockingTable: TableConfig = {
  schemaTableName: `${schemaName}.account_locking`,
  id: "id",
  ip: "ip",
  tries: "tries",
  timestamp: "timestamp"
};

export const integrationTable: TableConfig = {
  schemaTableName: `${schemaName}.userintegration`,
  user_id: "user_id",
  integration_id: "integration_id",
  integrationname: "integrationname",
  status: "status",
  refresh_token: "refresh_token",
  createddate: 'createddate',
  updateddate: 'updateddate',
  connection_id: 'connection_id'
};

export const enrichTemplateTable: TableConfig = {
  schemaTableName: `${schemaName}.enrich_templates`,
  id: "id"
};

export const championTrackingTable: TableConfig = {
  schemaTableName: `${schemaName}.champion_tracking`,
  id: "id",
  user_id: "user_id",
  data: "data",
  created_at: "created_at"
};

// Model-related tables
export const modelsTable: TableConfig = {
  schemaTableName: `${schemaName}.models`,
  id: "id",
  model_name: "model_name",
  user_id: "user_id",
  tenant_id: "tenant_id",
  source_table: "source_table",
  query: "query",
  columns: "columns",
  created_at: "created_at",
  updated_at: "updated_at"
};

export const modelRelationshipsTable: TableConfig = {
  schemaTableName: `${schemaName}.model_relationships`,
  id: "id",
  from_model_id: "from_model_id",
  to_model_id: "to_model_id",
  relationship_type: "relationship_type",
  join_condition: "join_condition",
  created_at: "created_at"
};

// Settings-related tables
export const settingsTable: TableConfig = {
  schemaTableName: `${schemaName}.settings`,
  id: "id",
  user_id: "user_id",
  organization_id: "organization_id",
  settings_data: "settings_data",
  created_at: "created_at",
  updated_at: "updated_at"
};

// Insights-related tables
export const insightsTable: TableConfig = {
  schemaTableName: `${schemaName}.insights`,
  id: "id",
  user_id: "user_id",
  insight_type: "insight_type",
  data: "data",
  created_at: "created_at"
};

export const fleadsTable: TableConfig = {
  schemaTableName: `${schemaName}.fleads`,
  id: "id",
  tenantid: "tenantid",
  agent_id: "agent_id",
  created_at: "created_at"
};

export const reportsTable: TableConfig = {
  schemaTableName: `${schemaName}.reports`,
  report_id: "report_id",
  query_id: "query_id",
  user_id: "user_id",
  session_id: "session_id",
  chart_data: "chart_data",
  chart_type: "chart_type",
  sql_query: "sql_query",
  description: "description",
  name: "name",
  saved_to_dashboard: "saved_to_dashboard",
  is_deleted: "is_deleted",
  created_date: "created_date",
  x_axis: "x_axis",
  y_axis: "y_axis",
  show_values: "show_values",
  show_grid: "show_grid",
  chart_color: "chart_color"
};

export const chatV4FeedbackTable: TableConfig = {
  schemaTableName: `${schemaName}.chat_v4_feedback`,
  id: "id",
  session_id: "session_id",
  feedback: "feedback",
  created_at: "created_at"
};

// BigQuery connections table
export const connectionsTable: TableConfig = {
  schemaTableName: `${schemaName}.connections`,
  id: "id",
  organisation_id: "organisation_id",
  name: "name",
  type: "type",
  status: "status",
  credentials_path: "credentials_path",
  credentials_encrypted: "credentials_encrypted",
  config: "config",
  created_at: "created_at",
  updated_at: "updated_at"
};

// Export all table configurations
export const tableConfigs = {
  users: usersTable,
  userSessions: userSessionsTable,
  userAuth: userAuthTable,
  organisation: organisationTable,
  inviteMember: inviteMemberTable,
  tenant: tenantTable,
  chat: chatTable,
  chatV4: chatV4Table,
  audience: audienceTable,
  accountLocking: accountLockingTable,
  integration: integrationTable,
  enrichTemplate: enrichTemplateTable,
  championTracking: championTrackingTable,
  models: modelsTable,
  modelRelationships: modelRelationshipsTable,
  settings: settingsTable,
  insights: insightsTable,
  connections: connectionsTable,
};
