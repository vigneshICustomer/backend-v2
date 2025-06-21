import express from 'express';
import {
  getUserSetting,
  updateUser,
  inviteUser,
  updateMemberInvite,
  getInvitedMemberData,
  updateRole,
  uploadLogo,
  readLogo,
  updateOrganizations,
  saveEnrichTemplate,
  getEnrichTemplateData,
  editEnrichTemplateData
} from '../controllers/settings/settingsController';
import { checkAuthToken } from '../middleware/auth';
import { generalRateLimit } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * Settings Routes
 */

// Public routes (no authentication required)
router.post('/readLogo', generalRateLimit, readLogo);

// Apply authentication middleware to protected routes
router.use(checkAuthToken());

// Apply rate limiting to protected routes
router.use(generalRateLimit);

/**
 * User Settings Routes (Protected)
 */

// Get user settings/profile information
router.post('/getUserSetting', getUserSetting);

// Update user profile (self-update only)
router.post('/updateUser', updateUser);

// Invite new user to organization (admin only - validation in controller)
router.post('/inviteUser', inviteUser);

// Update member invitation status
router.post('/updateMemberInvite', updateMemberInvite);

// Get invited member data for organization
router.post('/getInvitedMemberData', getInvitedMemberData);

// Update user role (admin only - validation in controller)
router.post('/updateRole', updateRole);

// Logo management
router.post('/uploadLogo', uploadLogo);

// Organization management
router.post('/updateOrganizations', updateOrganizations);

// Enrich template management
router.post('/saveEnrichTemplate', saveEnrichTemplate);
router.post('/getEnrichTemplateData', getEnrichTemplateData);
router.post('/editEnrichTemplateData', editEnrichTemplateData);

export default router;
