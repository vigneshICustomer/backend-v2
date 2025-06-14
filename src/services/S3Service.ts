import AWS from 'aws-sdk';
import environment from '../config/environment';
import ApiError from '../utils/ApiError';

/**
 * S3 Service
 * Handles S3 operations for file uploads and downloads
 */
export class S3Service {
  private static s3: AWS.S3;

  static {
    // Configure AWS globally
    AWS.config.update({
      accessKeyId: environment.AWS_ACCESS_KEY_ID,
      secretAccessKey: environment.AWS_SECRET_ACCESS_KEY,
      region: environment.AWS_REGION || 'us-east-1'
    });

    // Initialize S3 client
    this.s3 = new AWS.S3({
      signatureVersion: 'v4',
      accessKeyId: environment.AWS_ACCESS_KEY_ID,
      secretAccessKey: environment.AWS_SECRET_ACCESS_KEY,
      region: environment.AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Generate pre-signed URL for logo upload
   */
  static async generateUploadURL(organizationDomain: string): Promise<string> {
    try {
      const key = `${organizationDomain}.png`;
      const bucketName = 'icusotmerorganisationlogo';

      const params = {
        Bucket: bucketName,
        Key: key,
        Expires: 3600, // URL expires in 1 hour
        ContentType: 'image/png'
      };

      const uploadURL = await this.s3.getSignedUrlPromise('putObject', params);
      return uploadURL;
    } catch (error) {
      console.error('Error generating pre-signed URL:', error);
      throw ApiError.internal('Failed to generate pre-signed URL');
    }
  }

  /**
   * Read logo from S3
   */
  static async readLogo(organizationDomain: string): Promise<string | null> {
    try {
      const key = `${organizationDomain}.png`;
      const bucketName = 'icusotmerorganisationlogo';

      const params = {
        Bucket: bucketName,
        Key: key
      };

      const data = await this.s3.getObject(params).promise();

      if (!data.Body) {
        return null;
      }

      // Convert to base64
      const base64ImageData = data.Body.toString('base64');
      return base64ImageData;
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        return null; // Image not found
      }
      console.error('Error reading image from S3:', error);
      throw ApiError.internal('Failed to read image from S3');
    }
  }
}
