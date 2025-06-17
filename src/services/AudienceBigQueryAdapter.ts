import BigQueryService from './BigQueryService';
import { CohortFilters, CohortFilter } from '../db/schema/audiences';

/**
 * Adapter service that extends the existing BigQueryService with audience-specific functionality
 * 
 * Note: "Objects" in the audience system represent actual BigQuery tables/datasets.
 * When users create audiences, they're selecting which BigQuery tables to join and query.
 * Cohorts then apply filters to generate SQL queries against these BigQuery tables.
 */
export class AudienceBigQueryAdapter {
  private bigQueryService: typeof BigQueryService;
  private defaultConnectionId: string | null = null;

  constructor() {
    this.bigQueryService = BigQueryService;
  }

  /**
   * Set the default BigQuery connection ID to use for audience queries
   */
  setDefaultConnectionId(connectionId: string): void {
    this.defaultConnectionId = connectionId;
  }

  /**
   * Generate SQL query for cohort based on filters
   */
  generateCohortSQL(filters: CohortFilters, limit?: number): string {
    const { companyFilters, contactFilters } = filters;
    
    // Base query with join - using placeholder project and dataset
    let sql = `
      SELECT 
        c.id as contact_id,
        c.first_name,
        c.last_name,
        c.email,
        c.job_title,
        c.account_id,
        a.id as account_id,
        a.company_name,
        a.industry,
        a.country,
        a.employee_count
      FROM \`{project}.{dataset}.unified_contacts\` c
      JOIN \`{project}.{dataset}.unified_accounts\` a 
        ON c.account_id = a.id
    `;

    // Build WHERE clause
    const whereConditions: string[] = [];

    // Add company filters
    if (companyFilters.length > 0) {
      const companyConditions = this.buildFilterConditions(companyFilters, 'a');
      if (companyConditions) {
        whereConditions.push(`(${companyConditions})`);
      }
    }

    // Add contact filters
    if (contactFilters.length > 0) {
      const contactConditions = this.buildFilterConditions(contactFilters, 'c');
      if (contactConditions) {
        whereConditions.push(`(${contactConditions})`);
      }
    }

    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add limit if specified
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    return sql;
  }

