import axios from 'axios';
import connection from '../config/database';
import { 
  audienceTable, 
  integrationTable,
  usersTable
} from '../config/tableConfig';
import ApiError from '../utils/ApiError';
import { isValidSelectQuery } from '../utils/helpers';

/**
 * Segment Service
 * Handles audience and segment management operations
 */
export class SegmentService {
  /**
   * Get all segments for organization
   */
  static async fetchAllSegments(tenantId: string): Promise<any> {
    try {
      const query = {
        text: 'SELECT * FROM dev.segments_v4 WHERE segments_v4.tenent_id = $1',
        values: [tenantId]
      };

      const result = await connection.query(query);
      
      return {
        status: 'success',
        data: result.rows
      };
    } catch (error) {
      console.error('Error fetching segments:', error);
      throw ApiError.internal('Error fetching segments');
    }
  }

  /**
   * Get all segments for specific model
   */
  static async fetchSegmentsByModelId(modelId: string, tenantId: string): Promise<any> {
    try {
      const query = {
        text: "SELECT * FROM dev.segments_v4 WHERE tenent_id = $1 AND model_id = $2",
        values: [tenantId, modelId]
      };

      const result = await connection.query(query);
      
      return {
        status: 'success',
        data: result.rows
      };
    } catch (error) {
      console.error('Error fetching segments by model ID:', error);
      throw ApiError.internal('Error fetching segments');
    }
  }

  /**
   * Get folders for organization
   */
  static async getFolders(tenantId: string): Promise<any> {
    try {
      const query = {
        text: `SELECT * FROM dev.folders 
               WHERE tenant_id = $1 
               AND is_deleted IS NULL 
               ORDER BY created_at DESC`,
        values: [tenantId]
      };
      
      const result = await connection.query(query);
      
      return {
        status: 'success',
        data: result.rows
      };
    } catch (error) {
      console.error('Error fetching folders:', error);
      throw ApiError.internal('Error fetching folders');
    }
  }

  /**
   * Create a new folder
   */
  static async createFolder(name: string, tenantId: string, parentFolderId?: string): Promise<any> {
    try {
      const query = {
        text: `INSERT INTO dev.folders 
               (name, tenant_id, root_folder, childern_folders, segments)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING *`,
        values: [name, tenantId, parentFolderId ? false : true, [], []]
      };
      
      const result = await connection.query(query);
      const newFolder = result.rows[0];
      
      // If this is a child folder, update parent's children_folders array
      if (parentFolderId) {
        await connection.query(
          `UPDATE dev.folders 
           SET childern_folders = array_append(childern_folders, $1)
           WHERE id = $2`,
          [newFolder.id, parentFolderId]
        );
      }
      
      return {
        status: 'success',
        data: newFolder
      };
    } catch (error) {
      console.error('Error creating folder:', error);
      throw ApiError.internal('Error creating folder');
    }
  }

