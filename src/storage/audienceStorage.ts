import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/connection";
import {
  audiences,
  audienceObjects,
  objects,
  relationships,
  cohorts,
  type Audience,
  type NewAudience,
  type AudienceObject,
  type NewAudienceObject,
  type Object,
  type Relationship,
  type Cohort,
  type NewCohort,
  type CohortFilters,
} from "../db/schema/audiences";
import { users } from "../db/schema/users";

/**
 * Audience Storage
 * All audience and cohort-related database operations using Drizzle ORM
 */
export const audienceStorage = {
  // Audience CRUD operations
  async findAudienceById(id: string): Promise<Audience | null> {
    const result = await db
      .select()
      .from(audiences)
      .where(eq(audiences.id, id))
      .limit(1);
    return result[0] || null;
  },

  async findAudiencesByTenant(tenantId: string): Promise<Audience[]> {
    return await db
      .select()
      .from(audiences)
      .where(eq(audiences.tenantId, tenantId))
      .orderBy(desc(audiences.createdAt));
  },

  async createAudience(audienceData: NewAudience): Promise<Audience> {
    const result = await db.insert(audiences).values(audienceData).returning();
    return result[0];
  },

  async updateAudience(
    id: string,
    updates: Partial<NewAudience>
  ): Promise<Audience | null> {
    const result = await db
      .update(audiences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(audiences.id, id))
      .returning();
    return result[0] || null;
  },

  async deleteAudience(id: string): Promise<boolean> {
    const result = await db.delete(audiences).where(eq(audiences.id, id));
    return (result.rowCount || 0) > 0;
  },

  // Audience Objects operations
  async addObjectsToAudience(
    audienceId: string,
    objectMappings: { objectId: number; alias: string }[]
  ): Promise<AudienceObject[]> {
    const audienceObjectsData: NewAudienceObject[] = objectMappings.map(
      (mapping) => ({
        audienceId,
        objectId: mapping.objectId,
        alias: mapping.alias,
      })
    );

    return await db
      .insert(audienceObjects)
      .values(audienceObjectsData)
      .returning();
  },

  async getAudienceObjects(
    audienceId: string
  ): Promise<(AudienceObject & { object: Object })[]> {
    return await db
      .select({
        id: audienceObjects.id,
        audienceId: audienceObjects.audienceId,
        objectId: audienceObjects.objectId,
        alias: audienceObjects.alias,
        createdAt: audienceObjects.createdAt,
        object: objects,
      })
      .from(audienceObjects)
      .innerJoin(objects, eq(audienceObjects.objectId, objects.id))
      .where(eq(audienceObjects.audienceId, audienceId));
  },

  async removeObjectsFromAudience(audienceId: string): Promise<boolean> {
    const result = await db
      .delete(audienceObjects)
      .where(eq(audienceObjects.audienceId, audienceId));
    return (result.rowCount || 0) > 0;
  },

  // Objects operations
  async getAllObjects(organisationId?: string): Promise<Object[]> {
    if (organisationId) {
      return await db
        .select()
        .from(objects)
        .where(eq(objects.organisationId, organisationId))
        .orderBy(objects.displayName);
    }
    return await db.select().from(objects).orderBy(objects.displayName);
  },

  async findObjectById(id: number, organisationId?: string): Promise<Object | null> {
    if (organisationId) {
      const result = await db
        .select()
        .from(objects)
        .where(and(eq(objects.id, id), eq(objects.organisationId, organisationId)))
        .limit(1);
      return result[0] || null;
    }
    
    const result = await db
      .select()
      .from(objects)
      .where(eq(objects.id, id))
      .limit(1);
    return result[0] || null;
  },

  async findObjectByName(name: string): Promise<Object | null> {
    const result = await db
      .select()
      .from(objects)
      .where(eq(objects.name, name))
      .limit(1);
    return result[0] || null;
  },

  async getObjectFields(objectId: number): Promise<any[]> {
    const object = await this.findObjectById(objectId);
    if (!object || !object.fields) return [];

    // Parse the fields JSON and return filterable fields
    const fields = Array.isArray(object.fields) ? object.fields : [];
    return fields.filter((field: any) => field.isFilterable);
  },

  async getObjectDisplayFields(objectId: number): Promise<any[]> {
    const object = await this.findObjectById(objectId);
    if (!object || !object.fields) return [];

    // Parse the fields JSON and return displayable fields
    const fields = Array.isArray(object.fields) ? object.fields : [];
    return fields.filter((field: any) => field.isDisplayable);
  },

  async updateObjectFields(id: number, fields: any[]): Promise<Object | null> {
    const result = await db
      .update(objects)
      .set({ fields, updatedAt: new Date() })
      .where(eq(objects.id, id))
      .returning();
    return result[0] || null;
  },

  // Relationships operations
  async getAllRelationships(): Promise<Relationship[]> {
    return await db.select().from(relationships);
  },

  async getRelationshipsBetweenObjects(
    objectIds: number[]
  ): Promise<Relationship[]> {
    if (objectIds.length < 2) return [];

    // This is a simplified query - in practice you'd want to check if both fromObjectId and toObjectId are in the objectIds array
    return await db
      .select()
      .from(relationships)
      .where(eq(relationships.fromObjectId, objectIds[0]));
  },

  // Cohort CRUD operations
  async findCohortById(id: string): Promise<Cohort | null> {
    const result = await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, id))
      .limit(1);
    return result[0] || null;
  },

  async findCohortsByAudience(audienceId: string): Promise<Cohort[]> {
    return await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.audienceId, audienceId))
      .orderBy(desc(cohorts.createdAt));
  },

  async findCohortsByTenant(tenantId: string): Promise<any> {
    return await db.execute(sql`
    SELECT 
      c.*, 
      u.name AS "createdByName"
    FROM audience_hub.cohorts c
    LEFT JOIN dev.users u ON c.created_by = u.id::text
    WHERE c.tenant_id = ${tenantId}
    ORDER BY c.created_at DESC
  `);
  },

  async createCohort(cohortData: NewCohort): Promise<Cohort> {
    const result = await db.insert(cohorts).values(cohortData).returning();
    return result[0];
  },

  async updateCohort(
    id: string,
    updates: Partial<NewCohort>
  ): Promise<Cohort | null> {
    const result = await db
      .update(cohorts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cohorts.id, id))
      .returning();
    return result[0] || null;
  },

  async updateCohortCounts(
    id: string,
    companyCount: number,
    peopleCount: number
  ): Promise<Cohort | null> {
    const result = await db
      .update(cohorts)
      .set({
        companyCount,
        peopleCount,
        lastProcessedAt: new Date(),
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(cohorts.id, id))
      .returning();
    return result[0] || null;
  },

  async updateCohortStatus(
    id: string,
    status: string,
    errorMessage?: string
  ): Promise<Cohort | null> {
    const result = await db
      .update(cohorts)
      .set({
        status,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(cohorts.id, id))
      .returning();
    return result[0] || null;
  },

  async deleteCohort(id: string): Promise<boolean> {
    const result = await db.delete(cohorts).where(eq(cohorts.id, id));
    return (result.rowCount || 0) > 0;
  },

  // Complex queries
  async getAudienceWithDetails(id: string): Promise<{
    audience: Audience;
    objects: (AudienceObject & { object: Object })[];
    availableRelationships: Relationship[];
  } | null> {
    const audience = await this.findAudienceById(id);
    if (!audience) return null;

    const audienceObjectsWithDetails = await this.getAudienceObjects(id);

    // Get available relationships between the objects in this audience
    const objectIds = audienceObjectsWithDetails.map((ao) => ao.objectId);
    const availableRelationships = await this.getRelationshipsBetweenObjects(
      objectIds
    );

    return {
      audience,
      objects: audienceObjectsWithDetails,
      availableRelationships,
    };
  },

  async getCohortWithAudience(cohortId: string): Promise<{
    cohort: Cohort;
    audience: Audience;
    audienceObjects: (AudienceObject & { object: Object })[];
  } | null> {
    const cohort = await this.findCohortById(cohortId);
    if (!cohort) return null;

    const audience = await this.findAudienceById(cohort.audienceId);
    if (!audience) return null;

    const audienceObjects = await this.getAudienceObjects(cohort.audienceId);

    return {
      cohort,
      audience,
      audienceObjects,
    };
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await db.select().from(audiences).limit(1);
      return true;
    } catch (error) {
      return false;
    }
  },
};
