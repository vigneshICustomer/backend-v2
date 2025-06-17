import { Router } from 'express';
import { checkAuthToken, validateTenant } from '../middleware/auth';
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
  getCohortCounts,
  downloadCohortData,
  generateCohortSQL,
  
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
} from '../controllers/audiences/audienceController';

const router = Router();

// Apply tenant validation middleware to all routes except health check
router.use('/audiences', checkAuthToken);
router.use('/cohorts', checkAuthToken);
router.use('/objects', checkAuthToken);

// Health check
router.get('/audiences/health', healthCheck);

// Audience routes
router.post('/audiences', createAudience);
router.get('/audiences/:id', getAudienceById);
router.get('/audiences/:id/details', getAudienceWithDetails);
router.get('/audiences', getAudiencesList);
router.put('/audiences/:id', updateAudience);
router.delete('/audiences/:id', deleteAudience);

// Cohort routes
router.post('/cohorts', createCohort);
router.get('/cohorts/:id', getCohortById);
router.get('/cohorts/:id/details', getCohortWithAudience);
router.get('/cohorts', getCohortsByTenant); // Can be filtered by audienceId or tenantId
router.put('/cohorts/:id', updateCohort);
router.delete('/cohorts/:id', deleteCohort);

// Cohort data routes
router.get('/cohorts/:id/preview', previewCohortData);
router.get('/cohorts/:id/counts', getCohortCounts);
router.get('/cohorts/:id/download', downloadCohortData);
router.get('/cohorts/:id/sql', generateCohortSQL);

// Alternative cohort routes by audience
router.get('/audiences/:audienceId/cohorts', getCohortsByAudience);

// Utility routes
router.get('/objects', getAllObjects);
router.get('/relationships', getAllRelationships);

// Field configuration routes
router.get('/objects/:objectId/fields', getObjectFields);
router.get('/objects/:objectId/display-fields', getObjectDisplayFields);
router.get('/objects/:objectId/fields/:fieldName/values', getFieldDistinctValues);
router.put('/objects/:objectId/fields', updateObjectFields);

// Audience data routes
router.get('/audiences/:id/objects/:objectId/data', getAudienceObjectData);

export default router;
