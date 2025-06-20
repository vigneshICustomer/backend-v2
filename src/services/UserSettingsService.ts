import { userStorage } from '../storage/userStorage';
import ApiError from '../utils/ApiError';
import { EmailService } from './EmailService';
import type { User } from '../types/api';

/**
 * User Settings Service
 * Handles user profile, organization, and member management operations
 */
export class UserSettingsService {
  /**
   * Get user settings/profile information
   */
  static async getUserSettings(userID: string): Promise<any> {
    try {
      const user = await userStorage.findById(userID);
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Return only the settings-relevant fields
      return {
        status: 'success',
        data: [{
          email: user.email,
          organization_name: user.organization_name,
          organization_country: user.organization_country,
          organization_domain: user.organization_domain,
          name: user.name,
          role: user.role,
          plan: user.plan,
          google_id: user.google_id,
          usertype: user.usertype
        }]
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Error getting user settings');
    }
  }

  /**
   * Update user profile information
   */
  static async updateUser(userID: string, name: string, requestingUserID: string): Promise<any> {
    try {
      // Input validation
      if (!name || typeof name !== 'string') {
        throw ApiError.badRequest('Name is required and must be a string');
      }

      if (name.length < 2 || name.length > 50) {
        throw ApiError.badRequest('Name must be between 2 and 50 characters');
      }

      if (!/^[a-zA-Z\s|]+$/.test(name)) {
        throw ApiError.badRequest('Name can only contain letters, spaces, and the pipe (|) character');
      }

      // Check if user is updating their own profile
      if (userID !== requestingUserID) {
        throw ApiError.forbidden('Unauthorized user');
      }

      const updatedUser = await userStorage.updateById(userID, { name });
      
      if (!updatedUser) {
        throw ApiError.notFound('User not found');
      }

      return {
        status: 'success',
        data: 'User updated successfully'
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Error updating user');
    }
  }

  /**
   * Invite new users to organization
   */
  static async inviteUser(mailList: string, invited_by: string, role: string, organisation_id: string): Promise<any> {
    try {
      const emails = mailList.split(',').map(email => email.trim());

      // Check user existence for all emails
      const emailChecks = await Promise.all(emails.map(async email => {
        const user = await userStorage.findByEmail(email);
        return { email, userExists: !!user };
      }));

      // Filter emails that are not registered users
      const newEmails = emailChecks.filter(({ userExists }) => !userExists).map(({ email }) => email);
      
      if (newEmails.length === 0) {
        throw ApiError.badRequest('All users are already registered.');
      }

      // Create invitations for new emails
      const invitations = [];
      for (const email of newEmails) {
        const inviteData = {
          email,
          invited_by,
          role,
          organisation_id,
          accepted: false
        };
        
        const invitation = await userStorage.createInvitation(inviteData);
        invitations.push(invitation);
      }

      // Send invitation emails
      const emailInvitationMap = invitations.map(invitation => ({
        email: invitation.email,
        invitation_id: invitation.invitation_id
      }));

      try {
        const mailResponses = await EmailService.sendMultipleInvites(emailInvitationMap, invited_by);
        
        // Check if all emails were sent successfully
        const successfulSends = mailResponses.filter(response => !response.error);
        
        if (successfulSends.length === emailInvitationMap.length) {
          return {
            status: 'success',
            data: 'User invited successfully'
          };
        } else {
          return {
            status: 'partial_success',
            data: `${successfulSends.length} out of ${emailInvitationMap.length} invitations sent successfully`
          };
        }
      } catch (emailError) {
        console.error('Error sending invitation emails:', emailError);
        // Even if email fails, invitations are created in database
        return {
          status: 'success',
          data: 'Invitations created but email sending failed. Please check email configuration.',
          warning: 'Email service unavailable'
        };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Error inviting user');
    }
  }

  /**
   * Update member invitation status
   */
  static async updateMemberInvite(email: string): Promise<void> {
    try {
      await userStorage.updateMemberInviteByEmail(email);
    } catch (error) {
      throw ApiError.internal('Error updating member invite');
    }
  }

  /**
   * Get invited member data for organization
   */
  static async getInvitedMemberData(organisation_id: string): Promise<any> {
    try {
      const memberData = await userStorage.getInvitedMemberData(organisation_id);
      
      return {
        status: 'success',
        data: memberData
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Error getting invited member data');
    }
  }

  /**
   * Update user role
   */
  static async updateRole(role: string, email: string, created_date?: Date): Promise<any> {
    try {
      // Update user role in users table
      const user = await userStorage.findByEmail(email);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      await userStorage.updateByEmail(email, { role });

      // Update or create invitation record
      const invite = await userStorage.findInviteByEmail(email);
      if (invite) {
        await userStorage.updateInviteRole(email, role);
      } else {
        // Create new invitation record
        const inviteData = {
          email,
          role,
          accepted: true,
          created_date: created_date || new Date()
        };
        await userStorage.createInvitation(inviteData);
      }

      return {
        status: 'success',
        data: 'Role updated successfully'
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Error updating role');
    }
  }

  /**
   * Update organization details
   */
  static async updateOrganizations(organizationName: string, organizationCountry: string, userID: string): Promise<any> {
    try {
      const updatedUser = await userStorage.updateById(userID, {
        organization_name: organizationName,
        organization_country: organizationCountry
      });

      if (!updatedUser) {
        throw ApiError.notFound('User not found');
      }

      return {
        status: 'success',
        data: 'Organization updated successfully'
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Error updating organization');
    }
  }
}
