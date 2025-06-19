import BigQueryService from "./BigQueryService";
import { CohortFilters, CohortFilter } from "../db/schema/audiences";

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
   * Generate SQL query for cohort based on filters and audience configuration
   */
  generateCohortSQL(
    filters: CohortFilters,
    audienceConfig: {
      objects: Array<{
        object: { bigqueryTable: string; fields: any[] };
        alias: string;
      }>;
      relationships: Array<{
        joinCondition: string;
      }>;
    },
    limit?: number
  ): string {
    const { companyFilters, contactFilters } = filters;
    const { objects, relationships } = audienceConfig;

    // Build SELECT clause with fields from all objects
    const selectFields: string[] = [];
    const fromClauses: string[] = [];
    const joinClauses: string[] = [];

    // Process each object in the audience
    objects.forEach((obj, index) => {
      const { object, alias } = obj;
      const displayFields = object.fields.filter((f: any) => f.isDisplayable);

      // Add fields to SELECT
      displayFields.forEach((field: any) => {
        selectFields.push(`${alias}.${field.name} as ${alias}_${field.name}`);
      });

      // Add to FROM or JOIN
      if (index === 0) {
        fromClauses.push(`\`{project}.${object.bigqueryTable}\` ${alias}`);
      } else {
        // Find relationship for this join
        const relationship = relationships.find((r) =>
          r.joinCondition.includes(alias)
        );
        if (relationship) {
          joinClauses.push(
            `JOIN \`{project}.${object.bigqueryTable}\` ${alias} ON ${relationship.joinCondition}`
          );
        }
      }
    });

    // Build the SQL query
    let sql = `
      SELECT DISTINCT
        ${selectFields.join(",\n        ")}
      FROM ${fromClauses.join(", ")}
    `;

    // Add JOIN clauses
    if (joinClauses.length > 0) {
      sql += `\n      ${joinClauses.join("\n      ")}`;
    }

    // Build WHERE clause
    const whereConditions: string[] = [];

    // Add company filters (assuming first object is company)
    if (companyFilters.length > 0 && objects.length > 0) {
      const companyAlias = objects[0].alias;
      const companyConditions = this.buildFilterConditions(
        companyFilters,
        companyAlias,
        objects[0].object.fields
      );
      if (companyConditions) {
        whereConditions.push(`(${companyConditions})`);
      }
    }

    // Add contact filters (assuming second object is contact)
    if (contactFilters.length > 0 && objects.length > 1) {
      const contactAlias = objects[1].alias;
      const contactConditions = this.buildFilterConditions(
        contactFilters,
        contactAlias,
        objects[1].object.fields
      );
      if (contactConditions) {
        whereConditions.push(`(${contactConditions})`);
      }
    }

    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      sql += `\n      WHERE ${whereConditions.join(" AND ")}`;
    }

    // Add limit if specified
    if (limit) {
      sql += `\n      LIMIT ${limit}`;
    }

    return sql;
  }

  /**
   * Execute cohort query and return results
   */
  async executeCohortQuery(
    filters: CohortFilters,
    audienceConfig: {
      objects: Array<{
        object: { bigqueryTable: string; fields: any[] };
        alias: string;
      }>;
      relationships: Array<{
        joinCondition: string;
      }>;
    },
    limit?: number,
    connectionId?: string
  ): Promise<any[]> {
    const sql = this.generateCohortSQL(filters, audienceConfig, limit);
    const connId = connectionId || this.defaultConnectionId;

    if (!connId) {
      throw new Error(
        "No BigQuery connection ID provided. Please set a default connection or pass one explicitly."
      );
    }

    try {
      return await this.bigQueryService.executeQuery(connId, sql);
    } catch (error) {
      console.error("BigQuery execution error:", error);
      throw new Error(
        `Failed to execute cohort query: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Fetch the distinct values of a given field
   */
  async getFieldDistinctValues(
    connectionId: string,
    object: any,
    fieldName: string
  ): Promise<any[]> {
    const connId = connectionId || this.defaultConnectionId;
    if (!connId) {
      throw new Error(
        "No BigQuery connection ID provided. Please set a default connection or pass one explicitly."
      );
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
       ${field.distinctValuesLimit ? "LIMIT " + field.distinctValuesLimit : ""}
     `;

    try {
      return await this.bigQueryService.executeQuery(connId, sql);
    } catch (error) {
      console.error("BigQuery execution error:", error);
      throw new Error(
        `Failed to execute cohort query: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get cohort counts with dynamic audience configuration
   */
  async getCohortCountsWithConfig(
    filters: CohortFilters,
    audienceConfig: {
      objects: Array<{
        object: { bigqueryTable: string; fields: any[] };
        alias: string;
      }>;
      relationships: Array<{
        joinCondition: string;
      }>;
    },
    connectionId?: string
  ): Promise<{ companyCount: number; peopleCount: number }> {
    const { companyFilters, contactFilters } = filters;
    const { objects, relationships } = audienceConfig;

    //FIXME: 	Consider updating your Object schema to include an explicit type (Company | Contact) to remove ambiguity in future.
    const companyObject = objects.find((o) =>
      o.object.fields.some((f) => f.name === "ic_acc_name")
    );
    const contactObject = objects.find((o) =>
      o.object.fields.some((f) => f.name === "ic_fname")
    );

    if (!companyObject || !contactObject) {
      throw new Error("Missing company or contact object configuration");
    }

    const companyAlias = companyObject.alias;
    const contactAlias = contactObject.alias;

    const companyTable = `\`${companyObject.object.bigqueryTable}\``;
    const contactTable = `\`${contactObject.object.bigqueryTable}\``;

    // 👇 Filtered company CTE
    const companyConditions = this.buildFilterConditions(
      companyFilters,
      companyAlias,
      companyObject.object.fields
    );
    const companyFilterClause = companyConditions
      ? `WHERE ${companyConditions}`
      : "";

    const qualifiedCompanyCTE = `
      qualified_companies AS (
        SELECT DISTINCT ${companyAlias}.SalesForceID
        FROM ${companyTable} ${companyAlias}
        ${companyFilterClause}
      )
    `;

    // Join contact table with filtered companies and apply contact filters
    // const relationship = relationships.find(
    //   (r) =>
    //     r.joinCondition.includes(companyAlias) &&
    //     r.joinCondition.includes(contactAlias)
    // );
    // const joinClause = relationship
    //   ? `INNER JOIN qualified_companies qc ON ${contactAlias}.SalesForceID = qc.SalesForceID`
    //   : `INNER JOIN qualified_companies qc ON ${contactAlias}.SalesForceID = ${companyAlias}.SalesForceID`;

    const joinClause = `INNER JOIN qualified_companies qc ON ${contactAlias}.SalesForceID = qc.SalesForceID`;

    const contactConditions = this.buildFilterConditions(
      contactFilters,
      contactAlias,
      contactObject.object.fields
    );
    const contactFilterClause = contactConditions
      ? `WHERE ${contactConditions}`
      : "";

    const sql = `
      WITH ${qualifiedCompanyCTE}
  
      -- Count companies
      SELECT 
        (SELECT COUNT(DISTINCT SalesForceID) FROM qualified_companies) AS company_count,
  
        -- Count contacts in those companies (with contact filters)
        (
          SELECT COUNT(DISTINCT ${contactAlias}.ic_cntid)
          FROM ${contactTable} ${contactAlias}
          ${joinClause}
          ${contactFilterClause}
        ) AS people_count
    `;

    const connId = connectionId || this.defaultConnectionId;

    if (!connId) {
      throw new Error(
        "No BigQuery connection ID provided. Please set a default connection or pass one explicitly."
      );
    }

    try {
      const rows = await this.bigQueryService.executeQuery(connId, sql);
      const result = rows[0] || { company_count: 0, people_count: 0 };

      return {
        companyCount: parseInt(result.company_count) || 0,
        peopleCount: parseInt(result.people_count) || 0,
      };
    } catch (error) {
      console.error("BigQuery count query error:", error);
      throw new Error(
        `Failed to get cohort counts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get cohort preview(limited to 25 for now need to implement pagination)
   */
  async getCohortPreviewWithConfig(
    filters: CohortFilters,
    audienceConfig: {
      objects: Array<{
        object: { bigqueryTable: string; fields: any[] };
        alias: string;
      }>;
      relationships: Array<{
        joinCondition: string;
      }>;
    },
    connectionId?: string
  ): Promise<{ companyPreview: any[]; contactPreview: any[] }> {
    const { companyFilters, contactFilters } = filters;
    const { objects } = audienceConfig;

    if (!connectionId) {
      throw new Error(
        "No BigQuery connection ID provided. Please set a default connection or pass one explicitly."
      );
    }

    const companyObject = objects.find((o) =>
      o.object.fields.some((f) => f.name === "ic_acc_name")
    );
    const contactObject = objects.find((o) =>
      o.object.fields.some((f) => f.name === "ic_fname")
    );

    if (!companyObject || !contactObject) {
      throw new Error("Missing company or contact object configuration");
    }

    const companyAlias = companyObject.alias;
    const contactAlias = contactObject.alias;
    const companyTable = `\`${companyObject.object.bigqueryTable}\``;
    const contactTable = `\`${contactObject.object.bigqueryTable}\``;

    const companyConditions = this.buildFilterConditions(
      companyFilters,
      companyAlias,
      companyObject.object.fields
    );
    const contactConditions = this.buildFilterConditions(
      contactFilters,
      contactAlias,
      contactObject.object.fields
    );

    const companyFilterClause = companyConditions
      ? `WHERE ${companyConditions}`
      : "";
    const contactFilterClause = contactConditions
      ? `WHERE ${contactConditions}`
      : "";

    const qualifiedCompanyCTE = `
    qualified_companies AS (
      SELECT DISTINCT
        ${companyAlias}.SalesForceID,
        ${companyAlias}.ic_accid,
        ${companyAlias}.ic_accuid,
        ${companyAlias}.ic_acc_name,
        ${companyAlias}.ic_acc_addr_street,
        ${companyAlias}.ic_acc_addr_city,
        ${companyAlias}.ic_acc_addr_state,
        ${companyAlias}.ic_acc_addr_zip,
        ${companyAlias}.ic_acc_country,
        ${companyAlias}.ic_acc_country_code,
        ${companyAlias}.ic_acc_continent,
        ${companyAlias}.ic_acc_continent_code,
        ${companyAlias}.ic_acc_url,
        ${companyAlias}.ic_acc_desc,
        ${companyAlias}.ic_acc_employees,
        ${companyAlias}.ic_acc_revenue,
        ${companyAlias}.ic_acc_size,
        ${companyAlias}.ic_acc_industry,
      FROM ${companyTable} ${companyAlias}
      ${companyFilterClause}
    )
  `;

    const companyPreviewSQL = `
    WITH ${qualifiedCompanyCTE}
    SELECT *
    FROM qualified_companies
    LIMIT 25;
  `;

    const contactPreviewSQL = `
    WITH ${qualifiedCompanyCTE}
    SELECT DISTINCT
      ${contactAlias}.ic_cntid,
      ${contactAlias}.sfContactId,
      ${contactAlias}.SalesForceID,
      ${contactAlias}.ic_cntuid,
      ${contactAlias}.ic_accuid,
      ${contactAlias}.ic_accid,
      ${contactAlias}.ic_sal,
      ${contactAlias}.ic_fname,
      ${contactAlias}.ic_lname,
      ${contactAlias}.ic_jtitle,
      ${contactAlias}.ic_jlvl,
      ${contactAlias}.ic_jfunc,
      ${contactAlias}.ic_email,
      ${contactAlias}.ic_li,
      ${contactAlias}.ic_head,
    FROM ${contactTable} ${contactAlias}
    INNER JOIN qualified_companies qc ON ${contactAlias}.SalesForceID = qc.SalesForceID
    ${contactFilterClause}
    LIMIT 25;
  `;

    const [companyPreview, contactPreview] = await Promise.all([
      this.bigQueryService.executeQuery(connectionId, companyPreviewSQL),
      this.bigQueryService.executeQuery(connectionId, contactPreviewSQL),
    ]);

    return { companyPreview, contactPreview };
  }

  /**
   * Fetch the table data
   */
  async getObjectData(connectionId: string, object: any, limit: number) {
    const { bigqueryTable, fields } = object;
    const allFields = fields.map((field: any) => field.name).join(",");
    const SQL = `
      SELECT 
        ${allFields}
      FROM \`{project}.${bigqueryTable}\`
      LIMIT ${limit}
    `;
    const rows = await this.bigQueryService.executeQuery(connectionId, SQL);
    console.log({ rows });

    return rows;
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
      console.error("BigQuery connection test failed:", error);
      return false;
    }
  }

  /**
   * Build filter conditions for a specific object (company or contact)
   */
  private buildFilterConditions(
    filters: CohortFilter[],
    tableAlias: string,
    fields?: any[]
  ): string {
    if (filters.length === 0) return "";

    const conditions: string[] = [];
    let currentGroup: string[] = [];
    let currentLogicalOp: string | undefined;

    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      const condition = this.buildSingleFilterCondition(
        filter,
        tableAlias,
        fields
      );

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
            const groupCondition = currentGroup.join(
              ` ${currentLogicalOp || "AND"} `
            );
            conditions.push(
              currentGroup.length > 1 ? `(${groupCondition})` : groupCondition
            );
          }
          currentGroup = [condition];
          currentLogicalOp = filter.logicalOperator;
        }
      }
    }

    // Add the last group
    if (currentGroup.length > 0) {
      const groupCondition = currentGroup.join(
        ` ${currentLogicalOp || "AND"} `
      );
      conditions.push(
        currentGroup.length > 1 ? `(${groupCondition})` : groupCondition
      );
    }

    return conditions.join(" AND ");
  }

  /**
   * Build a single filter condition
   */
  private buildSingleFilterCondition(
    filter: CohortFilter,
    tableAlias: string,
    fields?: any[]
  ): string {
    // Use field mapping from fields array if available, otherwise use default mapping
    let actualFieldName = filter.field;
    if (fields && fields.length > 0) {
      const fieldConfig = fields.find((f: any) => f.name === filter.field);
      if (fieldConfig) {
        actualFieldName = fieldConfig.name;
      }
    } else {
      actualFieldName = this.mapFilterFieldToBigQueryField(filter.field);
    }

    const fieldName = `${tableAlias}.${actualFieldName}`;
    const { operator, value } = filter;

    switch (operator) {
      case "equals":
        return `${fieldName} = ${this.formatValue(value)}`;
      case "not_equals":
        return `${fieldName} != ${this.formatValue(value)}`;
      case "greater_than":
        return `${fieldName} > ${this.formatValue(value)}`;
      case "less_than":
        return `${fieldName} < ${this.formatValue(value)}`;
      case "contains":
        return `${fieldName} LIKE ${this.formatValue(`%${value}%`)}`;
      case "not_contains":
        return `${fieldName} NOT LIKE ${this.formatValue(`%${value}%`)}`;
      case "in":
        if (Array.isArray(value)) {
          const formattedValues = value
            .map((v) => this.formatValue(v))
            .join(", ");
          return `${fieldName} IN (${formattedValues})`;
        }
        return `${fieldName} = ${this.formatValue(value)}`;
      case "not_in":
        if (Array.isArray(value)) {
          const formattedValues = value
            .map((v) => this.formatValue(v))
            .join(", ");
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
      Account_size: "employee_count",
      Account_country: "country",
      Account_industry: "industry",
      company_name: "company_name",
      opportunity_stage: "opportunity_stage",
      page_views: "page_views",
      referrer_domain: "referrer_domain",
      utm_params: "utm_params",
      Linkedin_Followers: "linkedin_followers",
      Intent_Score: "intent_score",

      // Contact fields
      job_title: "job_title",
      seniority_level: "seniority_level",
      first_name: "first_name",
      last_name: "last_name",
      email: "email",
      email_opens: "email_opens",
      email_clicks: "email_clicks",
      website_visits: "website_visits",
      content_downloads: "content_downloads",
      social_engagement: "social_engagement",
    };

    return fieldMapping[field] || field;
  }

  /**
   * Format value for SQL query
   */
  private formatValue(value: string | number | string[]): string {
    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
    }
    if (typeof value === "number") {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.formatValue(v)).join(", ");
    }
    return `'${String(value)}'`;
  }
}

export default AudienceBigQueryAdapter;
