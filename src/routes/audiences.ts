import { Router } from "express";
import { checkAuthToken } from "../middleware/auth";
import {
  // Audience endpoints
  createAudience,
  getAudienceById,
  getAudienceWithDetails,
  getAudiencesList,
  updateAudience,
  deleteAudience,

  // Cohort endpoints
  createCohort,
  getCohortById,
  getCohortWithAudience,
  getCohortsByAudience,
  getCohortsByTenant,
  updateCohort,
  deleteCohort,

  // Cohort data endpoints
  previewCohortData,
  downloadCohortData,
  generateCohortSQL,

  // Real-time filter endpoints
  getFilterCounts,
  previewFilterData,

  // Utility endpoints
  getAllObjects,
  getAllRelationships,
  healthCheck,

  // Field configuration endpoints
  getObjectFields,
  getObjectDisplayFields,
  getFieldDistinctValues,
  updateObjectFields,
  getAudienceObjectData,
  getFilterPreveiwData,
} from "../controllers/audiences/audienceController";

const router = Router();

// Health check (no auth required)
router.get("/audiences/health", healthCheck);

// Audience routes (require tenant validation)
router.post("/audiences", checkAuthToken({ requireTenant: true }), createAudience);
router.get("/audiences/:id", checkAuthToken({ requireTenant: true }), getAudienceById);
router.get("/audiences/:id/details", checkAuthToken({ requireTenant: true }), getAudienceWithDetails);
router.get("/audiences", checkAuthToken({ requireTenant: true }), getAudiencesList);
router.put("/audiences/:id", checkAuthToken({ requireTenant: true }), updateAudience);
router.delete("/audiences/:id", checkAuthToken({ requireTenant: true }), deleteAudience);

// Cohort routes (require tenant validation)
router.post("/cohorts", checkAuthToken({ requireTenant: true }), createCohort);
router.get("/cohorts/:id", checkAuthToken({ requireTenant: true }), getCohortById);
router.get("/cohorts/:id/details", checkAuthToken({ requireTenant: true }), getCohortWithAudience);
router.get("/cohorts", checkAuthToken({ requireTenant: true }), getCohortsByTenant);
router.put("/cohorts/:id", checkAuthToken({ requireTenant: true }), updateCohort);
router.delete("/cohorts/:id", checkAuthToken({ requireTenant: true }), deleteCohort);

// Cohort data routes (require source connection)
router.get("/cohorts/:id/preview", checkAuthToken({ requireSource: true }), previewCohortData);
// router.get('/cohorts/:id/counts', getCohortCounts);
router.get("/cohorts/:id/download", checkAuthToken({ requireTenant: true }), downloadCohortData);
router.get("/cohorts/:id/sql", checkAuthToken({ requireTenant: true }), generateCohortSQL);

// Alternative cohort routes by audience
router.get("/audiences/:audienceId/cohorts", checkAuthToken({ requireTenant: true }), getCohortsByAudience);

// Real-time filter endpoints (require source connection)
router.post("/filters/counts", checkAuthToken({ requireSource: true }), getFilterCounts);
router.post("/filters/preview", checkAuthToken({ requireSource: true }), previewFilterData);
router.post("/filters/get-preview", checkAuthToken({ requireSource: true }), getFilterPreveiwData);

// Utility routes (require tenant validation)
router.get("/objects", checkAuthToken({ requireTenant: true }), getAllObjects);
router.get("/relationships", checkAuthToken({ requireTenant: true }), getAllRelationships);

// Field configuration routes
router.get("/objects/:objectId/fields", checkAuthToken({ requireTenant: true }), getObjectFields);
router.get("/objects/:objectId/display-fields", checkAuthToken({ requireTenant: true }), getObjectDisplayFields);
router.get(
  "/objects/:objectId/fields/:fieldName/values",
  checkAuthToken({ requireSource: true }),
  getFieldDistinctValues
);
router.put("/objects/:objectId/fields", checkAuthToken({ requireTenant: true }), updateObjectFields);

// Audience data routes (require source connection)
router.get("/audiences/:id/objects/:objectId/data", checkAuthToken({ requireSource: true }), getAudienceObjectData);

export default router;
