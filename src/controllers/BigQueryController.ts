import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import BigQueryService from "../services/BigQueryService";
import { AuthenticatedRequest } from "../types/api";
import ApiError from "../utils/ApiError";

/**
 * Create a new BigQuery connection
 * @route POST /api/bigquery/connections
 */
export const createConnection = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const tenantId =
      req.tenantId ||
      (req.headers["x-tenant-id"] as string) ||
      "0e326d3e-21b9-4855-ac45-c2f659615ec3";
    const { name, config } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      throw ApiError.badRequest("Credentials file is required");
    }

    // Create connection
    const connectionId = await BigQueryService.createConnection(
      tenantId,
      name,
      req.file.path,
      config
    );

    res.status(201).json({
      status: "success",
      data: {
        connectionId,
        name,
        type: "bigquery",
        credentialsFile: req.file.originalname,
      },
    });
  }
);

/**
 * Validate a BigQuery connection
 * @route POST /api/bigquery/connections/:id/validate
 */
export const validateConnection = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Validate connection
    const isValid = await BigQueryService.validateConnection(id);

    res.status(200).json({
      status: "success",
      data: {
        valid: isValid,
      },
    });
  }
);

/**
 * List datasets in a BigQuery connection
 * @route GET /api/bigquery/connections/:id/datasets
 */
export const listDatasets = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // List datasets
    const datasets = await BigQueryService.listDatasets(id);

    res.status(200).json({
      status: "success",
      data: {
        datasets,
      },
    });
  }
);

/**
 * List tables in a BigQuery dataset
 * @route GET /api/bigquery/connections/:id/datasets/:datasetId/tables
 */
export const listTables = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id, datasetId } = req.params;

    // List tables
    const tables = await BigQueryService.listTables(id, datasetId);

    res.status(200).json({
      status: "success",
      data: {
        tables,
      },
    });
  }
);

/**
 * Get table schema
 * @route GET /api/bigquery/connections/:id/datasets/:datasetId/tables/:tableId/schema
 */
export const getTableSchema = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id, datasetId, tableId } = req.params;

    // Get table schema
    const schema = await BigQueryService.getTableSchema(id, datasetId, tableId);

    res.status(200).json({
      status: "success",
      data: {
        schema,
      },
    });
  }
);

/**
 * Execute a query
 * @route POST /api/bigquery/connections/:id/query
 */
export const executeQuery = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { query, params } = req.body;

    // Execute query
    const results = await BigQueryService.executeQuery(id, query, params);

    res.status(200).json({
      status: "success",
      data: {
        results,
      },
    });
  }
);

export default {
  createConnection,
  validateConnection,
  listDatasets,
  listTables,
  getTableSchema,
  executeQuery,
};
