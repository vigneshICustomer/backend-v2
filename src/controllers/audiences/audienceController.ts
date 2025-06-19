import { organisations } from "./../../db/schema/users";
import { Request, Response } from "express";
import AudienceService from "../../services/AudienceService";
import CohortService from "../../services/CohortService";
import catchAsync from "../../utils/catchAsync";
import ApiError from "../../utils/ApiError";

const audienceService = new AudienceService();
const cohortService = new CohortService();

/**
 * Create a new audience
 */
export const createAudience = catchAsync(
  async (req: Request, res: Response) => {
    const { name, description, objects } = req.body;
    const tenantId = req.tenantId;
    const createdBy = req.user?.id || "system";

    if (!name) {
      throw new ApiError(400, "Name is required");
    }

    if (!tenantId) {
      throw new ApiError(400, "Tenant ID is required");
    }

    if (!objects || !Array.isArray(objects) || objects.length === 0) {
      throw new ApiError(400, "At least one object must be specified");
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
      message: "Audience created successfully",
    });
  }
);

/**
 * Get audience by ID
 */
export const getAudienceById = catchAsync(
  async (req: Request, res: Response) => {
    const { organisation_id: id }: any = req.user;

    const audience = await audienceService.getAudienceById(id);
    if (!audience) {
      throw new ApiError(404, "Audience not found");
    }

    res.status(200).json({
      success: true,
      data: audience,
    });
  }
);

/**
 * Get audience with full details (objects and relationships)
 */
export const getAudienceWithDetails = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const audienceDetails = await audienceService.getAudienceWithDetails(id);
    if (!audienceDetails) {
      throw new ApiError(404, "Audience not found");
    }

    res.status(200).json({
      success: true,
      data: audienceDetails,
    });
  }
);

/**
 * Get audiences by tenant
 */
export const getAudiencesList = catchAsync(
  async (req: Request, res: Response) => {
    const { organisation_id: tenantId }: any = req.user;

    if (!tenantId) {
      throw new ApiError(400, "Tenant ID is required");
    }

    const audiences = await audienceService.getAudiencesByTenant(tenantId);

    res.status(200).json({
      success: true,
      data: audiences,
      count: audiences.length,
    });
  }
);

/**
 * Update audience
 */
export const updateAudience = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const audience = await audienceService.updateAudience(id, updates);
    if (!audience) {
      throw new ApiError(404, "Audience not found");
    }

    res.status(200).json({
      success: true,
      data: audience,
      message: "Audience updated successfully",
    });
  }
);

/**
 * Delete audience
 */
export const deleteAudience = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const deleted = await audienceService.deleteAudience(id);
    if (!deleted) {
      throw new ApiError(404, "Audience not found");
    }

    res.status(200).json({
      success: true,
      message: "Audience deleted successfully",
    });
  }
);

/**
 * Create a new cohort
 */
export const createCohort = catchAsync(async (req: Request, res: Response) => {
  const { name, description, audienceId, filters, peopleFilters } = req.body;

  const tenantId = req.tenantId;
  const createdBy = req.user?.id || "system";

  if (!name || !audienceId) {
    throw new ApiError(400, "Name and audienceId are required");
  }

  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
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

  const cohort = await cohortService.createCohort({
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
    message: "Cohort created successfully",
  });
});

/**
 * Get cohort by ID
 */
export const getCohortById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const cohort = await cohortService.getCohortById(id);
  if (!cohort) {
    throw new ApiError(404, "Cohort not found");
  }

  res.status(200).json({
    success: true,
    data: cohort,
  });
});

/**
 * Get cohort with audience details
 */
export const getCohortWithAudience = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const cohortDetails = await cohortService.getCohortWithAudience(id);
    if (!cohortDetails) {
      throw new ApiError(404, "Cohort not found");
    }

    res.status(200).json({
      success: true,
      data: cohortDetails,
    });
  }
);

/**
 * Get cohorts by audience
 */
export const getCohortsByAudience = catchAsync(
  async (req: Request, res: Response) => {
    const { audienceId } = req.query;

    if (!audienceId) {
      throw new ApiError(400, "audienceId is required");
    }

    const cohorts = await cohortService.getCohortsByAudience(
      audienceId as string
    );

    res.status(200).json({
      success: true,
      data: cohorts,
      count: cohorts.length,
    });
  }
);

/**
 * Get cohorts by tenant
 */
export const getCohortsByTenant = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = req.tenantId;

    if (!tenantId) {
      throw new ApiError(400, "Tenant ID is required");
    }

    const cohorts = await cohortService.getCohortsByTenant(tenantId);

    res.status(200).json({
      success: true,
      data: cohorts,
      count: cohorts.length,
    });
  }
);

/**
 * Update cohort
 */
export const updateCohort = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const cohort = await cohortService.updateCohort(id, updates);
  if (!cohort) {
    throw new ApiError(404, "Cohort not found");
  }

  res.status(200).json({
    success: true,
    data: cohort,
    message: "Cohort updated successfully",
  });
});

/**
 * Delete cohort
 */
export const deleteCohort = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleted = await cohortService.deleteCohort(id);
  if (!deleted) {
    throw new ApiError(404, "Cohort not found");
  }

  res.status(200).json({
    success: true,
    message: "Cohort deleted successfully",
  });
});

/**
 * Preview cohort data
 */
export const previewCohortData = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    const data = await cohortService.previewCohortData(
      id,
      parseInt(limit as string)
    );

    res.status(200).json({
      success: true,
      data,
      count: data.length,
    });
  }
);

/**
 * Get cohort counts
 */
// export const getCohortCounts = catchAsync(async (req: Request, res: Response) => {
//   const { id } = req.params;

