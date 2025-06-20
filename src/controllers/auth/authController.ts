import { Request, Response } from 'express';
import { AuthService } from '../../services/AuthService';
import { 
  LoginRequest, 
  GoogleLoginRequest, 
  TenantRequest, 
  UserStatusRequest,
  AuthenticatedRequest 
} from '../../types/api';
import catchAsync from '../../utils/catchAsync';
import ApiError from '../../utils/ApiError';
import { getClientIP } from '../../middleware/auth';

/**
 * Authentication Controllers
 * Handle HTTP requests for authentication endpoints
 */

/**
 * Get tenant information
 * POST /users/getTenant
 */
export const getTenant = catchAsync(async (req: Request, res: Response) => {
  const data: TenantRequest = req.body;
  
  if (!data.tenantname) {
    throw ApiError.badRequest('Tenant name is required');
  }

  const result = await AuthService.getTenant(data);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

/**
 * Get user status
 * POST /users/userStatus
 */
export const getUserStatus = catchAsync(async (req: Request, res: Response) => {
  const data: UserStatusRequest = req.body;
  
  if (!data.userid) {
    throw ApiError.badRequest('User ID is required');
  }

  const result = await AuthService.getUserStatus(data);
  
  res.status(200).json(result);
});

/**
 * Login user with JWT
 * POST /users/loginJWT
 */
export const loginJWT = catchAsync(async (req: Request, res: Response) => {
  const data: LoginRequest = req.body;
  const ip = getClientIP(req);
  
  if (!data.email || !data.password) {
    throw ApiError.badRequest('Email and password are required');
  }

  const result = await AuthService.loginJWT(data, ip);
  
  res.status(200).json(result);
});

/**
 * Logout user
 * POST /users/logout
 */
export const logout = catchAsync(async (req: Request, res: Response) => {
  const sessionToken = req.headers['session-token'] as string;
  
  if (!sessionToken) {
    throw ApiError.badRequest('Session token is required');
  }

  const result = await AuthService.logout(sessionToken);
  
  res.status(200).json(result);
});

/**
 * Google login/register
 * POST /users/googleLoginJWT
 */
export const googleLoginJWT = catchAsync(async (req: Request, res: Response) => {
  const data: GoogleLoginRequest = req.body;
  const ip = getClientIP(req);
  
  // Validate only essential required fields
  const requiredFields = ['email', 'username', 'googleID', 'organization_name', 'organization_domain', 'name'];
  for (const field of requiredFields) {
    if (!data[field as keyof GoogleLoginRequest]) {
      throw ApiError.badRequest(`${field} is required`);
    }
  }

  const result = await AuthService.googleLoginJWT(data, ip);
  
  res.status(200).json(result);
});

/**
 * Session persistence check
 * GET /session/persist
 */
export const persistSession = catchAsync(async (req: Request, res: Response) => {
  const ip = getClientIP(req);
  
  const result = await AuthService.persistSession(ip);
  
  res.status(result.statusCode || 200).json(result);
});

/**
 * Validate invitation
 * POST /auth/validate-invitation
 */
export const validateInvitation = catchAsync(async (req: Request, res: Response) => {
  const { invitation_id } = req.body;
  
  if (!invitation_id) {
    throw ApiError.badRequest('Invitation ID is required');
  }

  const result = await AuthService.validateInvitation(invitation_id);
  
  res.status(200).json(result);
});

/**
 * Google signup with invitation
 * POST /auth/google-signup
 */
export const googleSignup = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const ip = getClientIP(req);
  
  // Validate required fields
  const requiredFields = ['email', 'username', 'googleID', 'name', 'inviteID'];
  for (const field of requiredFields) {
    if (!data[field]) {
      throw ApiError.badRequest(`${field} is required`);
    }
  }

  const result = await AuthService.googleSignupWithInvitation(data, ip);
  
  res.status(200).json(result);
});
