import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import multer from "multer";
import environment from "./config/environment";
import { initializeDatabase } from "./config/database";
import {
  errorConverter,
  errorHandler,
  notFound,
  logError,
  validationErrorHandler,
  databaseErrorHandler,
  jwtErrorHandler,
  rateLimitErrorHandler,
} from "./middleware/errorHandler";
import { generalRateLimit } from "./middleware/rateLimiter";

// Import routes
import authRoutes from "./routes/auth";
import insightsRoutes from "./routes/insights";
import segmentRoutes from "./routes/segments";
import settingsRoutes from "./routes/settings";
import enrichTemplateRoutes from "./routes/enrichTemplate";
import championRoutes from "./routes/champion";
import bigQueryRoutes from "./routes/bigquery";
import testConnectionsRoutes from "./routes/test-connections";
import audienceRoutes from "./routes/audiences";
import { checkAuthToken } from "./middleware/auth";

import dotenv from "dotenv";
dotenv.config();

// Initialize Express app
const app = express();

// Initialize multer for file uploads
const upload = multer();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: environment.ALLOWED_ORIGINS,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Compression middleware
app.use(compression());

// Logging middleware
if (environment.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.log(`Request from IP: ${req.ip}`);

  // Set CORS headers
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  next();
});

// Body parsing middleware
app.use(express.json({ limit: "700mb" }));
app.use(express.urlencoded({ limit: "700mb", extended: true }));

// Apply multer.none() to all routes except BigQuery file upload routes
app.use((req, res, next) => {
  // Skip multer.none() for BigQuery file upload routes
  if (
    req.path.startsWith("/api/bigquery/connections") &&
    req.method === "POST"
  ) {
    return next();
  }
  // Apply multer.none() for all other routes
  upload.none()(req, res, next);
});

// Static files
app.use(express.static("public"));

// Rate limiting
app.use(generalRateLimit);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "V2 Backend is running",
    timestamp: new Date().toISOString(),
    environment: environment.NODE_ENV,
  });
});

// Favicon endpoint to prevent 404 errors
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

// API routes
app.use("/", authRoutes);
app.use("/", insightsRoutes);
app.use("/", segmentRoutes);
app.use("/settings", settingsRoutes);
app.use("/enrichTemplate", enrichTemplateRoutes);
app.use("/champion", championRoutes);
app.use("/api/bigquery", bigQueryRoutes);
app.use("/debug", testConnectionsRoutes);
app.use("/api", checkAuthToken(), audienceRoutes);

// API documentation endpoint
app.get("/api-docs", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "V2 Backend API Documentation",
    version: "1.0.0",
    endpoints: {
      authentication: {
        "POST /users/getTenant": "Get tenant information",
        "POST /users/userStatus": "Get user status",
        "POST /users/loginJWT": "Login with JWT",
        "POST /users/logout": "Logout user",
        "POST /users/googleLoginJWT": "Google login",
        "GET /session/persist": "Check session persistence",
      },
      audience_segment_management: {
        "POST /audience/fetch-all-segments":
          "Get all segments for organization",
        "GET /audience/folders": "Get folders for organization",
        "POST /audience/folders": "Create a new folder",
        "POST /segment/save-segment-data": "Save segment data",
        "POST /integration/integrationList": "Get user integrations",
        "POST /segment/segment-filter-criteria":
          "Preview segment based on conditions",
        "POST /audience/segment-filter-criteria-count":
          "Get segment filter count",
        "GET /segment/filters": "Get user filters",
        "POST /segment/filters": "Save user filter",
        "DELETE /segment/filters/{filter_id}": "Delete user filter",
        "POST /audience/fetch-segments-modelId":
          "Get all segments for specific model",
      },
      insights_analytics: {
        "POST /insights/getPicklistValues": "Get picklist values for insights",
        "POST /insightsRoutes/getColumns": "Get columns for insights",
        "POST /insightsRoutes/liveTable": "Get live data for insights",
        "POST /insightsRoutes/displayTable": "Display table with filtering",
      },
      data_enrichment: {
        "POST /insightsRoutes/enrichColumns":
          "Enrich columns with additional data",
        "POST /insightsRoutes/clean-normalize":
          "Clean and normalize account data",
        "POST /insightsRoutes/people-clean-normalize":
          "Clean and normalize people data",
        "POST /insightsRoutes/deduplicate": "Deduplicate data",
      },
      user_settings: {
        "POST /settings/getUserSetting":
          "Get user settings/profile information",
        "POST /settings/updateUser": "Update user profile",
        "POST /settings/inviteUser": "Invite new user to organization",
        "POST /settings/updateMemberInvite": "Update member invitation status",
        "POST /settings/getInvitedMemberData":
          "Get invited member data for organization",
        "POST /settings/updateRole": "Update user role",
        "POST /settings/uploadLogo": "Upload organization logo",
        "POST /settings/readLogo": "Read organization logo",
        "POST /settings/updateOrganizations": "Update organization details",
      },
      enrich_templates: {
        "POST /settings/saveEnrichTemplate": "Save enrich template draft",
        "POST /settings/getEnrichTemplateData": "Get enrich template data",
        "POST /settings/editEnrichTemplateData": "Edit enrich template data",
        "POST /enrichTemplate/deleteTemplate": "Delete enrich template",
      },
      champion_tracking: {
        "POST /champion/getPicklistValues":
          "Get picklist values for champion tracking",
      },
      bigquery_connections: {
        "POST /api/bigquery/connections": "Create a new BigQuery connection",
        "POST /api/bigquery/connections/:id/validate":
          "Validate a BigQuery connection",
        "GET /api/bigquery/connections/:id/datasets":
          "List datasets in a BigQuery connection",
        "GET /api/bigquery/connections/:id/datasets/:datasetId/tables":
          "List tables in a BigQuery dataset",
        "GET /api/bigquery/connections/:id/datasets/:datasetId/tables/:tableId/schema":
          "Get table schema",
        "POST /api/bigquery/connections/:id/query":
          "Execute a query against BigQuery",
      },

      health: {
        "GET /health": "Health check endpoint",
      },
    },
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware (order matters)
app.use(logError);
app.use(rateLimitErrorHandler);
app.use(jwtErrorHandler);
app.use(databaseErrorHandler);
app.use(validationErrorHandler);
app.use(errorConverter);
app.use(errorHandler);

// Initialize database connection
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    console.log("Database initialized successfully");

    // Start server
    const PORT = 3001;
    app.listen(PORT, () => {
      console.log(`🚀 V2 Backend server started on port ${PORT}`);
      console.log(`📊 Environment: ${environment.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api-docs`);

      if (environment.NODE_ENV === "development") {
        console.log(
          `🌐 CORS origins: ${environment.ALLOWED_ORIGINS.join(", ")}`
        );
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
startServer();

export default app;
