import { audienceStorage } from '../storage/audienceStorage';
import AudienceBigQueryAdapter from './AudienceBigQueryAdapter';
import type { 
  Audience, 
  NewAudience, 
  Cohort, 
  NewCohort, 
  CohortFilters,
  Object,
  Relationship
} from '../db/schema/audiences';

export class AudienceService {
  private bigQueryAdapter: AudienceBigQueryAdapter;

  constructor() {
    this.bigQueryAdapter = new AudienceBigQueryAdapter();
  }

  /**
   * Set the BigQuery connection ID to use for audience queries
   */
  setBigQueryConnectionId(connectionId: string): void {
    this.bigQueryAdapter.setDefaultConnectionId(connectionId);
  }

  // Audience operations
  async createAudience(data: {
    name: string;
    description?: string;
    tenantId: string;
    createdBy: string;
    objects: { objectId: number; alias: string }[];
  }): Promise<{
    audience: Audience;
    objects: any[];
  }> {
    // Create the audience
    const audienceData: NewAudience = {
      name: data.name,
      description: data.description,
      tenantId: data.tenantId,
      createdBy: data.createdBy,
    };

    const audience = await audienceStorage.createAudience(audienceData);

    // Add objects to the audience
    const audienceObjects = await audienceStorage.addObjectsToAudience(
      audience.id,
      data.objects
    );

    return {
      audience,
      objects: audienceObjects,
    };
  }

  async getAudienceById(id: string): Promise<Audience | null> {
    return await audienceStorage.findAudienceById(id);
  }

  async getAudiencesByTenant(tenantId: string): Promise<Audience[]> {
    return await audienceStorage.findAudiencesByTenant(tenantId);
  }

  async getAudienceWithDetails(id: string) {
    return await audienceStorage.getAudienceWithDetails(id);
  }

  async updateAudience(id: string, updates: Partial<NewAudience>): Promise<Audience | null> {
    return await audienceStorage.updateAudience(id, updates);
  }

  async deleteAudience(id: string): Promise<boolean> {
    return await audienceStorage.deleteAudience(id);
  }

  // Cohort operations
  async createCohort(data: {
    name: string;
    description?: string;
    audienceId: string;
    tenantId: string;
    createdBy: string;
    companyFilters: any[];
    contactFilters: any[];
  }): Promise<Cohort> {
    // Prepare filters in the expected format
    const filters: CohortFilters = {
      companyFilters: data.companyFilters,
      contactFilters: data.contactFilters,
    };

    // Create cohort with initial status
    const cohortData: NewCohort = {
      audienceId: data.audienceId,
      name: data.name,
      description: data.description,
      tenantId: data.tenantId,
      createdBy: data.createdBy,
      filters,
      status: 'processing',
    };

    const cohort = await audienceStorage.createCohort(cohortData);

    // Process cohort counts in background (in a real app, this would be a background job)
    this.processCohortCounts(cohort.id, filters).catch(error => {
      console.error('Error processing cohort counts:', error);
      audienceStorage.updateCohortStatus(cohort.id, 'error', error.message);
    });

    return cohort;
  }

  async getCohortById(id: string): Promise<Cohort | null> {
    return await audienceStorage.findCohortById(id);
  }

  async getCohortsByAudience(audienceId: string): Promise<Cohort[]> {
    return await audienceStorage.findCohortsByAudience(audienceId);
  }

  async getCohortsByTenant(tenantId: string): Promise<Cohort[]> {
    return await audienceStorage.findCohortsByTenant(tenantId);
  }

  async getCohortWithAudience(cohortId: string) {
    return await audienceStorage.getCohortWithAudience(cohortId);
  }

  async updateCohort(id: string, updates: Partial<NewCohort>): Promise<Cohort | null> {
    return await audienceStorage.updateCohort(id, updates);
  }

  async deleteCohort(id: string): Promise<boolean> {
    return await audienceStorage.deleteCohort(id);
  }

