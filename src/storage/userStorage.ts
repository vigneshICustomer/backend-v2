import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { users, userSessions, organisations, inviteMembers } from '../db/schema';
import type { User, NewUser, UserSession, NewUserSession, Organisation, InviteMember } from '../db/schema';

/**
 * User Storage
 * All user-related database operations using Drizzle ORM
 */
export const userStorage = {
  // User CRUD operations
  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.google_id, googleId)).limit(1);
    return result[0] || null;
  },

  async create(userData: NewUser): Promise<User> {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  },

  async updateById(id: string, data: Partial<User>): Promise<User | null> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0] || null;
  },

  async updateByEmail(email: string, data: Partial<User>): Promise<User | null> {
    const result = await db.update(users).set(data).where(eq(users.email, email)).returning();
    return result[0] || null;
  },

  async resetUserRequests(email: string): Promise<void> {
    await db.update(users).set({ requests_made: 0 }).where(eq(users.email, email));
  },

  async incrementUserRequests(email: string): Promise<void> {
    // First get current count, then increment
    const user = await this.findByEmail(email);
    if (user) {
      const newCount = (user.requests_made || 0) + 1;
      await db.update(users).set({ requests_made: newCount }).where(eq(users.email, email));
    }
  },

  // Session operations
  async createSession(sessionData: NewUserSession): Promise<UserSession> {
    const result = await db.insert(userSessions).values(sessionData).returning();
    return result[0];
  },

  async findSessionByToken(sessionToken: string): Promise<UserSession | null> {
    const result = await db.select().from(userSessions)
      .where(and(
        eq(userSessions.session_token, sessionToken),
        eq(userSessions.is_valid, true)
      ))
      .limit(1);
    return result[0] || null;
  },

  async findSessionsByIP(ip: string): Promise<UserSession[]> {
    return await db.select().from(userSessions)
      .where(and(
        eq(userSessions.ip, ip),
        eq(userSessions.is_valid, true)
      ));
  },

  async invalidateSession(sessionToken: string): Promise<void> {
    await db.update(userSessions)
      .set({ is_valid: false })
      .where(eq(userSessions.session_token, sessionToken));
  },

  async invalidateAllSessionsByIP(ip: string): Promise<void> {
    await db.update(userSessions)
      .set({ is_valid: false })
      .where(eq(userSessions.ip, ip));
  },

  // Organization operations
  async findOrganisationByName(name: string): Promise<Organisation | null> {
    const result = await db.select().from(organisations)
      .where(eq(organisations.organisation_name, name))
      .limit(1);
    return result[0] || null;
  },

  // Invite operations
  async findInviteById(invitationId: string): Promise<InviteMember | null> {
    const result = await db.select().from(inviteMembers)
      .where(eq(inviteMembers.invitation_id, invitationId))
      .limit(1);
    return result[0] || null;
  },

  async updateInviteAccepted(invitationId: string): Promise<void> {
    await db.update(inviteMembers)
      .set({ accepted: true })
      .where(eq(inviteMembers.invitation_id, invitationId));
  },

  async updateMemberInviteByEmail(email: string): Promise<void> {
    await db.update(inviteMembers)
      .set({ accepted: true })
      .where(eq(inviteMembers.email, email));
  },

  // Authentication specific operations
  async validateUserCredentials(email: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    // Check if user is verified
    if (user.verify !== 1 || user.verification_code !== 'verified') {
      return null;
    }

    return user;
  },

  async findOrCreateGoogleUser(googleData: {
    googleID: string;
    username: string;
    email: string;
    organization_name?: string;
    organization_domain?: string;
    name: string;
    role?: string;
    organisation_id?: string;
  }): Promise<User> {
    // First try to find existing user
    let user = await this.findByEmail(googleData.email);
    
    if (user) {
      // Update Google ID if not set
      if (!user.google_id) {
        user = await this.updateById(user.id, { google_id: googleData.googleID });
      }
      return user!;
    }

    // Create new user
    const newUserData: NewUser = {
      username: googleData.username,
      email: googleData.email,
      google_id: googleData.googleID,
      verification_code: 'verified',
      verify: 1,
      organization_name: googleData.organization_name,
      organization_domain: googleData.organization_domain || 'icustomer.ai',
      name: googleData.name,
      role: googleData.role || 'Admin',
      organisation_id: googleData.organisation_id,
    };

    return await this.create(newUserData);
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await db.select().from(users).limit(1);
      return true;
    } catch (error) {
      return false;
    }
  }
};
