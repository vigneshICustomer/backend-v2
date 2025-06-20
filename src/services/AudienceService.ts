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


  // Objects and relationships
  async getAllObjects(organisationId?: string): Promise<Object[]> {
    return await audienceStorage.getAllObjects(organisationId);
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

  async getFilterValuesForAudienceField(objectId: number, fieldName: string, connectionId: string, limit: number = 100): Promise<string[]> {
    const object = await audienceStorage.findObjectById(objectId);
    if (!object) {
      throw new Error('Object not found');
    }

    try {
      const response = await this.bigQueryAdapter.getFieldDistinctValues(connectionId, object, fieldName)
      console.log({response});
      return response;
    } catch (error) {
      console.error('Error fetching distinct values:', error);
      return [];
    }
  }

  // Private helper methods
  // private async processCohortCounts(cohortId: string, filters: CohortFilters): Promise<void> {
  //   try {
  //     const counts = await this.bigQueryAdapter.getCohortCounts(filters);
  //     await audienceStorage.updateCohortCounts(cohortId, counts.companyCount, counts.peopleCount);
  //   } catch (error) {
  //     console.error('Error processing cohort counts:', error);
  //     await audienceStorage.updateCohortStatus(
  //       cohortId, 
  //       'error', 
  //       error instanceof Error ? error.message : 'Unknown error'
  //     );
  //     throw error;
  //   }
  // }

  // Utility methods
  async testBigQueryConnection(): Promise<boolean> {
    return await this.bigQueryAdapter.testConnection();
  }

  async generateCohortSQL(cohortId: string): Promise<string> {
    const cohort = await audienceStorage.findCohortById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Get audience configuration
    const audienceConfig = await this.getAudienceConfiguration(cohort.audienceId);
    const filters = cohort.filters as CohortFilters;
    
    return this.bigQueryAdapter.generateCohortSQL(filters, audienceConfig);
  }

  /**
   * Get audience configuration with objects and relationships
   */
  private async getAudienceConfiguration(audienceId: string): Promise<{
    objects: Array<{
      object: { bigqueryTable: string; fields: any[] };
      alias: string;
    }>;
    relationships: Array<{
      joinCondition: string;
    }>;
  }> {
    // Get audience details with objects
    const audienceDetails = await audienceStorage.getAudienceWithDetails(audienceId);
    if (!audienceDetails) {
      throw new Error('Audience not found');
    }

    // Transform audience objects to the expected format
    const objects = audienceDetails.objects.map((audienceObject: any) => ({
      object: {
        bigqueryTable: audienceObject.object.bigqueryTable,
        fields: audienceObject.object.fields || [],
      },
      alias: audienceObject.alias,
    }));

    // Get relationships for this audience
    const relationships = audienceDetails.availableRelationships || [];

    return {
      objects,
      relationships,
    };
  }

  /**
   * Get audience object data (preview from BigQuery)
   */
  async getAudienceObjectData(audienceId: string, objectId: number, connectionId: string, limit: number = 100): Promise<any[]> {
    const audience = await audienceStorage.findAudienceById(audienceId);
    if (!audience) {
      throw new Error('Audience not found');
    }

    const object = await audienceStorage.findObjectById(objectId);
    if (!object) {
      throw new Error('Object not found');
    }

    const response = await this.bigQueryAdapter.getObjectData(connectionId, object, limit)

    return response
  }

  /**
   * Update object field configuration
   */
  async updateObjectFields(objectId: number, fields: any[]): Promise<any> {
    return await audienceStorage.updateObjectFields(objectId, fields);
  }

  /**
   * Preview data based on filter criteria (without creating a cohort)
   */
  async previewFilterData(filters: CohortFilters, limit: number = 100): Promise<any[]> {
    // For now, we'll use a simple approach. In a full implementation, 
    // we'd need to get the audience configuration to build the proper query
    // This is a placeholder that needs audience context
    throw new Error('Preview filter data requires audience configuration. Use previewCohortData with a cohort ID instead.');
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
