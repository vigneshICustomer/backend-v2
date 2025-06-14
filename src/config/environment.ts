import dotenv from "dotenv";

dotenv.config();

interface Environment {
  NODE_ENV: string;
  PORT: number;

  // Database
  DB_HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_PORT: number;

  // JWT
  JWT_SECRET_KEY: string;

  // URLs
  BASE_URL: string;
  VERIFY_USER_URL: string;
  RESET_PASSWORD_URL: string;

  // Rate Limiting
  RATE_LIMIT_COUNT: number;

  // CORS
  ALLOWED_ORIGINS: string[];

  // AWS
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
}

const environment: Environment = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3003", 10),

  // Database configuration based on environment
  DB_HOST:
    process.env.NODE_ENV === "production"
      ? process.env.PROD_DB_HOST || "34.224.20.134"
      : process.env.DB_HOST || "localhost",
  DB_USER:
    process.env.NODE_ENV === "production"
      ? process.env.PROD_DB_USER || "postgres"
      : process.env.DB_USER || "postgres",
  DB_PASSWORD:
    process.env.NODE_ENV === "production"
      ? process.env.PROD_DB_PASSWORD || "S&dpu738wM#V37DU$p3A%"
      : process.env.DB_PASSWORD || "your_password",
  DB_NAME:
    process.env.NODE_ENV === "production"
      ? process.env.PROD_DB_NAME || "test_wb"
      : process.env.DB_NAME || "test_wb",
  DB_PORT:
    process.env.NODE_ENV === "production"
      ? parseInt(process.env.PROD_DB_PORT || "41063", 10)
      : parseInt(process.env.DB_PORT || "5432", 10),

  JWT_SECRET_KEY:
    process.env.JWT_SECRET_KEY ||
    "c98ee5afabfaa4a8e743803ec7e4f14a4c8a1bead5a0d3e36fc892979ab581dc",

  BASE_URL: process.env.BASE_URL || "http://localhost:3000",
  VERIFY_USER_URL:
    process.env.VERIFY_USER_URL || "https://app.gtmcopilot.com/#/verify-user/",
  RESET_PASSWORD_URL:
    process.env.RESET_PASSWORD_URL ||
    "https://app.gtmcopilot.com/#/reset-password/",

  RATE_LIMIT_COUNT: parseInt(process.env.RATE_LIMIT_COUNT || "100", 10),

  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ],

  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
};

export default environment;

// Workflow credentials (can be null in development)
export const workflowLogCredentials =
  process.env.NODE_ENV === "production" ? null : null;

// Table names for workflows and webhooks
export const webhookRecordsTableName =
  process.env.NODE_ENV === "production" ? null : null;
export const workflowsTableName =
  process.env.NODE_ENV === "production" ? null : null;
