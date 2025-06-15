import connection from '../config/database';
import ApiError from '../utils/ApiError';

/**
 * Enrich Template Service
 * Handles enrich template operations - exact copy from original backend
 */
export class EnrichTemplateService {
  /**
   * Save enrich template (exact copy of saveEnrichTemplate from setting_controller.js)
   */
  static async saveEnrichTemplate(payload: any): Promise<any> {
    const { entity, selectedoGraph, selectedEnrichDestination, step, id, name, owner, integration, tenant_id } = payload;

    try {
      const query = `
        INSERT INTO dev.enrich_templates 
        (name, owner, integration, entity_type, destination, mapped_fields, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE
        SET name = $1, owner = $2, integration = $3, entity_type = $4, destination = $5, 
            mapped_fields = $6, tenant_id = $7
        RETURNING *;
      `;
      
      const values = [
        name || null,
        owner || null,
        integration || null,
        entity || null,
        selectedEnrichDestination || null,
        selectedoGraph || null,
        tenant_id || null
      ];

      const result = await connection.query(query, values);

      if (result.rows.length > 0) {
        return {
          status: "success",
          message: step ? "Enrich template draft saved successfully" : "Enrich template saved successfully",
          data: result.rows[0]
        };
      } else {
        throw ApiError.badRequest("Failed to save enrich template");
      }
    } catch (error) {
      console.error("Error saving enrich template:", error);
      throw ApiError.internal("Internal server error");
    }
  }

  /**
   * Get enrich template data (exact copy of getEnrichTemplateData from setting_controller.js)
   */
  static async getEnrichTemplateData(tenant_id: string): Promise<any> {
    try {
      const query = `
        SELECT id, name, owner, created_at, integration, destination, mapped_fields FROM dev.enrich_templates
        WHERE tenant_id = $1
      `;
      const values = [tenant_id];

      const result = await connection.query(query, values);

      if (result.rows.length > 0) {
        return {
          status: "success",
          message: "Enrich Templates Fetched Successfully",
          data: result.rows
        };
      } else {
        throw ApiError.badRequest("Failed to fetch enrich templates");
      }
    } catch (error) {
      console.error("Error saving enrich template:", error);
      throw ApiError.internal("Internal server error");
    }
  }

  /**
   * Edit enrich template data (exact copy of editEnrichTemplate from setting_controller.js)
   */
  static async editEnrichTemplateData(id: string, name: string, owner: string, tenant_id: string, mapped_fields: any): Promise<any> {
    try {
      const query = `
        UPDATE dev.enrich_templates
        SET mapped_fields = $1,
            name = $2,
            owner = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING *
      `;

      const values = [
        mapped_fields || null,
        name || null,
        owner || null,
        id,
        tenant_id || null
      ];

      const result = await connection.query(query, values);

      if (result.rows.length > 0) {
        return {
          status: "success",
          message: "Enrich template updated successfully",
          data: result.rows[0]
        };
      } else {
        throw ApiError.badRequest("Failed to update enrich template");
      }
    } catch (error) {
      console.error("Error updating enrich template:", error);
      throw ApiError.internal("Internal server error");
    }
  }

  /**
   * Delete template (exact copy of deleteTemplate from enrichTemplate_controller.js)
   */
  static async deleteTemplate(recordID: string): Promise<any> {
    try {
      // Using the table config pattern from original backend
      const query = `DELETE FROM dev.enrich_templates WHERE id = $1`;
      const result = await connection.query(query, [recordID]);
      return result.rows;
    } catch (error) {
      console.error("Error deleting template:", error);
      throw ApiError.internal("Error deleting data");
    }
  }
}
