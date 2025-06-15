import express from 'express';
import { deleteTemplate } from '../controllers/enrichTemplate/enrichTemplateController';
import { generalRateLimit } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * Enrich Template Routes
 */

// Apply rate limiting
router.use(generalRateLimit);

/**
 * Enrich Template Management Routes
 */

// Delete enrich template
router.post('/deleteTemplate', deleteTemplate);

export default router;
