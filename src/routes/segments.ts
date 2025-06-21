import express from 'express';
import {
  fetchAllSegments,
  fetchSegmentsByModelId,
  getFolders,
  createFolder,
  saveSegmentData,
  getUserIntegrations,
  getSegmentFilterCriteria,
  getSegmentFilterCriteriaCount,
  saveUserFilter,
  getUserFilters,
  deleteUserFilter
} from '../controllers/segments/segmentController';
import { checkAuthToken } from '../middleware/auth';

const router = express.Router();

/**
 * Audience & Segment Management Routes
 * All routes related to audience and segment management
 */

// Audience & Segment Endpoints
router.post('/audience/fetch-all-segments', fetchAllSegments);
router.post('/audience/fetch-segments-modelId', fetchSegmentsByModelId);
router.get('/audience/folders', getFolders);
router.post('/audience/folders', createFolder);
router.post('/segment/save-segment-data', saveSegmentData);
router.post('/integration/integrationList', checkAuthToken(), getUserIntegrations);
router.post('/segment/segment-filter-criteria', getSegmentFilterCriteria);
router.post('/audience/segment-filter-criteria-count', getSegmentFilterCriteriaCount);

// User Filter Endpoints
router.get('/segment/filters', getUserFilters);
router.post('/segment/filters', saveUserFilter);
router.delete('/segment/filters/:filter_id', deleteUserFilter);

export default router;
