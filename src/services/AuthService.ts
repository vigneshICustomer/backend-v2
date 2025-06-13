import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import environment from '../config/environment';
import { userStorage } from '../storage/userStorage';
import { 
  LoginRequest, 
  LoginResponse, 
  GoogleLoginRequest, 
  RegisterRequest,
  TenantRequest,
  UserStatusRequest 
} from '../types/api';
import type { User as DrizzleUser } from '../db/schema';
import type { User } from '../types/api';
import ApiError from '../utils/ApiError';
import { 
  recordFailedLogin, 
  clearFailedLogins 
} from '../middleware/rateLimiter';

/**
 * Authentication Service
 * Handles all authentication-related operations
 */
export class AuthService {
  /**
   * Convert Drizzle User to API User format
   */
  private static convertToApiUser(drizzleUser: DrizzleUser): User {
    return {
      id: drizzleUser.id,
      username: drizzleUser.username || '',
      email: drizzleUser.email,
      name: drizzleUser.name || '',
      role: drizzleUser.role || 'Admin',
      password: drizzleUser.password || '',
      organization_name: drizzleUser.organization_name || undefined,
      organization_domain: drizzleUser.organization_domain || undefined,
      organisation_id: drizzleUser.organisation_id || undefined,
      google_id: drizzleUser.google_id || undefined,
      verify: drizzleUser.verify || 0,
      verification_code: drizzleUser.verification_code || '',
      usertype: drizzleUser.usertype || undefined,
      is_super_admin: drizzleUser.is_super_admin || false,
      requests_made: drizzleUser.requests_made || 0,
      createdDate: drizzleUser.createdDate || undefined,
    };
  }

  /**
   * Check password against stored hash
   */
  private static async checkPassword(userPassword: string, storedPassword: string): Promise<boolean> {
    const isMatch = await bcrypt.compare(userPassword, storedPassword);
    if (isMatch) return true;
    
    // Fallback for old password format (if needed)
    const isOldMatch = await bcrypt.compare("old password", storedPassword);
    return isOldMatch;
  }

  /**
   * Get tenant information
   */
  static async getTenant(data: TenantRequest): Promise<any> {
    try {
      // Implementation for getting tenant information
      // This would typically involve querying tenant-specific data
      return {
        status: 'success',
        message: 'Tenant information retrieved',
        data: { tenantname: data.tenantname }
      };
    } catch (error) {
      throw ApiError.internal('Failed to get tenant information');
    }
  }

  /**
   * Get user status
   */
  static async getUserStatus(data: UserStatusRequest): Promise<any> {
    try {
      const user = await userStorage.findById(data.userid);

      if (user) {
        return {
          status: 'success',
          data: 'User exists'
        };
      } else {
        return {
          status: 'failed',
          message: 'User does not exist'
        };
      }
    } catch (error) {
      throw ApiError.internal('Error getting user status');
    }
  }

