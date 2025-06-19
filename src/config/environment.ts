import dotenv from "dotenv";
dotenv.config();

const environment: any = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3001", 10),

  // Database Configuration
  DB_HOST: process.env.DB_HOST!,
  DB_USER: process.env.DB_USER!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
  DB_NAME: process.env.DB_NAME!,
  DB_PORT: parseInt(process.env.DB_PORT || "5432", 10),

  // JWT Configuration
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,

  // Rate Limiting
  RATE_LIMIT_COUNT: parseInt(process.env.RATE_LIMIT_COUNT || "100", 10),

  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") || [],

  // AWS Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
  AWS_REGION: process.env.AWS_REGION!,
};
export default environment;
// Workflow credentials (can be null in development)
export const workflowLogCredentials =
  environment.NODE_ENV === "production"
    ? process.env.WORKFLOW_LOG_CREDENTIALS
    : null;

// Table names for workflows and webhooks
export const webhookRecordsTableName =
  environment.NODE_ENV === "production"
    ? process.env.WEBHOOK_RECORDS_TABLE_NAME
    : null;

export const workflowsTableName =
  environment.NODE_ENV === "production"
    ? process.env.WORKFLOWS_TABLE_NAME
    : null;
