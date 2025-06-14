import { Request, Response } from 'express';
import AudienceService from '../../services/AudienceService';
import catchAsync from '../../utils/catchAsync';
import ApiError from '../../utils/ApiError';

const audienceService = new AudienceService();

/**
 * Create a new audience
 */
export const createAudience = catchAsync(async (req: Request, res: Response) => {
  const { name, description, tenantId, createdBy, objects } = req.body;

  if (!name || !tenantId || !createdBy) {
    throw new ApiError(400, 'Name, tenantId, and createdBy are required');
  }

  if (!objects || !Array.isArray(objects) || objects.length === 0) {
    throw new ApiError(400, 'At least one object must be specified');
  }

  const result = await audienceService.createAudience({
    name,
    description,
    tenantId,
    createdBy,
    objects,
  });

  res.status(201).json({
    success: true,
    data: result,
    message: 'Audience created successfully',
  });
});

/**
 * Get audience by ID
 */
export const getAudienceById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const audience = await audienceService.getAudienceById(id);
  if (!audience) {
    throw new ApiError(404, 'Audience not found');
  }

  res.status(200).json({
    success: true,
    data: audience,
  });
});

/**
 * Get audience with full details (objects and relationships)
 */
export const getAudienceWithDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const audienceDetails = await audienceService.getAudienceWithDetails(id);
  if (!audienceDetails) {
    throw new ApiError(404, 'Audience not found');
  }

  res.status(200).json({
    success: true,
    data: audienceDetails,
  });
});

/**
 * Get audiences by tenant
 */
export const getAudiencesByTenant = catchAsync(async (req: Request, res: Response) => {
  const { tenantId } = req.query;

  if (!tenantId) {
    throw new ApiError(400, 'tenantId is required');
  }

  const audiences = await audienceService.getAudiencesByTenant(tenantId as string);

  res.status(200).json({
    success: true,
    data: audiences,
    count: audiences.length,
  });
});

/**
 * Update audience
 */
export const updateAudience = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const audience = await audienceService.updateAudience(id, updates);
  if (!audience) {
    throw new ApiError(404, 'Audience not found');
  }

  res.status(200).json({
    success: true,
    data: audience,
    message: 'Audience updated successfully',
  });
});

/**
 * Delete audience
 */
export const deleteAudience = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleted = await audienceService.deleteAudience(id);
  if (!deleted) {
    throw new ApiError(404, 'Audience not found');
  }

  res.status(200).json({
    success: true,
    message: 'Audience deleted successfully',
  });
});

/**
 * Create a new cohort
 */
export const createCohort = catchAsync(async (req: Request, res: Response) => {
  const { 
    name, 
    description, 
    audienceId, 
    tenantId, 
    createdBy, 
    filters,
    peopleFilters 
  } = req.body;

  if (!name || !audienceId || !tenantId || !createdBy) {
    throw new ApiError(400, 'Name, audienceId, tenantId, and createdBy are required');
  }

  // Handle both old format (filters) and new format (companyFilters/contactFilters)
  let companyFilters = [];
  let contactFilters = [];

  if (filters && Array.isArray(filters)) {
    companyFilters = filters;
  }
  if (peopleFilters && Array.isArray(peopleFilters)) {
    contactFilters = peopleFilters;
  }

  // If using new format directly
  if (req.body.companyFilters) {
    companyFilters = req.body.companyFilters;
  }
  if (req.body.contactFilters) {
    contactFilters = req.body.contactFilters;
  }

  const cohort = await audienceService.createCohort({
    name,
    description,
    audienceId,
    tenantId,
    createdBy,
    companyFilters,
    contactFilters,
  });

  res.status(201).json({
    success: true,
    data: cohort,
    message: 'Cohort created successfully',
  });
});

/**
 * Get cohort by ID
 */
export const getCohortById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const cohort = await audienceService.getCohortById(id);
  if (!cohort) {
    throw new ApiError(404, 'Cohort not found');
  }

  res.status(200).json({
    success: true,
    data: cohort,
  });
});

/**
 * Get cohort with audience details
 */
export const getCohortWithAudience = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const cohortDetails = await audienceService.getCohortWithAudience(id);
  if (!cohortDetails) {
    throw new ApiError(404, 'Cohort not found');
  }

  res.status(200).json({
    success: true,
    data: cohortDetails,
  });
});

/**
 * Get cohorts by audience
 */
export const getCohortsByAudience = catchAsync(async (req: Request, res: Response) => {
  const { audienceId } = req.query;

  if (!audienceId) {
    throw new ApiError(400, 'audienceId is required');
  }

  const cohorts = await audienceService.getCohortsByAudience(audienceId as string);

  res.status(200).json({
    success: true,
    data: cohorts,
    count: cohorts.length,
  });
});

/**
 * Get cohorts by tenant
 */
export const getCohortsByTenant = catchAsync(async (req: Request, res: Response) => {
  const { tenantId } = req.query;

  if (!tenantId) {
    throw new ApiError(400, 'tenantId is required');
  }

  const cohorts = await audienceService.getCohortsByTenant(tenantId as string);

  res.status(200).json({
    success: true,
    data: cohorts,
    count: cohorts.length,
  });
});

/**
 * Update cohort
 */
export const updateCohort = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const cohort = await audienceService.updateCohort(id, updates);
  if (!cohort) {
    throw new ApiError(404, 'Cohort not found');
  }

  res.status(200).json({
    success: true,
    data: cohort,
    message: 'Cohort updated successfully',
  });
});

/**
 * Delete cohort
 */
export const deleteCohort = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleted = await audienceService.deleteCohort(id);
  if (!deleted) {
    throw new ApiError(404, 'Cohort not found');
  }

  res.status(200).json({
    success: true,
    message: 'Cohort deleted successfully',
  });
});

/**
 * Preview cohort data
 */
export const previewCohortData = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 100 } = req.query;

  const data = await audienceService.previewCohortData(id, parseInt(limit as string));

  res.status(200).json({
    success: true,
    data,
    count: data.length,
  });
});

/**
 * Get cohort counts
 */
export const getCohortCounts = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const counts = await audienceService.getCohortCounts(id);

  res.status(200).json({
    success: true,
    data: counts,
  });
});

/**
 * Download cohort data
 */
export const downloadCohortData = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const data = await audienceService.downloadCohortData(id);

  // Set headers for CSV download
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="cohort-${id}-data.json"`);

  res.status(200).json({
    success: true,
    data,
    count: data.length,
  });
});

/**
 * Get all available objects
 */
export const getAllObjects = catchAsync(async (req: Request, res: Response) => {
  const objects = await audienceService.getAllObjects();

  res.status(200).json({
    success: true,
    data: objects,
    count: objects.length,
  });
});

/**
 * Get all available relationships
 */
export const getAllRelationships = catchAsync(async (req: Request, res: Response) => {
  const relationships = await audienceService.getAllRelationships();

  res.status(200).json({
    success: true,
    data: relationships,
    count: relationships.length,
  });
});

/**
 * Generate cohort SQL
 */
export const generateCohortSQL = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = await audienceService.generateCohortSQL(id);

  res.status(200).json({
    success: true,
    data: { sql },
  });
});

/**
 * Health check
 */
export const healthCheck = catchAsync(async (req: Request, res: Response) => {
  const health = await audienceService.healthCheck();

  res.status(200).json({
    success: true,
    data: health,
  });
});