  /**
   * Execute cohort query and return results
   */
  async executeCohortQuery(filters: CohortFilters, limit?: number, connectionId?: string): Promise<any[]> {
    const sql = this.generateCohortSQL(filters, limit);
    const connId = connectionId || this.defaultConnectionId;
    
    if (!connId) {
      throw new Error('No BigQuery connection ID provided. Please set a default connection or pass one explicitly.');
    }

    try {
      return await this.bigQueryService.executeQuery(connId, sql);
    } catch (error) {
      console.error('BigQuery execution error:', error);
      throw new Error(`Failed to execute cohort query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch the distinct values of a given field
   */
  async getFieldDistinctValues(connectionId: string, object: any, fieldName: string): Promise<any[]> {
    const connId = connectionId || this.defaultConnectionId;
    if (!connId) {
      throw new Error('No BigQuery connection ID provided. Please set a default connection or pass one explicitly.');
    }
     // Get field configuration
     const fields = Array.isArray(object.fields) ? object.fields : [];
     const field = fields.find((f: any) => f.name === fieldName);
     
     if (!field || !field.hasDistinctValues) {
       return [];
     }
 
     // Use BigQuery to get distinct values
     const sql = `
       SELECT DISTINCT ${fieldName} as value
       FROM \`{project}.${object.bigqueryTable}\`
       WHERE ${fieldName} IS NOT NULL
       ORDER BY ${fieldName}
       ${field.distinctValuesLimit ? 'LIMIT ' + field.distinctValuesLimit : ''}
     `;
     
    try {
      return await this.bigQueryService.executeQuery(connId, sql);
    } catch (error) {
      console.error('BigQuery execution error:', error);
      throw new Error(`Failed to execute cohort query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cohort counts (companies and contacts)
   */
  async getCohortCounts(filters: CohortFilters, connectionId?: string): Promise<{ companyCount: number; peopleCount: number }> {
    const countSQL = `
      SELECT 
        COUNT(DISTINCT a.id) as company_count,
        COUNT(DISTINCT c.id) as people_count
      FROM \`{project}.{dataset}.unified_contacts\` c
      JOIN \`{project}.{dataset}.unified_accounts\` a 
        ON c.account_id = a.id
    `;

    const { companyFilters, contactFilters } = filters;
    const whereConditions: string[] = [];

    if (companyFilters.length > 0) {
      const companyConditions = this.buildFilterConditions(companyFilters, 'a');
      if (companyConditions) {
        whereConditions.push(`(${companyConditions})`);
      }
    }

    if (contactFilters.length > 0) {
      const contactConditions = this.buildFilterConditions(contactFilters, 'c');
      if (contactConditions) {
        whereConditions.push(`(${contactConditions})`);
      }
    }

    let finalSQL = countSQL;
    if (whereConditions.length > 0) {
      finalSQL += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const connId = connectionId || this.defaultConnectionId;
    
    if (!connId) {
      throw new Error('No BigQuery connection ID provided. Please set a default connection or pass one explicitly.');
    }

    try {
      const rows = await this.bigQueryService.executeQuery(connId, finalSQL);
      const result = rows[0] || { company_count: 0, people_count: 0 };
      
      return {
        companyCount: parseInt(result.company_count) || 0,
        peopleCount: parseInt(result.people_count) || 0,
      };
    } catch (error) {
      console.error('BigQuery count query error:', error);
      throw new Error(`Failed to get cohort counts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch the table data
   */
  async getObjectData(connectionId:string, object:any, limit:number) {
    const {bigqueryTable, fields} = object
    const allFields = fields.map((field:any) => field.name).join(',')
    const SQL = `
      SELECT 
        ${allFields}
      FROM \`{project}.${bigqueryTable}\`
      LIMIT ${limit}
    `;
    const rows = await this.bigQueryService.executeQuery(connectionId, SQL)
    console.log({rows})

    return rows

  }

  /**
   * Test BigQuery connection
   */
  async testConnection(connectionId?: string): Promise<boolean> {
    const connId = connectionId || this.defaultConnectionId;
    
    if (!connId) {
      return false;
    }

    try {
      return await this.bigQueryService.validateConnection(connId);
    } catch (error) {
      console.error('BigQuery connection test failed:', error);
      return false;
    }
  }

  /**
   * Build filter conditions for a specific object (company or contact)
   */
  private buildFilterConditions(filters: CohortFilter[], tableAlias: string): string {
    if (filters.length === 0) return '';

    const conditions: string[] = [];
    let currentGroup: string[] = [];
    let currentLogicalOp: string | undefined;

    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      const condition = this.buildSingleFilterCondition(filter, tableAlias);
      
      if (i === 0) {
        // First filter
        currentGroup.push(condition);
        currentLogicalOp = filter.logicalOperator;
      } else {
        if (filter.logicalOperator === currentLogicalOp) {
          // Same logical operator, add to current group
          currentGroup.push(condition);
        } else {
          // Different logical operator, close current group and start new one
          if (currentGroup.length > 0) {
            const groupCondition = currentGroup.join(` ${currentLogicalOp || 'AND'} `);
            conditions.push(currentGroup.length > 1 ? `(${groupCondition})` : groupCondition);
          }
          currentGroup = [condition];
          currentLogicalOp = filter.logicalOperator;
        }
      }
    }

    // Add the last group
    if (currentGroup.length > 0) {
      const groupCondition = currentGroup.join(` ${currentLogicalOp || 'AND'} `);
      conditions.push(currentGroup.length > 1 ? `(${groupCondition})` : groupCondition);
    }

    return conditions.join(' AND ');
  }

  /**
   * Build a single filter condition
   */
  private buildSingleFilterCondition(filter: CohortFilter, tableAlias: string): string {
    const fieldName = `${tableAlias}.${this.mapFilterFieldToBigQueryField(filter.field)}`;
    const { operator, value } = filter;

    switch (operator) {
      case 'equals':
        return `${fieldName} = ${this.formatValue(value)}`;
      case 'not_equals':
        return `${fieldName} != ${this.formatValue(value)}`;
      case 'greater_than':
        return `${fieldName} > ${this.formatValue(value)}`;
      case 'less_than':
        return `${fieldName} < ${this.formatValue(value)}`;
      case 'contains':
        return `${fieldName} LIKE ${this.formatValue(`%${value}%`)}`;
      case 'not_contains':
        return `${fieldName} NOT LIKE ${this.formatValue(`%${value}%`)}`;
      case 'in':
        if (Array.isArray(value)) {
          const formattedValues = value.map(v => this.formatValue(v)).join(', ');
          return `${fieldName} IN (${formattedValues})`;
        }
        return `${fieldName} = ${this.formatValue(value)}`;
      case 'not_in':
        if (Array.isArray(value)) {
          const formattedValues = value.map(v => this.formatValue(v)).join(', ');
          return `${fieldName} NOT IN (${formattedValues})`;
        }
        return `${fieldName} != ${this.formatValue(value)}`;
      default:
        return `${fieldName} = ${this.formatValue(value)}`;
    }
  }

  /**
   * Map UI filter fields to actual BigQuery column names
   */
  private mapFilterFieldToBigQueryField(field: string): string {
    const fieldMapping: Record<string, string> = {
      // Company fields
      'Account_size': 'employee_count',
      'Account_country': 'country',
      'Account_industry': 'industry',
      'company_name': 'company_name',
      'opportunity_stage': 'opportunity_stage',
      'page_views': 'page_views',
      'referrer_domain': 'referrer_domain',
      'utm_params': 'utm_params',
      'Linkedin_Followers': 'linkedin_followers',
      'Intent_Score': 'intent_score',

      // Contact fields
      'job_title': 'job_title',
      'seniority_level': 'seniority_level',
      'first_name': 'first_name',
      'last_name': 'last_name',
      'email': 'email',
      'email_opens': 'email_opens',
      'email_clicks': 'email_clicks',
      'website_visits': 'website_visits',
      'content_downloads': 'content_downloads',
      'social_engagement': 'social_engagement',
    };

    return fieldMapping[field] || field;
  }

  /**
   * Format value for SQL query
   */
  private formatValue(value: string | number | string[]): string {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.map(v => this.formatValue(v)).join(', ');
    }
    return `'${String(value)}'`;
  }
}

export default AudienceBigQueryAdapter;