//   const counts = await cohortService.getCohortCounts(id);

//   res.status(200).json({
//     success: true,
//     data: counts,
//   });
// });

/**
 * Download cohort data
 */
export const downloadCohortData = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const data = await cohortService.downloadCohortData(id);

    // Set headers for CSV download
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cohort-${id}-data.json"`
    );

    res.status(200).json({
      success: true,
      data,
      count: data.length,
    });
  }
);

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
export const getAllRelationships = catchAsync(
  async (req: Request, res: Response) => {
    const relationships = await audienceService.getAllRelationships();

    res.status(200).json({
      success: true,
      data: relationships,
      count: relationships.length,
    });
  }
);

/**
 * Get filterable fields for an object
 */
export const getObjectFields = catchAsync(
  async (req: Request, res: Response) => {
    const { objectId } = req.params;

    if (!objectId) {
      throw new ApiError(400, "objectId is required");
    }

    const fields = await audienceService.getObjectFields(parseInt(objectId));

    res.status(200).json({
      success: true,
      data: fields,
      count: fields.length,
    });
  }
);

/**
 * Get displayable fields for an object
 */
export const getObjectDisplayFields = catchAsync(
  async (req: Request, res: Response) => {
    const { objectId } = req.params;

    if (!objectId) {
      throw new ApiError(400, "objectId is required");
    }

    const fields = await audienceService.getObjectDisplayFields(
      parseInt(objectId)
    );

    res.status(200).json({
      success: true,
      data: fields,
      count: fields.length,
    });
  }
);

/**
 * Get distinct values for a field
 */
export const getFieldDistinctValues = catchAsync(
  async (req: Request, res: Response) => {
    const { objectId, fieldName } = req.params;
    const { limit = 100 } = req.query;

    if (!objectId || !fieldName) {
      throw new ApiError(400, "objectId and fieldName are required");
    }

    const values = await audienceService.getFilterValuesForAudienceField(
      parseInt(objectId),
      fieldName,
      parseInt(limit as string)
    );

    res.status(200).json({
      success: true,
      data: values,
      count: values.length,
    });
  }
);

/**
 * Generate cohort SQL
 */
export const generateCohortSQL = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const sql = await cohortService.generateCohortSQL(id);

    res.status(200).json({
      success: true,
      data: { sql },
    });
  }
);

/**
 * Get real-time cohort counts based on filter criteria (without creating a cohort)
 */
export const getFilterCounts = catchAsync(
  async (req: Request, res: Response) => {
    const { audienceId, companyFilters = [], contactFilters = [] } = req.body;

    if (!audienceId) {
      throw new ApiError(400, "audienceId is required");
    }

    if (!Array.isArray(companyFilters) || !Array.isArray(contactFilters)) {
      throw new ApiError(
        400,
        "companyFilters and contactFilters must be arrays"
      );
    }

    const filters = {
      companyFilters,
      contactFilters,
    };

    const counts = await cohortService.getFilterCounts(audienceId, filters);

    res.status(200).json({
      success: true,
      data: counts,
    });
  }
);

export const getFilterPreveiwData = catchAsync(
  async (req: Request, res: Response) => {
    const { audienceId, companyFilters = [], contactFilters = [] } = req.body;

    if (!audienceId) {
      throw new ApiError(400, "audienceId is required");
    }

    if (!Array.isArray(companyFilters) || !Array.isArray(contactFilters)) {
      throw new ApiError(
        400,
        "companyFilters and contactFilters must be arrays"
      );
    }

    const filters = {
      companyFilters,
      contactFilters,
    };

    const counts = await cohortService.getFilterPreveiwData(
      audienceId,
      filters
    );

    res.status(200).json({
      success: true,
      data: counts,
    });
  }
);

/**
 * Preview data based on filter criteria (without creating a cohort)
 */
export const previewFilterData = catchAsync(
  async (req: Request, res: Response) => {
    const {
      audienceId,
      companyFilters = [],
      contactFilters = [],
      limit = 100,
    } = req.body;

    if (!audienceId) {
      throw new ApiError(400, "audienceId is required");
    }

    if (!Array.isArray(companyFilters) || !Array.isArray(contactFilters)) {
      throw new ApiError(
        400,
        "companyFilters and contactFilters must be arrays"
      );
    }

    const filters = {
      companyFilters,
      contactFilters,
    };

    const data = await cohortService.previewFilterData(
      audienceId,
      filters,
      parseInt(limit as string)
    );

    res.status(200).json({
      success: true,
      data,
      count: data.length,
    });
  }
);

/**
 * Get audience object data (preview from BigQuery)
 */
export const getAudienceObjectData = catchAsync(
  async (req: Request, res: Response) => {
    const { id: audienceId, objectId } = req.params;
    const { limit = 50 } = req.query;

    if (!objectId) {
      throw new ApiError(400, "objectId is required");
    }

    const data = await audienceService.getAudienceObjectData(
      audienceId,
      parseInt(objectId as string),
      parseInt(limit as string)
    );

    res.status(200).json({
      success: true,
      data,
      count: data.length,
    });
  }
);

/**
 * Update object field configuration
 */
export const updateObjectFields = catchAsync(
  async (req: Request, res: Response) => {
    const { objectId } = req.params;
    const { fields } = req.body;

    if (!objectId) {
      throw new ApiError(400, "objectId is required");
    }

    if (!fields || !Array.isArray(fields)) {
      throw new ApiError(400, "fields array is required");
    }

    const updatedObject = await audienceService.updateObjectFields(
      parseInt(objectId),
      fields
    );

    res.status(200).json({
      success: true,
      data: updatedObject,
      message: "Object fields updated successfully",
    });
  }
);

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