  /**
   * Save segment data
   */
  static async saveSegmentData(segmentData: any): Promise<any> {
    const BATCH_SIZE = 1000;
    const MAX_CONCURRENT_BATCHES = 5;
    let client: any;
    
    try {
      client = connection;
      
      // Input validation
      const requiredFields = ['tenentId', 'segmentName', 'folderName', 'audience', 'audience_id', 'size', 'owner', 'status'];
      const missingFields = requiredFields.filter(field => !segmentData[field]);
      
      if (missingFields.length > 0) {
        throw ApiError.badRequest(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const {
        tenentId, segmentName, folderName, audience, audience_id,
        size, destination, owner, status, segmentData: data = [],
        parent_folder_id, modelId
      } = segmentData;

      await client.query('BEGIN');

      // First insert the segment metadata
      const insertQuery = {
        text: `INSERT INTO dev.segments_v4 
               (tenent_id, name, folder_name, audience, audience_id, size, status, destination, owner, parent_folder_id, model_id) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
               RETURNING id`,
        values: [tenentId, segmentName, folderName, audience, audience_id, size, status, destination, owner, parent_folder_id, modelId]
      };

      const result = await client.query(insertQuery);
      const segmentId = result.rows[0].id;
      
      if (data && data.length > 0) {
        // Find the object with the most keys for schema definition
        const templateObject = data.reduce((prev: any, current: any) => 
          Object.keys(current).length > Object.keys(prev).length ? current : prev
        );

        // Generate column definitions
        const columnDefinitions = Object.entries(templateObject)
          .filter(([key]) => key !== 'key')
          .map(([key, value]) => {
            const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            let columnType;
            
            if (typeof value === 'number') {
              columnType = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
            } else if (typeof value === 'boolean') {
              columnType = 'BOOLEAN';
            } else if (value instanceof Date) {
              columnType = 'TIMESTAMP';
            } else {
              columnType = 'TEXT';
            }
            
            return `"${sanitizedKey}" ${columnType}`;
          })
          .join(',\n    ');

        // Create table with dynamic columns
        const tableId = `segment_data_${segmentId.replaceAll(/-/g, '_')}`;
        const createTableQuery = `
          CREATE TABLE segment_data.${tableId} (
            ${columnDefinitions},
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_deleted BOOLEAN DEFAULT FALSE,
            batch_id INTEGER
          )
        `;

        await client.query(createTableQuery);

        // Create a temporary staging table for batch processing
        const stagingTableQuery = `
          CREATE TEMP TABLE staging_${tableId} (
            LIKE segment_data.${tableId} INCLUDING ALL
          ) ON COMMIT DROP
        `;
        await client.query(stagingTableQuery);

        // Split data into batches
        const batches = [];
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          batches.push(data.slice(i, i + BATCH_SIZE));
        }

        // Process batches concurrently with a limit
        const processBatch = async (batch: any[], batchIndex: number) => {
          const columns = Object.keys(templateObject)
            .filter(key => key !== 'key')
            .map(key => key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase());

          const values = batch.map(row => 
            columns.map(col => {
              const originalKey = Object.keys(templateObject)
                .find(key => key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() === col);
              const value = row[originalKey!];
              return value === undefined || value === '' ? null : value;
            })
          );

          const placeholders = values.map((_, rowIndex) =>
            `(${columns.map((_, colIndex) => 
              `$${rowIndex * columns.length + colIndex + 1}`
            ).join(', ')}, ${batchIndex})`
          ).join(',\n');

          const batchInsertQuery = {
            text: `
              INSERT INTO staging_${tableId}
              (${columns.map(col => `"${col}"`).join(', ')}, batch_id)
              VALUES ${placeholders}
            `,
            values: values.flat()
          };

          await client.query(batchInsertQuery);
        };

        // Process batches with concurrency control
        for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
          const batchPromises = batches
            .slice(i, i + MAX_CONCURRENT_BATCHES)
            .map((batch, index) => processBatch(batch, i + index));
          
          await Promise.all(batchPromises);

          // Move processed batches from staging to final table
          await client.query(`
            INSERT INTO segment_data.${tableId}
            SELECT * FROM staging_${tableId}
            WHERE batch_id >= $1 AND batch_id < $2
          `, [i, i + MAX_CONCURRENT_BATCHES]);

          // Clear processed batches from staging
          await client.query(`
            DELETE FROM staging_${tableId}
            WHERE batch_id >= $1 AND batch_id < $2
          `, [i, i + MAX_CONCURRENT_BATCHES]);
        }
      }

      await client.query('COMMIT');

      return {
        status: 'success',
        message: 'Segment data saved successfully',
        segmentId: segmentId
      };

    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      
      console.error('Error saving segment data:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Error saving segment data');
    }
  }

