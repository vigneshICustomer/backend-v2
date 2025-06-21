import express from 'express';
import {
  getPicklistValues,
  getColumns,
  liveTable,
  displayTable,
  enrichColumns,
  cleanAndNormalizeData,
  peopleCleanAndNormalizeData,
  deduplicateData
} from '../controllers/insights/insightsController';
import { 
  authRateLimit,
  getAPIkey
} from '../middleware/rateLimiter';
import { checkAuthToken } from '../middleware/auth';

const router = express.Router();

/**
 * Insights and Analytics Routes
 * All routes related to data insights and enrichment
 */

// Insights & Analytics Endpoints
router.post('/insights/getPicklistValues', checkAuthToken(), getPicklistValues);
router.post('/insightsRoutes/getColumns', getColumns);
router.post('/insightsRoutes/liveTable', liveTable);
router.post('/insightsRoutes/displayTable', displayTable);

// Data Enrichment Endpoints
router.post('/insightsRoutes/enrichColumns', getAPIkey, enrichColumns);
router.post('/insightsRoutes/clean-normalize', cleanAndNormalizeData);
router.post('/insightsRoutes/people-clean-normalize', peopleCleanAndNormalizeData);
router.post('/insightsRoutes/deduplicate', deduplicateData);

export default router;
