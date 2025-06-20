import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catchAsync';
import BigQueryService from '../services/BigQueryService';
import { readJsonFile, deleteFile } from '../utils/fileUpload';
import { AuthenticatedRequest } from '../types/api';
import ApiError from '../utils/ApiError';

/**
 * Create a new BigQuery connection
 * @route POST /api/bigquery/connections
 */
export const createConnection = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId || req.headers['x-tenant-id'] as string || '0e326d3e-21b9-4855-ac45-c2f659615ec3';
  const { name, config } = req.body;
  
  // Check if file was uploaded
  if (!req.file) {
    throw ApiError.badRequest('Credentials file is required');
  }
  
  // Create connection
  const connectionId = await BigQueryService.createConnection(
    tenantId,
    name,
    req.file.path,
    config
  );
  
  res.status(201).json({
    status: 'success',
    data: {
      connectionId,
      name,
      type: 'bigquery',
      credentialsFile: req.file.originalname
    }
  });
});

/**
 * Validate a BigQuery connection
 * @route POST /api/bigquery/connections/validate
 */
export const validateConnection = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const connectionId = req.bigQueryConnection?.id;
  
  if (!connectionId) {
    throw ApiError.badRequest('BigQuery connection not found');
  }
  
  // Validate connection
  const isValid = await BigQueryService.validateConnection(connectionId);
  
  res.status(200).json({
    status: 'success',
    data: {
      valid: isValid,
      connection: req.bigQueryConnection
    }
  });
});

/**
 * List datasets in a BigQuery connection
 * @route GET /api/bigquery/datasets
 */
export const listDatasets = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const connectionId = req.bigQueryConnection?.id;
  
  if (!connectionId) {
    throw ApiError.badRequest('BigQuery connection not found');
  }
  
  // List datasets
  const datasets = await BigQueryService.listDatasets(connectionId);
  
  res.status(200).json({
    status: 'success',
    data: {
      datasets,
      connection: req.bigQueryConnection
    }
  });
});

/**
 * List tables in a BigQuery dataset
 * @route GET /api/bigquery/datasets/:datasetId/tables
 */
export const listTables = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const connectionId = req.bigQueryConnection?.id;
  const { datasetId } = req.params;
  
  if (!connectionId) {
    throw ApiError.badRequest('BigQuery connection not found');
  }
  
  // List tables
  const tables = await BigQueryService.listTables(connectionId, datasetId);
  
  res.status(200).json({
    status: 'success',
    data: {
      tables,
      connection: req.bigQueryConnection
    }
  });
});

/**
 * Get table schema
 * @route GET /api/bigquery/datasets/:datasetId/tables/:tableId/schema
 */
export const getTableSchema = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const connectionId = req.bigQueryConnection?.id;
  const { datasetId, tableId } = req.params;
  
  if (!connectionId) {
    throw ApiError.badRequest('BigQuery connection not found');
  }
  
  // Get table schema
  const schema = await BigQueryService.getTableSchema(connectionId, datasetId, tableId);
  
  res.status(200).json({
    status: 'success',
    data: {
      schema,
      connection: req.bigQueryConnection
    }
  });
});

/**
 * Execute a query
 * @route POST /api/bigquery/query
 */
export const executeQuery = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const connectionId = req.bigQueryConnection?.id;
  const { query, params } = req.body;
  
  if (!connectionId) {
    throw ApiError.badRequest('BigQuery connection not found');
  }
  
  // Execute query
  const results = await BigQueryService.executeQuery(connectionId, query, params);
  
  res.status(200).json({
    status: 'success',
    data: {
      results,
      connection: req.bigQueryConnection
    }
  });
});

/**
 * Get schemas from specific datasets
 * @route POST /api/bigquery/schemas
 */
export const getSchemasFromDatasets = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const connectionId = req.bigQueryConnection?.id;
  const { datasets } = req.body;
  
  if (!connectionId) {
    throw ApiError.badRequest('BigQuery connection not found');
  }
  
  // Validate input
  if (!datasets || !Array.isArray(datasets) || datasets.length === 0) {
    throw ApiError.badRequest('Datasets array is required and must not be empty');
  }
  
  // Get schemas from specified datasets
  const schemas = await BigQueryService.getSchemasFromDatasets(connectionId, datasets);
  
  res.status(200).json({
    status: 'success',
    data: {
      ...schemas,
      connection: req.bigQueryConnection
    }
  });
});

export default {
  createConnection,
  validateConnection,
  listDatasets,
  listTables,
  getTableSchema,
  executeQuery,
  getSchemasFromDatasets
};