  /**
   * Login user with JWT
   */
  static async loginJWT(data: LoginRequest, ip: string): Promise<LoginResponse> {
    try {
      const { email, password } = data;
      
      // Find user by email
      const user = await userStorage.findByEmail(email);

      if (!user) {
        await recordFailedLogin(ip);
        await userStorage.incrementUserRequests(email);
        throw ApiError.unauthorized('Invalid credentials');
      }

      // Check request limit
      if ((user.requests_made || 0) > 5) {
        throw ApiError.tooManyRequests('Too Many Requests! Come again in 24 hours!');
      }

      // Verify password
      const isPasswordValid = await this.checkPassword(password, user.password || '');
      if (!isPasswordValid) {
        await recordFailedLogin(ip);
        await userStorage.incrementUserRequests(email);
        throw ApiError.unauthorized('Invalid credentials');
      }

      // Check if user is verified
      if (user.verify !== 1 || user.verification_code !== 'verified') {
        throw ApiError.unauthorized('Please verify your email to Login');
      }

      // Generate JWT token
      const token = jwt.sign(user, environment.JWT_SECRET_KEY);

      // Create session
      const sessionData = {
        user_id: user.id,
        session_token: this.generateSessionToken(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ip: ip,
        jwt_token: token
      };
      
      const session = await userStorage.createSession(sessionData);

      // Clear failed login attempts and reset request count
      await clearFailedLogins(ip);
      await userStorage.resetUserRequests(email);

      return {
        status: 'success',
        message: 'Login successful',
        token,
        sessionToken: session.session_token,
        user: this.convertToApiUser(user)
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('An error occurred during login');
    }
  }

  /**
   * Generate session token
   */
  private static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Logout user
   */
  static async logout(sessionToken: string): Promise<any> {
    try {
      await userStorage.invalidateSession(sessionToken);
      
      return {
        status: 'success',
        message: 'Logged out successfully'
      };
    } catch (error) {
      throw ApiError.internal('An error occurred during logout');
    }
  }

  /**
   * Google login/register
   */
  static async googleLoginJWT(data: GoogleLoginRequest, ip: string): Promise<LoginResponse> {
    try {
      const { 
        googleID, 
        username, 
        email, 
        organization_name, 
        organization_domain, 
        name, 
        app = '', 
        role = 'Admin', 
        inviteID 
      } = data;

      let org_id = null;

      // Handle invitation flow
      if (inviteID && inviteID !== 'false') {
        const invite = await userStorage.findInviteById(inviteID);
        
        if (!invite) {
          throw ApiError.notFound('Invitation not found');
        }

        if (invite.email !== email) {
          throw ApiError.forbidden('Member is different than one who is invited');
        }

        // Update invitation as accepted
        await userStorage.updateInviteAccepted(inviteID);

        // Create new user for invited member
        const newUser = await userStorage.findOrCreateGoogleUser({
          googleID,
          username,
          email,
          organization_name,
          organization_domain,
          name,
          role,
          organisation_id: invite.organisation_id || undefined
        });

        const token = jwt.sign(newUser, environment.JWT_SECRET_KEY);
        
        // Create session
        const sessionData = {
          user_id: newUser.id,
          session_token: this.generateSessionToken(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          ip: ip,
          jwt_token: token
        };
        
        const session = await userStorage.createSession(sessionData);

        return {
          status: 'success',
          message: 'Login successful',
          token,
          sessionToken: session.session_token,
          user: this.convertToApiUser(newUser)
        };
      }

      // Regular flow - check for existing organization
      const org = await userStorage.findOrganisationByName(organization_domain || '');
      if (org) {
        org_id = org.organisation_id;
      }

      // Find or create Google user
      const user = await userStorage.findOrCreateGoogleUser({
        googleID,
        username,
        email,
        organization_name,
        organization_domain,
        name,
        role,
        organisation_id: org_id || undefined
      });

      const token = jwt.sign(user, environment.JWT_SECRET_KEY);
      
      // Create session
      const sessionData = {
        user_id: user.id,
        session_token: this.generateSessionToken(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ip: ip,
        jwt_token: token
      };
      
      const session = await userStorage.createSession(sessionData);

      return {
        status: 'success',
        message: 'Login successful',
        token,
        sessionToken: session.session_token,
        user: this.convertToApiUser(user)
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Error during Google login');
    }
  }


  /**
   * Session persistence check
   */
  static async persistSession(ip: string): Promise<any> {
    try {
      console.log('calling from ORM')
      const sessions = await userStorage.findSessionsByIP(ip);


      if (sessions.length === 0) {
        return {
          statusCode: 201,
          message: "No Active User right now"
        };
      }

      // Filter results by expiration time
      const currentTime = Date.now();
      const validSessions = sessions.filter(session => 
        currentTime < new Date(session.expires_at).getTime()
      );

      if (validSessions.length === 1) {
        return {
          statusCode: 200,
          message: "Found one active user",
          jwt_token: validSessions[0].jwt_token,
          session_token: validSessions[0].session_token
        };
      } else {
        // Remove stale sessions
        await userStorage.invalidateAllSessionsByIP(ip);

        return {
          statusCode: 201,
          message: "Past Sessions Terminated"
        };
      }
    } catch (error) {
      console.error('Session persistence error:', error);
      throw ApiError.internal('Error during session persistence check');
    }
  }
}
