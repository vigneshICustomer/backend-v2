import express from 'express';
import {
  getTenant,
  getUserStatus,
  loginJWT,
  logout,
  googleLoginJWT,
  persistSession,
  validateInvitation,
  googleSignup
} from '../controllers/auth/authController';
import { 
  authRateLimit, 
  checkAccountLocking, 
  checkUserRequestLimit
} from '../middleware/rateLimiter';

const router = express.Router();

/**
 * Authentication Routes
 * Only the 6 required authentication endpoints
 */

// Tenant and user status routes
router.post('/users/getTenant', getTenant);
router.post('/users/userStatus', getUserStatus);

// Authentication routes with rate limiting
router.post('/users/loginJWT', checkAccountLocking, checkUserRequestLimit, authRateLimit, loginJWT);
router.post('/users/logout', logout);
router.post('/users/googleLoginJWT', authRateLimit, googleLoginJWT);

// Session management
router.get('/session/persist', persistSession);

// Invitation routes
router.post('/auth/validate-invitation', validateInvitation);
router.post('/auth/google-signup', authRateLimit, googleSignup);

export default router;
