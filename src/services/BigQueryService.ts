import { BigQuery, Dataset, Table } from '@google-cloud/bigquery';
import fs from 'fs';
import path from 'path';
import { readJsonFile } from '../utils/fileUpload';
import { encryptObject, decryptObject } from '../utils/encryption';
import { connectionsStorage } from '../storage/connectionsStorage';
import ApiError from '../utils/ApiError';
import { 
  analyzeAccess, 
  checkProjectAccess, 
  combineAccessInfo, 
  logAccessInfo, 
  formatAccessResponse,
  CombinedAccess 
} from '../utils/bigquery.helper';

// Connection types
export enum ConnectionStatus {
  PENDING = 'pending',
  CONNECTED = 'connected',
  FAILED = 'failed',
  DISCONNECTED = 'disconnected',
}

// Interface for BigQuery connection config
export interface BigQueryConfig {
  projectId: string;
  location?: string;
  scopes?: string[];
}

// Interface for BigQuery credentials
export interface BigQueryCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * BigQuery Service
 * Handles operations related to BigQuery connections
 */
export class BigQueryService {
  /**
   * Create a BigQuery connection
   * @param tenantId Tenant ID
   * @param name Connection name
   * @param credentialsFilePath Path to credentials file
   * @param config Additional configuration
   * @returns Connection ID
   */
  async createConnection(
    tenantId: string,
    name: string,
    credentialsFilePath: string,
    config?: BigQueryConfig
  ): Promise<string> {
    try {
      // Read credentials file
      const credentials = await readJsonFile(credentialsFilePath);
      
      // Validate credentials
      this.validateCredentials(credentials);
      
      // Encrypt credentials for storage
      const encryptedCredentials = encryptObject(credentials);
      
      // Store connection in database using Drizzle ORM
      const connection = await connectionsStorage.create({
        organisationId: tenantId,
        name,
        type: 'bigquery',
        status: ConnectionStatus.PENDING,
        credentialsPath: credentialsFilePath,
        credentialsEncrypted: encryptedCredentials,
        config: config || null,
      });
      
      return connection.id.toString();
    } catch (error: any) {
      console.error('Error creating BigQuery connection:', error);
      throw error instanceof ApiError ? error : ApiError.internal('Failed to create BigQuery connection');
    }
  }

  /**
   * Validate BigQuery connection
   * @param connectionId Connection ID
   * @returns Validation result
   */
  async validateConnection(connectionId: string): Promise<boolean> {
    try {
      // Get connection from database using Drizzle ORM
      const connectionRecord = await connectionsStorage.findById(connectionId);
      
      if (!connectionRecord) {
        throw ApiError.notFound('Connection not found');
      }
      
      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(connectionRecord.credentialsEncrypted);
      
      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials
      });
      
      // Test connection by listing datasets
      const result = await bigquery.getDatasets();
      console.log({result})
      
      // Update connection status using Drizzle ORM
      await connectionsStorage.updateStatus(connectionRecord.id, ConnectionStatus.CONNECTED);
      