  // Cohort data operations
  async previewCohortData(cohortId: string, limit: number = 100): Promise<any[]> {
    const cohort = await audienceStorage.findCohortById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    const filters = cohort.filters as CohortFilters;
    return await this.bigQueryAdapter.executeCohortQuery(filters, limit);
  }

  async getCohortCounts(cohortId: string): Promise<{ companyCount: number; peopleCount: number }> {
    const cohort = await audienceStorage.findCohortById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Return cached counts if available and recent
    if (cohort.companyCount !== null && cohort.peopleCount !== null && cohort.lastProcessedAt) {
      const hoursSinceLastProcessed = (Date.now() - cohort.lastProcessedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastProcessed < 24) { // Cache for 24 hours
        return {
          companyCount: cohort.companyCount,
          peopleCount: cohort.peopleCount,
        };
      }
    }

    // Fetch fresh counts from BigQuery
    const filters = cohort.filters as CohortFilters;
    const counts = await this.bigQueryAdapter.getCohortCounts(filters);

    // Update cached counts
    await audienceStorage.updateCohortCounts(cohortId, counts.companyCount, counts.peopleCount);

    return counts;
  }

  async downloadCohortData(cohortId: string): Promise<any[]> {
    const cohort = await audienceStorage.findCohortById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    const filters = cohort.filters as CohortFilters;
    return await this.bigQueryAdapter.executeCohortQuery(filters); // No limit for download
  }

  // Objects and relationships
  async getAllObjects(): Promise<Object[]> {
    return await audienceStorage.getAllObjects();
  }

  async getAllRelationships(): Promise<Relationship[]> {
    return await audienceStorage.getAllRelationships();
  }

  async getObjectFields(objectId: number): Promise<any[]> {
    return await audienceStorage.getObjectFields(objectId);
  }

  async getObjectDisplayFields(objectId: number): Promise<any[]> {
    return await audienceStorage.getObjectDisplayFields(objectId);
  }

  async getFieldDistinctValues(objectId: number, fieldName: string, limit: number = 100): Promise<string[]> {
    const object = await audienceStorage.findObjectById(objectId);
    if (!object) {
      throw new Error('Object not found');
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
      FROM \`{project}.{dataset}.${object.bigqueryTable}\`
      WHERE ${fieldName} IS NOT NULL
      ORDER BY ${fieldName}
      LIMIT ${Math.min(limit, field.distinctValuesLimit || 100)}
    `;

    try {
      // For now, return empty array since we need a BigQuery connection
      // In a real implementation, this would use the BigQuery service directly
      console.warn('Distinct values fetching requires BigQuery connection setup');
      return [];
    } catch (error) {
      console.error('Error fetching distinct values:', error);
      return [];
    }
  }

  // Private helper methods
  private async processCohortCounts(cohortId: string, filters: CohortFilters): Promise<void> {
    try {
      const counts = await this.bigQueryAdapter.getCohortCounts(filters);
      await audienceStorage.updateCohortCounts(cohortId, counts.companyCount, counts.peopleCount);
    } catch (error) {
      console.error('Error processing cohort counts:', error);
      await audienceStorage.updateCohortStatus(
        cohortId, 
        'error', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  // Utility methods
  async testBigQueryConnection(): Promise<boolean> {
    return await this.bigQueryAdapter.testConnection();
  }

  async generateCohortSQL(cohortId: string): Promise<string> {
    const cohort = await audienceStorage.findCohortById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    const filters = cohort.filters as CohortFilters;
    return this.bigQueryAdapter.generateCohortSQL(filters);
  }

  // Health check
  async healthCheck(): Promise<{ storage: boolean; bigquery: boolean }> {
    const [storageHealth, bigqueryHealth] = await Promise.all([
      audienceStorage.healthCheck(),
      this.bigQueryAdapter.testConnection(),
    ]);

    return {
      storage: storageHealth,
      bigquery: bigqueryHealth,
    };
  }
}

export default AudienceService;
