import { audienceStorage } from "../storage/audienceStorage";
import AudienceBigQueryAdapter from "./AudienceBigQueryAdapter";
import type { Cohort, NewCohort, CohortFilters } from "../db/schema/audiences";

export class CohortService {
  private bigQueryAdapter: AudienceBigQueryAdapter;

  constructor() {
    this.bigQueryAdapter = new AudienceBigQueryAdapter();
  }

  /**
   * Set the BigQuery connection ID to use for cohort queries
   */
  setBigQueryConnectionId(connectionId: string): void {
    this.bigQueryAdapter.setDefaultConnectionId(connectionId);
  }

  // Cohort CRUD operations
  async createCohort(data: {
    name: string;
    description?: string;
    audienceId: string;
    tenantId: string;
    createdBy: string;
    companyFilters: any[];
    contactFilters: any[];
    companyCount: any;
    contactCount: any;
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
      companyCount: data.companyCount,
      peopleCount: data.contactCount,
      status: "processing",
    };

    const cohort = await audienceStorage.createCohort(cohortData);

    // Process cohort counts in background (in a real app, this would be a background job)
    // this.processCohortCounts(cohort.id, filters).catch(error => {
    //   console.error('Error processing cohort counts:', error);
    //   audienceStorage.updateCohortStatus(cohort.id, 'error', error.message);
    // });

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

  async updateCohort(
    id: string,
    updates: Partial<NewCohort>
  ): Promise<Cohort | null> {
    return await audienceStorage.updateCohort(id, updates);
  }

  async deleteCohort(id: string): Promise<boolean> {
    return await audienceStorage.deleteCohort(id);
  }

  // Cohort data operations
  async previewCohortData(
    cohortId: string,
    connectionId: string,
    limit: number = 100
  ): Promise<any[]> {
    const cohort = await audienceStorage.findCohortById(cohortId);
    if (!cohort) {
      throw new Error("Cohort not found");
    }

    // Get audience configuration
    const audienceConfig = await this.getAudienceConfiguration(
      cohort.audienceId
    );
    const filters = cohort.filters as CohortFilters;

    return await this.bigQueryAdapter.executeCohortQuery(
      filters,
      audienceConfig,
      limit,
      connectionId
    );
  }

  //   async getCohortCounts(cohortId: string): Promise<{ companyCount: number; peopleCount: number }> {
  //     const cohort = await audienceStorage.findCohortById(cohortId);
  //     if (!cohort) {
  //       throw new Error('Cohort not found');
  //     }

  //     // Return cached counts if available and recent
  //     if (cohort.companyCount !== null && cohort.peopleCount !== null && cohort.lastProcessedAt) {
  //       const hoursSinceLastProcessed = (Date.now() - cohort.lastProcessedAt.getTime()) / (1000 * 60 * 60);
  //       if (hoursSinceLastProcessed < 24) { // Cache for 24 hours
  //         return {
  //           companyCount: cohort.companyCount,
  //           peopleCount: cohort.peopleCount,
  //         };
  //       }
  //     }

  //     // Fetch fresh counts from BigQuery
  //     const filters = cohort.filters as CohortFilters;
  //     const counts = await this.bigQueryAdapter.getCohortCounts(filters);

  //     // Update cached counts
  //     await audienceStorage.updateCohortCounts(cohortId, counts.companyCount, counts.peopleCount);

  //     return counts;
  //   }

  async downloadCohortData(cohortId: string): Promise<any[]> {
    const cohort = await audienceStorage.findCohortById(cohortId);
    if (!cohort) {
      throw new Error("Cohort not found");
    }

    // Get audience configuration
    const audienceConfig = await this.getAudienceConfiguration(
      cohort.audienceId
    );
    const filters = cohort.filters as CohortFilters;

    return await this.bigQueryAdapter.executeCohortQuery(
      filters,
      audienceConfig
    ); // No limit for download
  }

  async generateCohortSQL(cohortId: string): Promise<string> {
    const cohort = await audienceStorage.findCohortById(cohortId);
    if (!cohort) {
      throw new Error("Cohort not found");
    }

    // Get audience configuration
    const audienceConfig = await this.getAudienceConfiguration(
      cohort.audienceId
    );
    const filters = cohort.filters as CohortFilters;

    return this.bigQueryAdapter.generateCohortSQL(filters, audienceConfig);
  }

  // Real-time filter operations (without creating a cohort)
  async getFilterCounts(
    audienceId: string,
    filters: CohortFilters,
    connectionId: string
  ): Promise<{ companyCount: number; peopleCount: number }> {
    // Get audience configuration
    const audienceConfig = await this.getAudienceConfiguration(audienceId);

    // Use the dynamic count query with audience configuration
    return await this.bigQueryAdapter.getCohortCountsWithConfig(
      filters,
      audienceConfig,
      connectionId
    );
  }

  // Fetch sample filter operations (without creating a cohort)
  async getFilterPreveiwData(
    audienceId: string,
    filters: CohortFilters,
    connectionId: string
  ): Promise<{
    companyPreview: any;
    contactPreview: any;
  }> {
    // Get audience configuration
    const audienceConfig = await this.getAudienceConfiguration(audienceId);

    // Use the dynamic count query with audience configuration
    return await this.bigQueryAdapter.getCohortPreviewWithConfig(
      filters,
      audienceConfig,
      connectionId
    );
  }

  async previewFilterData(
    audienceId: string,
    filters: CohortFilters,
    connectionId: string,
    limit: number = 100
  ): Promise<any[]> {
    // Get audience configuration
    const audienceConfig = await this.getAudienceConfiguration(audienceId);

    return await this.bigQueryAdapter.executeCohortQuery(
      filters,
      audienceConfig,
      limit,
      connectionId
    );
  }

  // Private helper methods
  //   private async processCohortCounts(cohortId: string, filters: CohortFilters): Promise<void> {
  //     try {
  //       const counts = await this.bigQueryAdapter.getCohortCounts(filters);
  //       await audienceStorage.updateCohortCounts(cohortId, counts.companyCount, counts.peopleCount);
  //     } catch (error) {
  //       console.error('Error processing cohort counts:', error);
  //       await audienceStorage.updateCohortStatus(
  //         cohortId,
  //         'error',
  //         error instanceof Error ? error.message : 'Unknown error'
  //       );
  //       throw error;
  //     }
  //   }

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
    const audienceDetails = await audienceStorage.getAudienceWithDetails(
      audienceId
    );
    if (!audienceDetails) {
      throw new Error("Audience not found");
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

  // Utility methods
  async testBigQueryConnection(): Promise<boolean> {
    return await this.bigQueryAdapter.testConnection();
  }
}

export default CohortService;