  /**
   * Get user integrations
   */
  static async getUserIntegrations(userId: string): Promise<any> {
    try {
      const query = `SELECT ${integrationTable.integrationname}, ${integrationTable.status}, ${integrationTable.createddate}, ${integrationTable.updateddate} FROM ${integrationTable.schemaTableName} WHERE ${integrationTable.user_id}=$1`;
      const result = await connection.query(query, [userId]);
      
      return {
        status: 'success',
        message: "Users Integrations fetched successfully!",
        data: result.rows
      };
    } catch (error) {
      console.error("Error fetching integrations:", error);
      throw ApiError.internal('Error fetching integrations');
    }
  }

  /**
   * Preview segment based on conditions
   */
  static async getSegmentFilterCriteria(
    sqlQuery: string, 
    tableSlug: string, 
    organisation: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<any> {
    if (!sqlQuery) {
      throw ApiError.badRequest("Payload is required");
    }

    if (!this.isValidSelectQuery(sqlQuery)) {
      throw ApiError.badRequest("Invalid SQL Query format.");
    }

    try {
      // Modify the query to include pagination
      const offset = (page - 1) * limit;

      const combinedQuery = `
          WITH filtered_data AS (
              ${sqlQuery.replace(';', '')}
          )
          SELECT 
              (SELECT COUNT(*) FROM filtered_data) AS total_count,
              * 
          FROM filtered_data
          LIMIT ${limit} OFFSET ${offset};
      `;
      
      // TAG: Customer Data Query
      const result = await connection.query(combinedQuery);
      let isResultEmpty = false;

      // This is BigQueryResult - check if result[0] exists and has length
      isResultEmpty = !result.rows || result.rows.length === 0;

      // Handle case where no results are found
      if (isResultEmpty) {
          return {
              results: [],
              pagination: {
                  total: 0,
                  totalPages: 0,
                  currentPage: page,
                  hasMore: false
              },
              message: "No data exist in the database or check the query correctly."
          };
      }

      // Safely access total_count with fallback
      const totalCount = result.rows[0]?.total_count;
      const totalPages = Math.ceil(totalCount / limit);

      return { 
          query: sqlQuery, 
          results: result.rows,
          pagination: {
              total: totalCount,
              totalPages,
              currentPage: page,
              hasMore: page < totalPages
          }
      };
    } catch (error) {
      console.error("Error executing query:", error);
      throw ApiError.badRequest(error instanceof Error ? error.message : 'Query execution failed');
    }
  }

  /**
   * Get segment filter count
   */
  static async getSegmentFilterCriteriaCount(
    payload: any, 
    tableSlug: string, 
    organisation: string
  ): Promise<any> {
    if (!payload) {
      throw ApiError.badRequest("Payload is required");
    }

    try {
      const [sqlQuery, countSQLQuery] = this.generateSQLQueryForSegment(payload, tableSlug, organisation);

      // Execute the query and fetch results
      const results = await connection.query(countSQLQuery);

      return {
        status: 'success',
        results: results
      };
    } catch (error) {
      console.error("Error executing query:", error);
      throw ApiError.badRequest(error instanceof Error ? error.message : 'Query execution failed');
    }
  }

  /**
   * Save user filter
   */
  static async saveUserFilter(
    name: string, 
    filterData: any, 
    tenantId: string, 
    userEmail: string,
    modelId?: string
  ): Promise<any> {
    try {
      // First check if a filter with this name already exists for this user
      const checkQuery = {
        text: `SELECT COUNT(*) 
               FROM dev.user_filters 
               WHERE tenant_id = $1 
               AND user_email = $2 
               AND name = $3
               ${modelId ? 'AND model_id = $4' : ''}
               AND is_deleted IS NULL`,
        values: modelId ? [tenantId, userEmail, name, modelId] : [tenantId, userEmail, name]
      };
      
      const existingFilter = await connection.query(checkQuery);
      
      if (existingFilter.rows[0].count > 0) {
        throw ApiError.badRequest('A filter with this name already exists');
      }

      const query = {
        text: `INSERT INTO dev.user_filters 
               (name, filter_data, tenant_id, user_email${modelId ? ', model_id' : ''})
               VALUES ($1, $2, $3, $4${modelId ? ', $5' : ''})
               RETURNING *`,
        values: modelId ? [name, filterData, tenantId, userEmail, modelId] : [name, filterData, tenantId, userEmail]
      };
      
      const result = await connection.query(query);
      
      return {
        status: 'success',
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error saving user filter:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Error saving filter');
    }
  }

  /**
   * Get user filters
   */
  static async getUserFilters(tenantId: string, userEmail: string, modelId?: string): Promise<any> {
    try {
      const query = {
        text: `SELECT * FROM dev.user_filters 
               WHERE tenant_id = $1 
               AND user_email = $2
               ${modelId ? 'AND model_id = $3' : ''}
               AND is_deleted IS NULL 
               ORDER BY created_at DESC`,
        values: modelId ? [tenantId, userEmail, modelId] : [tenantId, userEmail]
      };
      
      const result = await connection.query(query);
      
      return {
        status: 'success',
        data: result.rows
      };
    } catch (error) {
      console.error('Error fetching user filters:', error);
      throw ApiError.internal('Error fetching filters');
    }
  }

  /**
   * Delete user filter
   */
  static async deleteUserFilter(filterId: string, userEmail: string): Promise<any> {
    try {
      const query = {
        text: `UPDATE dev.user_filters 
               SET is_deleted = CURRENT_TIMESTAMP 
               WHERE id = $1 
               AND user_email = $2
               AND is_deleted IS NULL
               RETURNING *`,
        values: [filterId, userEmail]
      };
      
      const result = await connection.query(query);
      
      if (result.rows.length === 0) {
        throw ApiError.notFound('Filter not found or you do not have permission to delete it');
      }
      
      return {
        status: 'success',
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error deleting user filter:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Error deleting filter');
    }
  }

  // Helper methods
  private static isValidSelectQuery(query: string): boolean {
    return isValidSelectQuery(query);
  }

  private static generateSQLQueryForSegment(payload: any, tableSlug: string, organisation: string): [string, string] {
    let conditions: string[] = [];

    // Handle inclusion criteria
    if (payload.inclusion) {
      conditions = conditions.concat(this.generateCriteria(payload.inclusion, true));
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Construct the final SQL query
    const sqlQuery = `SELECT * FROM ${organisation}.${tableSlug} ${whereClause};`;
    const countSQLQuery = `SELECT COUNT(*) FROM ${organisation}.${tableSlug} ${whereClause};`;
    
    return [sqlQuery, countSQLQuery];
  }

  private static generateCriteria(criteria: any, isInclusion: boolean): string[] {
    const conditions: string[] = [];
    const operator = isInclusion ? 'IN' : 'NOT IN';

    const columnMapping: Record<string, string> = {
      industry_categories: 'account_industry',
      subindustries: 'account_subindustry',
      countries: 'account_country',
      job_type: 'job_title',
      employee_range: 'account_size',
      revenue_range: 'account_revenue',
      technologies: 'technographic'
    };

    for (const [key, value] of Object.entries(criteria)) {
      // ignore job_type key
      if (key === 'job_type' || key === 'signals') {
        continue;
      }
    
      if (Array.isArray(value) && value.length > 0) {
        const dbColumn = columnMapping[key] || key;
        
        if (key === 'technologies') {
          // Handle technologies field differently
          const techConditions = (value as string[]).map(tech => 
            `${dbColumn}::jsonb->'technographic' @> '["${tech}"]'::jsonb`
          );
          const techClause = isInclusion
            ? techConditions.join(' OR ')
            : `NOT (${techConditions.join(' OR ')})`;
          conditions.push(`(${techClause})`);
        } else if (key === "industry_categories" && value[0] === "All Industries selected") {
          continue;
        } else {
          const formattedValues = (value as string[]).map(v => `'${v}'`).join(', ');
          conditions.push(`${dbColumn} ${operator} (${formattedValues})`);
        }
      }
    }

    return conditions;
  }
}
