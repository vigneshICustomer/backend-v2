import { Request, Response } from 'express';
import { UserSettingsService } from '../../services/UserSettingsService';
import { S3Service } from '../../services/S3Service';
import catchAsync from '../../utils/catchAsync';
import ApiError from '../../utils/ApiError';
import { AuthenticatedRequest } from '../../types/api';

/**
 * Settings Controllers
 * Handle HTTP requests for user settings and organization management endpoints
 */

/**
 * Get user settings
 * POST /settings/getUserSetting
 */
export const getUserSetting = catchAsync(async (req: Request, res: Response) => {
  const { userID } = req.body;
  
  if (!userID) {
    throw ApiError.badRequest('User ID is required');
  }

  const result = await UserSettingsService.getUserSettings(userID);
  
  res.status(200).json(result);
});

/**
 * Update user profile
 * POST /settings/updateUser
 */
export const updateUser = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { name, userID } = req.body;
  
  if (!req.user) {
    throw ApiError.unauthorized('User authentication required');
  }

  if (!name || !userID) {
    throw ApiError.badRequest('Name and User ID are required');
  }

  const result = await UserSettingsService.updateUser(userID, name, req.user.id);
  
  res.status(200).json(result);
});

/**
 * Invite new user to organization
 * POST /settings/inviteUser
 */
export const inviteUser = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { mailList, invited_by, role, organisation_id } = req.body;
  
  if (!req.user) {
    throw ApiError.unauthorized('User authentication required');
  }

  if (!mailList || !invited_by || !role || !organisation_id) {
    throw ApiError.badRequest('Mail list, invited by, role, and organisation ID are required');
  }

  const result = await UserSettingsService.inviteUser(mailList, invited_by, role, organisation_id);
  
  res.status(200).json(result);
});

/**
 * Update member invitation status
 * POST /settings/updateMemberInvite
 */
export const updateMemberInvite = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email) {
    throw ApiError.badRequest('Email is required');
  }

  await UserSettingsService.updateMemberInvite(email);
  
  res.status(200).json({
    status: 'success',
    message: 'Member invite updated successfully'
  });
});

/**
 * Get invited member data for organization
 * POST /settings/getInvitedMemberData
 */
export const getInvitedMemberData = catchAsync(async (req: Request, res: Response) => {
  const { organisation_id } = req.body;
  
  if (!organisation_id) {
    throw ApiError.badRequest('Organisation ID is required');
  }

  const result = await UserSettingsService.getInvitedMemberData(organisation_id);
  
  res.status(200).json(result);
});

/**
 * Update user role
 * POST /settings/updateRole
 */
export const updateRole = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { role, email, created_date } = req.body;
  
  if (!req.user) {
    throw ApiError.unauthorized('User authentication required');
  }

  if (!role || !email) {
    throw ApiError.badRequest('Role and email are required');
  }

  const result = await UserSettingsService.updateRole(role, email, created_date);
  
  res.status(200).json(result);
});

/**
 * Upload logo (generate pre-signed URL)
 * POST /settings/uploadLogo
 */
export const uploadLogo = catchAsync(async (req: Request, res: Response) => {
  const { organizationDomain } = req.body;
  
  if (!organizationDomain) {
    throw ApiError.badRequest('Organization domain is required');
  }

  const uploadURL = await S3Service.generateUploadURL(organizationDomain);
  
  res.status(200).json({ uploadURL });
});

/**
 * Read logo from S3
 * POST /settings/readLogo
 */
export const readLogo = catchAsync(async (req: Request, res: Response) => {
  const { organizationDomain } = req.body;
  
  if (!organizationDomain) {
    throw ApiError.badRequest('Organization domain is required');
  }

  const imageData = await S3Service.readLogo(organizationDomain);
  
  if (!imageData) {
    return res.status(404).json({ error: 'Image not found.' });
  }
  
  res.status(200).json({ imageData });
});

/**
 * Update organization details
 * POST /settings/updateOrganizations
 */
export const updateOrganizations = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { OrganizationName, OrganizationCountry, userID } = req.body;
  
  if (!req.user) {
    throw ApiError.unauthorized('User authentication required');
  }

  if (!OrganizationName || !userID) {
    throw ApiError.badRequest('Organization name and user ID are required');
  }

  const result = await UserSettingsService.updateOrganizations(OrganizationName, OrganizationCountry, userID);
  
  res.status(200).json(result);
});
