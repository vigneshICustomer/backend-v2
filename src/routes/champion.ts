import express from 'express';
import { getPicklistValues } from '../controllers/champion/championController';
import { checkAuthToken } from '../middleware/auth';
import { generalRateLimit } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * Champion Routes
 */

// Apply authentication middleware
router.use(checkAuthToken());

// Apply rate limiting
router.use(generalRateLimit);

/**
 * Champion Tracking Routes (Protected)
 */

// Get picklist values for champion tracking
router.post('/getPicklistValues', getPicklistValues);

export default router;
