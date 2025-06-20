import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import ApiError from '../utils/ApiError';
import environment from '../config/environment';

/**
 * Email Service
 * Handles all email operations including sending invitations
 */
export class EmailService {
  private static transporter: nodemailer.Transporter;

  /**
   * Initialize email transporter
   */
  static initialize() {
    // Configure transporter based on environment (matching old backend config)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: environment.EMAIL_USER,
        pass: environment.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * Send a single email
   */
  static async sendEmail(mailOptions: {
    from?: string;
    to: string;
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
  }): Promise<any> {
    try {
      if (!this.transporter) {
        this.initialize();
      }

      const defaultFrom = environment.EMAIL_USER;
      
      const options = {
        from: mailOptions.from || defaultFrom,
        to: mailOptions.to,
        bcc: mailOptions.bcc || [''],
        subject: mailOptions.subject,
        text: mailOptions.text || '',
        html: mailOptions.html || '',
      };

      const result = await this.transporter.sendMail(options);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw ApiError.internal('Failed to send email');
    }
  }

  /**
   * Generate invite email template
   */
  static async generateInviteTemplate(
    receiverEmail: string, 
    senderEmail: string, 
    invitationId: string
  ): Promise<string> {
    try {
      const userName = this.formatNameFromEmail(receiverEmail);
      const invitedBy = this.formatNameFromEmail(senderEmail);
      
      const templatePath = path.join(__dirname, '../templates/inviteTemplate.hbs');
      const templateSource = await fs.readFile(templatePath, 'utf8');
      const template = Handlebars.compile(templateSource);
      
      const baseURL = environment.FRONTEND_URL;
      const logoUrl = environment.EMAIL_LOGO_URL;
      
      const emailContent = template({
        userName: userName,
        invited_by: invitedBy,
        logoUrl: logoUrl,
        app: `${baseURL}/sign-up?invitation=${invitationId}`
      });

      return emailContent;
    } catch (error) {
      console.error('Error generating invite template:', error);
      throw ApiError.internal('Failed to generate email template');
    }
  }

  /**
   * Send multiple invitation emails
   */
  static async sendMultipleInvites(
    emailInvitationMap: Array<{ email: string; invitation_id: string }>,
    invitedBy: string
  ): Promise<any[]> {
    const mailResponses: any[] = [];
    
    try {
      for (const { email, invitation_id } of emailInvitationMap) {
        try {
          const template = await this.generateInviteTemplate(email, invitedBy, invitation_id);
          
          const mailResult = await this.sendEmail({
            to: email,
            subject: 'Invitation to Join iCustomer',
            html: template
          });
          
          mailResponses.push(mailResult);
        } catch (error) {
          console.error(`Failed to send invite to ${email}:`, error);
          mailResponses.push({ error: `Failed to send to ${email}` });
        }
      }
      
      return mailResponses;
    } catch (error) {
      console.error('Error sending multiple invites:', error);
      throw ApiError.internal('Failed to send invitation emails');
    }
  }

  /**
   * Format name from email address
   */
  private static formatNameFromEmail(email: string): string {
    const [namePart] = email.split('@');
    const nameParts = namePart.split('.');

    if (nameParts.length === 2) {
      return `${this.capitalizeFirstLetter(nameParts[0])} ${this.capitalizeFirstLetter(nameParts[1])}`;
    }
    return this.capitalizeFirstLetter(nameParts[0]);
  }

  /**
   * Capitalize first letter of a string
   */
  private static capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Test email configuration
   */
  static async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initialize();
      }
      
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}
