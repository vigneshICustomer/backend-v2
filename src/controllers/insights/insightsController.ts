import { Request, Response } from 'express';
import { InsightsService } from '../../services/InsightsService';
import { EnrichService } from '../../services/EnrichService';
import catchAsync from '../../utils/catchAsync';
import ApiError from '../../utils/ApiError';
import { AuthenticatedRequest } from '../../types/api';

/**
 * Insights Controllers
 * Handle HTTP requests for insights and analytics endpoints
 */

/**
 * Get picklist values for insights
 * POST /insights/getPicklistValues
 */
export const getPicklistValues = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { object } = req.body;
  
  if (!req.user) {
    throw ApiError.unauthorized('User authentication required');
  }
  
  const { email, organization_domain } = req.user;
  
  if (!email || !organization_domain) {
    throw ApiError.badRequest('User email and organization domain are required');
  }
  
  if (!object) {
    throw ApiError.badRequest('Object is required');
  }

  const result = await InsightsService.getPicklistValues(email, organization_domain, object);
  
  res.status(200).json(result);
});

/**
 * Get columns for insights
 * POST /insightsRoutes/getColumns
 */
export const getColumns = catchAsync(async (req: Request, res: Response) => {
  const { schema_name, tableName } = req.body;
  
  if (!schema_name) {
    throw ApiError.badRequest('Schema name is required');
  }

  const result = await InsightsService.getColumns(schema_name, tableName);
  
  res.status(200).json(result);
});

/**
 * Get live table data for insights
 * POST /insightsRoutes/liveTable
 */
export const liveTable = catchAsync(async (req: Request, res: Response) => {
  const { organisation_id, agent_id } = req.body;
  
  if (!organisation_id || !agent_id) {
    throw ApiError.badRequest('Organisation ID and agent ID are required');
  }

  const result = await InsightsService.getLiveTable(organisation_id, agent_id);
  
  res.status(200).json(result);
});

/**
 * Display table with filtering
 * POST /insightsRoutes/displayTable
 */
export const displayTable = catchAsync(async (req: Request, res: Response) => {
  const { tableName, columns = ['*'], conditions = [], orderBy, limit } = req.body;
  
  if (!tableName) {
    throw ApiError.badRequest('Table name is required');
  }

  const result = await InsightsService.displayTable(tableName, columns, conditions, orderBy, limit);
  
  res.status(200).json(result);
});

/**
 * Enrich columns with additional data
 * POST /insightsRoutes/enrichColumns
 */
export const enrichColumns = catchAsync(async (req: Request, res: Response) => {
  const { 
    records, 
    account_fields_to_enrich = [], 
    people_fields_to_enrich = [], 
    entity_type, 
    query_id 
  } = req.body;
  
  // Get API key from middleware
  const apiKey = (req as any).apiKey;
  
  if (!records || !Array.isArray(records)) {
    throw ApiError.badRequest('Records array is required');
  }
  
  if (!entity_type) {
    throw ApiError.badRequest('Entity type is required');
  }
  
  if (!query_id) {
    throw ApiError.badRequest('Query ID is required');
  }
  
  if (!apiKey) {
    throw ApiError.unauthorized('API key is required');
  }

  const result = await EnrichService.enrichColumns(
    records, 
    account_fields_to_enrich, 
    people_fields_to_enrich, 
    entity_type, 
    query_id,
    apiKey
  );
  
  res.status(200).json(result);
});

/**
 * Clean and normalize account data
 * POST /insightsRoutes/clean-normalize
 */
export const cleanAndNormalizeData = catchAsync(async (req: Request, res: Response) => {
  const { data, mappings, entity, query_id } = req.body;
  
  if (!data || !Array.isArray(data)) {
    throw ApiError.badRequest('Data array is required');
  }
  
  if (!mappings || typeof mappings !== 'object') {
    throw ApiError.badRequest('Mappings object is required');
  }
  
  if (!entity) {
    throw ApiError.badRequest('Entity type is required');
  }
  
  if (!query_id) {
    throw ApiError.badRequest('Query ID is required');
  }

  const result = await EnrichService.cleanAndNormalizeData(data, mappings, entity, query_id);
  
  res.status(200).json(result);
});

/**
 * Clean and normalize people data
 * POST /insightsRoutes/people-clean-normalize
 */
export const peopleCleanAndNormalizeData = catchAsync(async (req: Request, res: Response) => {
  const { data, mappings, query_id } = req.body;
  
  if (!data || !Array.isArray(data)) {
    throw ApiError.badRequest('Data array is required');
  }
  
  if (!mappings || typeof mappings !== 'object') {
    throw ApiError.badRequest('Mappings object is required');
  }
  
  if (!query_id) {
    throw ApiError.badRequest('Query ID is required');
  }

  const result = await EnrichService.peopleCleanAndNormalizeData(data, mappings, query_id);
  
  res.status(200).json(result);
});

/**
 * Deduplicate data
 * POST /insightsRoutes/deduplicate
 */
export const deduplicateData = catchAsync(async (req: Request, res: Response) => {
  const { data, query_id } = req.body;
  
  if (!data || !Array.isArray(data)) {
    throw ApiError.badRequest('Data array is required');
  }
  
  if (!query_id) {
    throw ApiError.badRequest('Query ID is required');
  }

  const result = await EnrichService.deduplicateData(data, query_id);
  
  res.status(200).json(result);
});
