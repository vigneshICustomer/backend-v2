import { Request, Response } from 'express';
import { SegmentService } from '../../services/SegmentService';
import catchAsync from '../../utils/catchAsync';
import ApiError from '../../utils/ApiError';
import { AuthenticatedRequest } from '../../types/api';
import connection from '../../config/database';
import { isValidSelectQuery } from '../../utils/helpers';

/**
 * Segment Controllers
 * Handle HTTP requests for audience and segment management endpoints
 */

/**
 * Get all segments for organization
 * POST /audience/fetch-all-segments
 */
export const fetchAllSegments = catchAsync(async (req: Request, res: Response) => {
  const { tenant_id } = req.body;
  
  if (!tenant_id) {
    throw ApiError.badRequest('Tenant ID is required');
  }

  const result = await SegmentService.fetchAllSegments(tenant_id);
  
  res.status(200).json(result.data);
});

/**
 * Get all segments for specific model
 * POST /audience/fetch-segments-modelId
 */
export const fetchSegmentsByModelId = catchAsync(async (req: Request, res: Response) => {
  const { modelId, tenantId } = req.body;
  
  if (!modelId || !tenantId) {
    throw ApiError.badRequest('Model ID and Tenant ID are required');
  }

  const result = await SegmentService.fetchSegmentsByModelId(modelId, tenantId);
  
  res.status(200).json(result.data);
});

/**
 * Get folders for organization
 * GET /audience/folders
 */
export const getFolders = catchAsync(async (req: Request, res: Response) => {
  const { tenant_id } = req.query;
  
  if (!tenant_id) {
    throw ApiError.badRequest('Tenant ID is required');
  }

  const result = await SegmentService.getFolders(tenant_id as string);
  
  res.status(200).json(result.data);
});

/**
 * Create a new folder
 * POST /audience/folders
 */
export const createFolder = catchAsync(async (req: Request, res: Response) => {
  const { name, tenant_id, parent_folder_id } = req.body;
  
  if (!name || !tenant_id) {
    throw ApiError.badRequest('Name and Tenant ID are required');
  }

  const result = await SegmentService.createFolder(name, tenant_id, parent_folder_id);
  
  res.status(200).json(result.data);
});

/**
 * Save segment data
 * POST /segment/save-segment-data
 */
export const saveSegmentData = catchAsync(async (req: Request, res: Response) => {
  const segmentData = req.body;
  
  const result = await SegmentService.saveSegmentData(segmentData);
  
  res.status(200).json(result);
});

/**
 * Get user integrations
 * POST /integration/integrationList
 */
export const getUserIntegrations = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('User authentication required');
  }
  
  const { id } = req.user;
  
  const result = await SegmentService.getUserIntegrations(id);
  
  res.status(200).json(result);
});

/**
 * Preview segment based on conditions
 * POST /segment/segment-filter-criteria
 */
export const getSegmentFilterCriteria = async (req: Request, res: Response) => {
    const { payload: sqlQuery, table_slug, organisation, page = 1, limit = 20 } = req.body;
    if(!sqlQuery ){
        return res.status(400).json({error: "Payload is required"});
    }
    if(!isValidSelectQuery(sqlQuery)){
        return res.status(400).json({error: "Invalid SQL Query format."});
    }

    try {   
        // Modify the query to include pagination
        const offset = (page - 1) * limit;
        // const paginatedQuery = `${sqlQuery.replace(';', '')} LIMIT ${limit} OFFSET ${offset};`;
        // const countQuery = `SELECT COUNT(*) FROM (${sqlQuery.replace(';', '')}) as total;`;

        // // Execute both queries in parallel
        // const [results, countResult] = await Promise.all([
        //     connection.query(paginatedQuery),
        //     connection.query(countQuery)
        // ]);

        // const totalCount = parseInt(countResult.rows[0].count);

        const combinedQuery = `
            WITH filtered_data AS (
                ${sqlQuery.replace(';', '')}
            )
            SELECT 
                (SELECT COUNT(*) FROM filtered_data) AS total_count,
                * 
            FROM filtered_data
            LIMIT ${limit} OFFSET ${offset};
        `;
        // TAG: Customer Data Query
        const result = await connection.query(combinedQuery);
        let isResultEmpty = false
       
            // This is PostgreSQL result
            isResultEmpty = result.rows.length === 0
     

        // Handle case where no results are found
        if (isResultEmpty) {
            return res.status(200).json({
            
                results: {
                    rows: []
                },
                pagination: {
                    total: 0,
                    totalPages: 0,
                    currentPage: page,
                    hasMore: false
                }
                ,message : "No data exist in the database or check the query correctly."
            });
        }

        // Safely access total_count with fallback
        const totalCount = result.rows[0]?.total_count || 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({ 
            query: sqlQuery, 
            results: result.rows,
            pagination: {
                total: totalCount,
                totalPages,
                currentPage: page,
                hasMore: page < totalPages
            }
        });
    } catch (error) {
        console.error("Error executing query:", error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Query execution failed' });
    }
};

/**
 * Get segment filter count
 * POST /audience/segment-filter-criteria-count
 */
export const getSegmentFilterCriteriaCount = catchAsync(async (req: Request, res: Response) => {
  const { payload, table_slug, organisation } = req.body;
  
  const result = await SegmentService.getSegmentFilterCriteriaCount(payload, table_slug, organisation);
  
  res.status(200).json(result);
});

/**
 * Save user filter
 * POST /segment/filters
 */
export const saveUserFilter = catchAsync(async (req: Request, res: Response) => {
  const { name, filter_data, tenant_id, user_email, model_id } = req.body;
  
  if (!name || !filter_data || !tenant_id || !user_email) {
    throw ApiError.badRequest('Name, filter data, tenant ID, and user email are required');
  }

  const result = await SegmentService.saveUserFilter(name, filter_data, tenant_id, user_email, model_id);
  
  res.status(200).json(result.data);
});

/**
 * Get user filters
 * GET /segment/filters
 */
export const getUserFilters = catchAsync(async (req: Request, res: Response) => {
  const { tenant_id, user_email, model_id } = req.query;
  
  if (!tenant_id || !user_email) {
    throw ApiError.badRequest('Tenant ID and user email are required');
  }

  const result = await SegmentService.getUserFilters(
    tenant_id as string, 
    user_email as string, 
    model_id as string
  );
  
  res.status(200).json(result.data);
});

/**
 * Delete user filter
 * DELETE /segment/filters/{filter_id}
 */
export const deleteUserFilter = catchAsync(async (req: Request, res: Response) => {
  const { filter_id } = req.params;
  const { user_email } = req.query;
  
  if (!filter_id || !user_email) {
    throw ApiError.badRequest('Filter ID and user email are required');
  }

  const result = await SegmentService.deleteUserFilter(filter_id, user_email as string);
  
  res.status(200).json(result.data);
});
