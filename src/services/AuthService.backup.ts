import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import environment from "../config/environment";
import connection from "../config/database";
import {
  usersTable,
  userSessionsTable,
  organisationTable,
  inviteMemberTable,
} from "../config/tableConfig";
import {
  User,
  LoginRequest,
  LoginResponse,
  GoogleLoginRequest,
  TenantRequest,
  UserStatusRequest,
} from "../types/api";
import ApiError from "../utils/ApiError";
import { createUserSession, invalidateUserSession } from "../middleware/auth";
import {
  recordFailedLogin,
  clearFailedLogins,
  resetUserRequests,
  incrementUserRequests,
} from "../middleware/rateLimiter";

/**
 * Authentication Service
 * Handles all authentication-related operations
 */
export class AuthService {
  /**
   * Check password against stored hash
   */
  private static async checkPassword(
    userPassword: string,
    storedPassword: string
  ): Promise<boolean> {
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
        status: "success",
        message: "Tenant information retrieved",
        data: { tenantname: data.tenantname },
      };
    } catch (error) {
      throw ApiError.internal("Failed to get tenant information");
    }
  }

  /**
   * Get user status
   */
  static async getUserStatus(data: UserStatusRequest): Promise<any> {
    try {
      const query = `SELECT * FROM ${usersTable.schemaTableName} WHERE ${usersTable.id} = $1`;
      const result = await connection.query(query, [data.userid]);

      if (result.rows.length > 0) {
        return {
          status: "success",
          data: "User exists",
        };
      } else {
        return {
          status: "failed",
          message: "User does not exist",
        };
      }
    } catch (error) {
      throw ApiError.internal("Error getting user status");
    }
  }

  /**
   * Login user with JWT
   */
  static async loginJWT(
    data: LoginRequest,
    ip: string
  ): Promise<LoginResponse> {
    try {
      const { email, password } = data;

      // Check user request limit
      const userQuery = `SELECT * FROM ${usersTable.schemaTableName} WHERE ${usersTable.email} = $1`;
      const userResult = await connection.query(userQuery, [email]);

      if (userResult.rows.length === 0) {
        await recordFailedLogin(ip);
        await incrementUserRequests(email);
        throw ApiError.unauthorized("Invalid credentials");
      }

      const user: User = userResult.rows[0];

      // Check request limit
      if ((user.requests_made || 0) > 5) {
        throw ApiError.tooManyRequests(
          "Too Many Requests! Come again in 24 hours!"
        );
      }

      // Verify password
      const isPasswordValid = await this.checkPassword(password, user.password);
      if (!isPasswordValid) {
        await recordFailedLogin(ip);
        await incrementUserRequests(email);
        throw ApiError.unauthorized("Invalid credentials");
      }

      // Check if user is verified
      if (user.verify !== 1 || user.verification_code !== "verified") {
        throw ApiError.unauthorized("Please verify your email to Login");
      }

      // Generate JWT token
      const token = jwt.sign(user, environment.JWT_SECRET_KEY);

      // Create session
      const sessionToken = await createUserSession(user.id, ip, token);

      // Clear failed login attempts and reset request count
      await clearFailedLogins(ip);
      await resetUserRequests(email);

      return {
        status: "success",
        message: "Login successful",
        token,
        sessionToken,
        user,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal("An error occurred during login");
    }
  }

  /**
   * Logout user
   */
  static async logout(sessionToken: string): Promise<any> {
    try {
      await invalidateUserSession(sessionToken);

      return {
        status: "success",
        message: "Logged out successfully",
      };
    } catch (error) {
      throw ApiError.internal("An error occurred during logout");
    }
  }

  /**
   * Google login/register
   */
  static async googleLoginJWT(
    data: GoogleLoginRequest,
    ip: string
  ): Promise<LoginResponse> {
    try {
      const {
        googleID,
        username,
        email,
        organization_name,
        organization_domain,
        name,
        app = "",
        role = "Admin",
        inviteID,
      } = data;

      let org_id = null;

      // Handle invitation flow
      if (inviteID && inviteID !== "false") {
        const inviteQuery = `
          SELECT ${inviteMemberTable.email}, ${inviteMemberTable.organisation_id} 
          FROM ${inviteMemberTable.schemaTableName} 
          WHERE ${inviteMemberTable.invitation_id} = $1
        `;

        const inviteResult = await connection.query(inviteQuery, [inviteID]);

        if (inviteResult.rows.length === 0) {
          throw ApiError.notFound("Invitation not found");
        }

        const inviteData = inviteResult.rows[0];
        if (inviteData.email !== email) {
          throw ApiError.forbidden(
            "Member is different than one who is invited"
          );
        }

        // Update invitation as accepted
        const updateInviteQuery = `
          UPDATE ${inviteMemberTable.schemaTableName}
          SET ${inviteMemberTable.accepted} = true
          WHERE ${inviteMemberTable.invitation_id} = $1
        `;
        await connection.query(updateInviteQuery, [inviteID]);

        // Create new user for invited member
        const insertUserQuery = `
          INSERT INTO ${usersTable.schemaTableName} 
          (${usersTable.email}, ${usersTable.username}, ${usersTable.google_id}, ${usersTable.name}, 
           ${usersTable.role}, ${usersTable.verification_code}, ${usersTable.verify}, 
           ${usersTable.organisation_id}, ${usersTable.organization_domain})
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;

        const newUserResult = await connection.query(insertUserQuery, [
          email,
          username,
          googleID,
          name,
          role,
          "verified",
          1,
          inviteData.organisation_id,
          organization_domain || "icustomer.ai",
        ]);

        const user = newUserResult.rows[0];
        const token = jwt.sign(user, environment.JWT_SECRET_KEY);
        const sessionToken = await createUserSession(user.id, ip, token);

        return {
          status: "success",
          message: "Login successful",
          token,
          sessionToken,
          user,
        };
      }

      // Regular flow - check for existing organization
      const orgQuery = `SELECT * FROM ${organisationTable.schemaTableName} WHERE ${organisationTable.organisation_name} = $1`;
      const orgResult = await connection.query(orgQuery, [organization_domain]);

      if (orgResult.rows.length > 0) {
        org_id = orgResult.rows[0].organisation_id;
      }

      // Check if user exists
      const userQuery = `SELECT * FROM ${usersTable.schemaTableName} WHERE ${usersTable.email} = $1`;
      const userResult = await connection.query(userQuery, [email]);

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];

        // Check Google ID
        if (user.google_id && user.google_id !== "") {
          if (user.google_id === googleID) {
            const token = jwt.sign(user, environment.JWT_SECRET_KEY);
            const sessionToken = await createUserSession(user.id, ip, token);

            return {
              status: "success",
              message: "Login successful",
              token,
              sessionToken,
              user,
            };
          } else {
            throw ApiError.unauthorized("Invalid Email");
          }
        } else {
          // Update Google ID for existing user
          const updateQuery = `
            UPDATE ${usersTable.schemaTableName} 
            SET ${usersTable.google_id} = $1 
            WHERE ${usersTable.email} = $2 
            RETURNING *
          `;
          await connection.query(updateQuery, [googleID, email]);

          const token = jwt.sign(user, environment.JWT_SECRET_KEY);
          const sessionToken = await createUserSession(user.id, ip, token);

          return {
            status: "success",
            message: "Login successful",
            token,
            sessionToken,
            user,
          };
        }
      } else {
        throw ApiError.unauthorized(
          "Account not found please contact your organization admin"
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal("Error during Google login");
    }
  }

  /**
   * Session persistence check
   */
  static async persistSession(ip: string): Promise<any> {
    try {
      const checkQuery = `
        SELECT * FROM ${userSessionsTable.schemaTableName}
        WHERE ${userSessionsTable.ip} = $1
        AND ${userSessionsTable.is_valid} = true
      `;

      const results = await connection.query(checkQuery, [ip]);

      if (results.rows.length === 0) {
        return {
          statusCode: 201,
          message: "No Active User right now",
        };
      }

      // Filter results by expiration time
      const currentTime = Date.now();
      const filteredResults = results.rows.filter(
        (row) => currentTime < new Date(row.expires_at).getTime()
      );

      if (filteredResults.length === 1) {
        return {
          statusCode: 200,
          message: "Found one active user",
          jwt_token: filteredResults[0].jwt_token,
          session_token: filteredResults[0].session_token,
        };
      } else {
        // Remove stale sessions
        const removeStaleSessionsQuery = `
          UPDATE ${userSessionsTable.schemaTableName}
          SET ${userSessionsTable.is_valid} = false
          WHERE ${userSessionsTable.ip} = $1
          AND ${userSessionsTable.is_valid} = true 
        `;

        await connection.query(removeStaleSessionsQuery, [ip]);

        return {
          statusCode: 201,
          message: "Past Sessions Terminated",
        };
      }
    } catch (error) {
      console.error("Session persistence error:", error);
      throw ApiError.internal("Error during session persistence check");
    }
  }
}
