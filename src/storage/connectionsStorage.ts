import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { connections, type Connection, type NewConnection } from '../db/schema/connections';

/**
 * Connections Storage
 * All BigQuery connections-related database operations using Drizzle ORM
 */
export const connectionsStorage = {
  // Connection CRUD operations
  async findById(id: string): Promise<Connection | null> {
    const result = await db.select().from(connections).where(eq(connections.id, id)).limit(1);
    return result[0] || null;
  },

  async findByOrganisationId(organisationId: string): Promise<Connection[]> {
    return await db.select().from(connections).where(eq(connections.organisationId, organisationId));
  },

  async findByOrganisationAndName(organisationId: string, name: string): Promise<Connection | null> {
    const result = await db.select().from(connections)
      .where(and(
        eq(connections.organisationId, organisationId),
        eq(connections.name, name)
      ))
      .limit(1);
    return result[0] || null;
  },

  async findByType(type: string): Promise<Connection[]> {
    return await db.select().from(connections).where(eq(connections.type, type));
  },

  async findByStatus(status: string): Promise<Connection[]> {
    return await db.select().from(connections).where(eq(connections.status, status));
  },

  async create(connectionData: NewConnection): Promise<Connection> {
    const result = await db.insert(connections).values(connectionData).returning();
    return result[0];
  },

  async updateById(id: string, data: Partial<Connection>): Promise<Connection | null> {
    // Always update the updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    
    const result = await db.update(connections)
      .set(updateData)
      .where(eq(connections.id, id))
      .returning();
    return result[0] || null;
  },

  async updateStatus(id: string, status: string): Promise<Connection | null> {
    return await this.updateById(id, { status });
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(connections).where(eq(connections.id, id)).returning();
    return result.length > 0;
  },

  // Specific BigQuery operations
  async findActiveConnections(organisationId: string): Promise<Connection[]> {
    return await db.select().from(connections)
      .where(and(
        eq(connections.organisationId, organisationId),
        eq(connections.status, 'connected')
      ));
  },

  async findPendingConnections(organisationId: string): Promise<Connection[]> {
    return await db.select().from(connections)
      .where(and(
        eq(connections.organisationId, organisationId),
        eq(connections.status, 'pending')
      ));
  },

  async findFailedConnections(organisationId: string): Promise<Connection[]> {
    return await db.select().from(connections)
      .where(and(
        eq(connections.organisationId, organisationId),
        eq(connections.status, 'failed')
      ));
  },

  async countConnectionsByOrganisation(organisationId: string): Promise<number> {
    const result = await db.select().from(connections)
      .where(eq(connections.organisationId, organisationId));
    return result.length;
  },

  async countConnectionsByStatus(organisationId: string, status: string): Promise<number> {
    const result = await db.select().from(connections)
      .where(and(
        eq(connections.organisationId, organisationId),
        eq(connections.status, status)
      ));
    return result.length;
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await db.select().from(connections).limit(1);
      return true;
    } catch (error) {
      return false;
    }
  }
};