      return true;
    } catch (error: any) {
      console.error('Error validating BigQuery connection:', error);
      
      // Update connection status to failed
      try {
        await connectionsStorage.updateStatus(connectionId, ConnectionStatus.FAILED);
      } catch (updateError) {
        console.error('Error updating connection status:', updateError);
      }
      
      return false;
    }
  }

  /**
   * List datasets in a BigQuery project
   * @param connectionId Connection ID
   * @returns List of datasets
   */
  async listDatasets(connectionId: string): Promise<any[]> {
    try {
      // Get connection from database using Drizzle ORM
      const connectionRecord = await connectionsStorage.findById(connectionId);
      
      if (!connectionRecord) {
        throw ApiError.notFound('Connection not found');
      }
      
      // Check connection status
      if (connectionRecord.status !== ConnectionStatus.CONNECTED) {
        throw ApiError.badRequest('Connection is not active');
      }
      
      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(connectionRecord.credentialsEncrypted);
      
      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials
      });
      
      let dataSetAccess = new Map<string, CombinedAccess | { error: string; hasAccess: boolean }>();
  
      // Get datasets
      const [datasets] = await bigquery.getDatasets();
      
      // Get project-level access information
      const projectAccess = await checkProjectAccess(bigquery);
      
      // Populate access info with enhanced checking
      await Promise.all(datasets.map(async (dataset) => {
        const datasetId = dataset.id || 'unknown';
        console.log(`\n\nAnalyzing access for dataset '${datasetId}':`);
        
        try {
          const [metadata] = await dataset.getMetadata();
          const accessEntries = metadata.access || [];
          
          // Analyze dataset-specific access
          const datasetAccess = analyzeAccess(accessEntries, credentials.client_email);
          
          // Combine with project-level access
          const combinedAccess = combineAccessInfo(datasetAccess, projectAccess);
          
          // Log detailed access information
          logAccessInfo(datasetId, combinedAccess);
          
          dataSetAccess.set(datasetId, combinedAccess);
          
        } catch (error) {
          console.error(`Error getting metadata for dataset ${datasetId}:`, error);
          dataSetAccess.set(datasetId, {
            error: 'Could not retrieve access information',
            hasAccess: false
          });
        }
      }));
      
      // Return enhanced dataset information
      return datasets.map(dataset => {
        const datasetId = dataset.id || 'unknown';
        const accessInfo = dataSetAccess.get(datasetId);
        
        return {
          id: datasetId,
          name: datasetId,
          location: dataset.metadata?.location,
          access: formatAccessResponse(accessInfo || { error: 'No access information available', hasAccess: false })
        };
      });
      
    } catch (error: any) {
      console.error('Error listing BigQuery datasets:', error);
      throw error instanceof ApiError ? error : ApiError.internal('Failed to list BigQuery datasets');
    }
  }

  /**
   * List tables in a BigQuery dataset
   * @param connectionId Connection ID
   * @param datasetId Dataset ID
   * @returns List of tables
   */
  async listTables(connectionId: string, datasetId: string): Promise<any[]> {
    try {
      // Get connection from database using Drizzle ORM
      const connectionRecord = await connectionsStorage.findById(connectionId);
      
      if (!connectionRecord) {
        throw ApiError.notFound('Connection not found');
      }
      
      // Check connection status
      if (connectionRecord.status !== ConnectionStatus.CONNECTED) {
        throw ApiError.badRequest('Connection is not active');
      }
      
      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(connectionRecord.credentialsEncrypted);
      
      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials
      });
      
      // Get dataset
      const dataset = bigquery.dataset(datasetId);
      
      // Get tables
      const [tables] = await dataset.getTables();
      
      // Return table information
      return tables.map(table => ({
        id: table.id,
        name: table.id,
        type: table.metadata.type
      }));
    } catch (error: any) {
      console.error('Error listing BigQuery tables:', error);
      throw error instanceof ApiError ? error : ApiError.internal('Failed to list BigQuery tables');
    }
  }

  /**
   * Get table schema
   * @param connectionId Connection ID
   * @param datasetId Dataset ID
   * @param tableId Table ID
   * @returns Table schema
   */
  async getTableSchema(connectionId: string, datasetId: string, tableId: string): Promise<any> {
    try {
      // Get connection from database using Drizzle ORM
      const connectionRecord = await connectionsStorage.findById(connectionId);
      
      if (!connectionRecord) {
        throw ApiError.notFound('Connection not found');
      }
      
      // Check connection status
      if (connectionRecord.status !== ConnectionStatus.CONNECTED) {
        throw ApiError.badRequest('Connection is not active');
      }
      
      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(connectionRecord.credentialsEncrypted);
      
      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials
      });
      
      // Get table
      const dataset = bigquery.dataset(datasetId);
      const table = dataset.table(tableId);
      
      // Get table metadata
      const [metadata] = await table.getMetadata();
            
      return metadata.schema;
    } catch (error: any) {
      console.error('Error getting BigQuery table schema:', error);
      throw error instanceof ApiError ? error : ApiError.internal('Failed to get BigQuery table schema');
    }
  }

  /**
   * Execute a query against BigQuery
   * @param connectionId Connection ID
   * @param queryString SQL query string
   * @param params Query parameters
   * @returns Query results
   */
  async executeQuery(connectionId: string, queryString: string, params?: any[]): Promise<any> {
    try {
      // Get connection from database using Drizzle ORM
      const connectionRecord = await connectionsStorage.findById(connectionId);
      
      if (!connectionRecord) {
        throw ApiError.notFound('Connection not found');
      }
      
      // Check connection status
      if (connectionRecord.status !== ConnectionStatus.CONNECTED) {
        throw ApiError.badRequest('Connection is not active');
      }
      
      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(connectionRecord.credentialsEncrypted);
      
      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials
      });
      
      // Execute query
      const options: any = {};
      
      if (params) {
        options.params = params;
      }
      
      const [rows] = await bigquery.query({
        query: queryString,
        ...options
      });
      
      return rows;
    } catch (error: any) {
      console.error('Error executing BigQuery query:', error);
      throw error instanceof ApiError ? error : ApiError.internal('Failed to execute BigQuery query');
    }
  }

  /**
   * Validate BigQuery credentials
   * @param credentials Credentials to validate
   */
  private validateCredentials(credentials: any): void {
    // Check required fields
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
      'auth_uri',
      'token_uri',
      'auth_provider_x509_cert_url',
      'client_x509_cert_url'
    ];
    
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw ApiError.badRequest(`Invalid credentials: missing ${field}`);
      }
    }
    
    // Check credential type
    if (credentials.type !== 'service_account') {
      throw ApiError.badRequest('Invalid credentials: must be a service account');
    }
  }
}

export default new BigQueryService();
