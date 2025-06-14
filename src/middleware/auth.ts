import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import environment from '../config/environment';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import connection from '../config/database';
import { usersTable, userSessionsTable, userAuthTable } from '../config/tableConfig';
import { AuthenticatedRequest, User, UserSession } from '../types/api';

/**
 * Generate API key for user
 */
export const generateApiKey = (length: number = 32): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let apiKey = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    apiKey += characters[randomIndex];
  }
  return apiKey;
};

/**
 * Middleware to check JWT and session tokens
 */
export const checkAuthToken = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Extract tokens from headers
  const authHeader = req.headers.authorization;
  const sessionToken = req.headers['session-token'] as string;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !sessionToken) {
    throw ApiError.unauthorized('Missing required tokens');
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, environment.JWT_SECRET_KEY) as any;

    // Get user record
    const userQuery = `SELECT * FROM ${usersTable.schemaTableName} WHERE ${usersTable.id} = $1`;
    const userResult = await connection.query(userQuery, [decoded.id]);

    if (userResult.rows.length === 0) {
      throw ApiError.forbidden('Invalid user');
    }

    const userRecord: User = userResult.rows[0];

    // Validate session
    const sessionQuery = `
      SELECT * FROM ${userSessionsTable.schemaTableName}
      WHERE ${userSessionsTable.user_id} = $1 
      AND ${userSessionsTable.session_token} = $2
      AND ${userSessionsTable.is_valid} = true
      AND ${userSessionsTable.expires_at} > CURRENT_TIMESTAMP
    `;

    const sessionResult = await connection.query(sessionQuery, [userRecord.id, sessionToken]);

    if (sessionResult.rows.length === 0) {
      throw ApiError.unauthorized('Invalid or expired session');
    }

    // Attach user information to request
    req.user = userRecord;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(ApiError.forbidden('Authentication failed'));
  }
});

/**
 * Middleware to get or generate API key for user
 */
export const getAPIkey = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw ApiError.unauthorized('Missing Token');
  }

  try {
    const decoded = jwt.verify(token, environment.JWT_SECRET_KEY) as any;

    // Check if user already has an API key
    const apiKeyQuery = `
      SELECT ${userAuthTable.oauth_token} 
      FROM ${userAuthTable.schemaTableName} 
      WHERE ${userAuthTable.user_id} = $1
    `;
    
    const result = await connection.query(apiKeyQuery, [decoded.id]);

    let apiKey = result.rows[0]?.oauth_token;
    
    if (!apiKey) {
      // Generate new API key
      apiKey = generateApiKey(32);

      // Insert new API key record
      const insertQuery = `
        INSERT INTO ${userAuthTable.schemaTableName} 
        (${userAuthTable.user_id}, ${userAuthTable.oauth_token}, ${userAuthTable.allotedcredits}, ${userAuthTable.remaining_credits}) 
        VALUES ($1, $2, $3, $4)
      `;
      
      await connection.query(insertQuery, [decoded.id, apiKey, 10000, 10000]);
    }

    req.apiKey = apiKey;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(ApiError.forbidden('Invalid token'));
    }
    return next(ApiError.internal('Database error occurred'));
  }
});

/**
 * Middleware to check if user is organization admin
 */
export const isOrganisationAdmin = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Check if user is admin or super admin
  if (req.user.role === 'Admin' || req.user.is_super_admin) {
    return next();
  }

  throw ApiError.forbidden('Insufficient permissions - Admin access required');
});

/**
 * Middleware to check if user is super admin
 */
export const isSuperAdmin = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  if (!req.user.is_super_admin) {
    throw ApiError.forbidden('Insufficient permissions - Super Admin access required');
  }

  next();
});

/**
 * Generate session token
 */
export const generateSessionToken = (): string => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create user session
 */
export const createUserSession = async (userId: string, ip: string, jwtToken: string): Promise<string> => {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Session expires in 24 hours

  const sessionQuery = `
    INSERT INTO ${userSessionsTable.schemaTableName} 
    (${userSessionsTable.user_id}, ${userSessionsTable.session_token}, ${userSessionsTable.expires_at}, ${userSessionsTable.is_valid}, ${userSessionsTable.ip}, ${userSessionsTable.jwt_token})
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  await connection.query(sessionQuery, [userId, sessionToken, expiresAt, true, ip, jwtToken]);
  
  return sessionToken;
};

/**
 * Invalidate user session
 */
export const invalidateUserSession = async (sessionToken: string): Promise<void> => {
  const query = `
    UPDATE ${userSessionsTable.schemaTableName}
    SET ${userSessionsTable.is_valid} = false
    WHERE ${userSessionsTable.session_token} = $1
  `;

  await connection.query(query, [sessionToken]);
};

/**
 * Get client IP address
 */
export const getClientIP = (req: Request): string => {
  const defaultIP = "0.0.0.0";
  return (
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.headers["cf-connecting-ip"] ||
    req.socket.remoteAddress ||
    defaultIP
  ) as string;
};

/**
 * Middleware to validate tenant ID from headers
 */
export const validateTenant = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    throw ApiError.badRequest('Tenant ID is required in x-tenant-id header');
  }
  
  // If user is authenticated, check if user belongs to the tenant
  if (req.user && req.user.organisation_id !== tenantId && !req.user.is_super_admin) {
    throw ApiError.forbidden('Access denied for this tenant');
  }
  
  // Add tenant ID to request for easy access
  req.tenantId = tenantId;
  
  next();
});
