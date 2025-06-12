import axios from 'axios';
import connection from '../config/database';
import { 
  fleadsTable, 
  reportsTable, 
  chatV4Table 
} from '../config/tableConfig';
import ApiError from '../utils/ApiError';

/**
 * Insights Service
 * Handles insights and analytics operations
 */
export class InsightsService {
  /**
   * Get picklist values for insights
   */
  static async getPicklistValues(email: string, organizationDomain: string, object: string): Promise<any> {
    try {
      // Override email for specific domains
      if (['reltio.com', 'zillasecurity.com', 'icustomer.ai', 'b2c.com'].includes(organizationDomain)) {
        email = 'ravi@icustomer.ai';
      }

      const config = {
        method: 'POST',
        url: 'https://puthukmcheiyc3fo5d7ajjf7be0irmok.lambda-url.us-east-1.on.aws/salesforce-object-column-label',
        params: {
          email,
          object,
        },
        headers: {
          accept: 'application/json',
          token: 'Vr7pXhLbR6wA3yZuQ2eF',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      };

      const response = await axios.request(config);
      
      return {
        status: 'success',
        responseData: response.data
      };
    } catch (error) {
      console.error('Error getting picklist values:', error);
      throw ApiError.internal('Server down, please try after sometime');
    }
  }

  /**
   * Get columns for insights
   */
  static async getColumns(schemaName: string, tableName?: string): Promise<any> {
    try {
      const data = {
        schema_name: schemaName,
        table_name: tableName || ""
      };

      const config = {
        method: 'POST',
        url: 'http://3.236.218.40:8012/object-columns',
        data: data,
        headers: {
          'accept': 'application/json',
          'token': 'Vr7pXhLbR6wA3yZuQ2eF',
          'Content-Type': 'application/json'
        },
      };

      const response = await axios.request(config);
      
      return {
        status: 'success',
        data: response.data
      };
    } catch (error) {
      console.error('Error getting columns:', error);
      throw ApiError.internal('Server down, please try after sometime');
    }
  }

  /**
   * Get live table data
   */
  static async getLiveTable(organisationId: string, agentId: string): Promise<any> {
    try {
      const query = `
        SELECT * FROM ${fleadsTable.schemaTableName} 
        WHERE tenantid = $1 
          AND agent_id = $2;
      `;
      const values = [organisationId, agentId];

      const result = await connection.query(query, values);

      if (result.rows.length > 0) {
        // Map rows to key-value pairs format
        const data = result.rows.map(row => {
          const rowData: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            rowData[key] = row[key];
          });
          return rowData;
        });

        return {
          status: 'success',
          data: data
        };
      } else {
        return {
          status: 'success',
          data: []
        };
      }
    } catch (error) {
      console.error('Error getting live table:', error);
      throw ApiError.internal('Error displaying table');
    }
  }

  /**
   * Display table with advanced filtering
   */
  static async displayTable(
    tableName: string, 
    columns: string[] = ['*'], 
    conditions: any[] = [], 
    orderBy?: any, 
    limit?: number
  ): Promise<any> {
    try {
      // Input validation
      if (!tableName || typeof tableName !== 'string') {
        throw ApiError.badRequest('Invalid table name');
      }

      // Validate table name against allowed tables to prevent injection
      const allowedTables = ['insighttables.new_table_', 'dev.smart_filters'];
      const isValidTable = allowedTables.some(prefix => tableName.startsWith(prefix));
      if (!isValidTable) {
        console.error(`Invalid table name: ${tableName}`);
        throw ApiError.forbidden('Access to this table is not allowed');
      }

      // Validate columns
      const validColumns = Array.isArray(columns) && columns.every(col => 
        typeof col === 'string' && /^[a-zA-Z0-9_]+$/.test(col)
      );
      if (!validColumns && columns.length > 0 && columns[0] !== '*') {
        throw ApiError.badRequest('Invalid column names');
      }

      // Build parameterized query
      let queryParams: any[] = [];
      let queryStr = `SELECT ${columns.join(', ')} FROM ${tableName}`;

      // Add WHERE conditions if any
      if (conditions.length > 0) {
        const validConditions = conditions.every(cond => 
          typeof cond.column === 'string' && 
          /^[a-zA-Z0-9_]+$/.test(cond.column) &&
          ['=', '>', '<', '>=', '<=', 'LIKE', 'IN'].includes(cond.operator)
        );

        if (!validConditions) {
          throw ApiError.badRequest('Invalid conditions');
        }

        const whereConditions = conditions.map((cond, index) => {
          queryParams.push(cond.value);
          return `${cond.column} ${cond.operator} $${index + 1}`;
        });

        queryStr += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      // Add ORDER BY if specified
      if (orderBy) {
        if (typeof orderBy.column === 'string' && /^[a-zA-Z0-9_]+$/.test(orderBy.column)) {
          const direction = orderBy.direction === 'DESC' ? 'DESC' : 'ASC';
          queryStr += ` ORDER BY ${orderBy.column} ${direction}`;
        }
      }

      // Add LIMIT if specified
      if (limit && Number.isInteger(limit) && limit > 0) {
        queryStr += ` LIMIT $${queryParams.length + 1}`;
        queryParams.push(limit);
      }

      // Execute parameterized query
      const result = await connection.query(queryStr, queryParams);

      if (result.rows.length > 0) {
        const data = result.rows.map(row => {
          const rowData: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            rowData[key] = row[key];
          });
          return rowData;
        });
        
        return {
          status: 'success',
          data: data
        };
      } else {
        return {
          status: 'success',
          data: []
        };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error displaying table:', error);
      throw ApiError.internal('Error displaying table');
    }
  }
}
