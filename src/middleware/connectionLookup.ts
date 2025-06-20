import { Response, NextFunction } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/ApiError';
import { db } from '../db/connection';
import { connections } from '../db/schema/connections';
import { AuthenticatedRequest } from '../types/api';

/**
 * Middleware to lookup BigQuery connection ID based on organisation_id
 * This middleware should be used after authentication middleware
 */
export const lookupBigQueryConnection = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Get organisation_id from authenticated user or tenant header
  const organisationId = req.user?.organisation_id || req.tenantId || req.headers['x-tenant-id'] as string;
  
  if (!organisationId) {
    throw ApiError.badRequest('Organisation ID is required');
  }

  try {
    console.log('Looking up BigQuery connection for organisation:', organisationId);
    
    // Query to find BigQuery connection for this organisation using Drizzle
    const connectionRecords = await db
      .select({
        id: connections.id,
        name: connections.name,
        type: connections.type,
        status: connections.status
      })
      .from(connections)
      .where(
        and(
          eq(connections.organisationId, organisationId),
          eq(connections.type, 'bigquery'),
          eq(connections.status, 'connected')
        )
      )
      .orderBy(desc(connections.createdAt))
      .limit(1);
    
    console.log('Found connections:', connectionRecords);
    
    if (connectionRecords.length === 0) {
      throw ApiError.notFound('No active BigQuery connection found for this organisation. Please create a BigQuery connection first.');
    }
    
    const connectionRecord = connectionRecords[0];
    
    // Add connection info to request object
    req.bigQueryConnection = {
      id: connectionRecord.id,
      name: connectionRecord.name,
      type: connectionRecord.type,
      status: connectionRecord.status
    };
    
    console.log('BigQuery connection found:', req.bigQueryConnection);
    next();
  } catch (error) {
    console.error('Error in lookupBigQueryConnection:', error);
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(ApiError.internal('Failed to lookup BigQuery connection: ' + (error as Error).message));
  }
});

/**
 * Middleware to lookup any connection ID based on organisation_id and connection type
 */
export const lookupConnection = (connectionType: string = 'bigquery') => {
  return catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Get organisation_id from authenticated user or tenant header
    const organisationId = req.user?.organisation_id || req.tenantId || req.headers['x-tenant-id'] as string;
    
    if (!organisationId) {
      throw ApiError.badRequest('Organisation ID is required');
    }

    try {
      // Query to find connection for this organisation and type using Drizzle
      const connectionRecords = await db
        .select({
          id: connections.id,
          name: connections.name,
          type: connections.type,
          status: connections.status
        })
        .from(connections)
        .where(
          and(
            eq(connections.organisationId, organisationId),
            eq(connections.type, connectionType),
            eq(connections.status, 'connected')
          )
        )
        .orderBy(desc(connections.createdAt))
        .limit(1);
      
      if (connectionRecords.length === 0) {
        throw ApiError.notFound(`No active ${connectionType} connection found for this organisation. Please create a ${connectionType} connection first.`);
      }
      
      const connectionRecord = connectionRecords[0];
      
      // Add connection info to request object
      req.connectionInfo = {
        id: connectionRecord.id,
        name: connectionRecord.name,
        type: connectionRecord.type,
        status: connectionRecord.status
      };
      
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error);
      }
      return next(ApiError.internal(`Failed to lookup ${connectionType} connection`));
    }
  });
};
