import { BigQuery, Dataset, Table } from "@google-cloud/bigquery";
import fs from "fs";
import path from "path";
import { readJsonFile } from "../utils/fileUpload";
import { encryptObject, decryptObject } from "../utils/encryption";
import { connectionsStorage } from "../storage/connectionsStorage";
import ApiError from "../utils/ApiError";
import {
  analyzeAccess,
  checkProjectAccess,
  combineAccessInfo,
  logAccessInfo,
  formatAccessResponse,
  CombinedAccess,
} from "../utils/bigquery.helper";

// Connection types
export enum ConnectionStatus {
  PENDING = "pending",
  CONNECTED = "connected",
  FAILED = "failed",
  DISCONNECTED = "disconnected",
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
        type: "bigquery",
        status: ConnectionStatus.PENDING,
        credentialsPath: credentialsFilePath,
        credentialsEncrypted: encryptedCredentials,
        config: config || null,
      });

      return connection.id.toString();
    } catch (error: any) {
      console.error("Error creating BigQuery connection:", error);
      throw error instanceof ApiError
        ? error
        : ApiError.internal("Failed to create BigQuery connection");
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
        throw ApiError.notFound("Connection not found");
      }

      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(
        connectionRecord.credentialsEncrypted
      );

      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials,
      });

      // Test connection by listing datasets
      const result = await bigquery.getDatasets();
      console.log({ result });

      // Update connection status using Drizzle ORM
      await connectionsStorage.updateStatus(
        connectionRecord.id,
        ConnectionStatus.CONNECTED
      );

      return true;
    } catch (error: any) {
      console.error("Error validating BigQuery connection:", error);

      // Update connection status to failed
      try {
        await connectionsStorage.updateStatus(
          connectionId,
          ConnectionStatus.FAILED
        );
      } catch (updateError) {
        console.error("Error updating connection status:", updateError);
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
        throw ApiError.notFound("Connection not found");
      }

      // Check connection status
      if (connectionRecord.status !== ConnectionStatus.CONNECTED) {
        throw ApiError.badRequest("Connection is not active");
      }

      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(
        connectionRecord.credentialsEncrypted
      );

      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials,
      });

      let dataSetAccess = new Map<
        string,
        CombinedAccess | { error: string; hasAccess: boolean }
      >();

      // Get datasets
      const [datasets] = await bigquery.getDatasets();

      // Get project-level access information
      const projectAccess = await checkProjectAccess(bigquery);

      // Populate access info with enhanced checking
      await Promise.all(
        datasets.map(async (dataset) => {
          const datasetId = dataset.id || "unknown";
          console.log(`\n\nAnalyzing access for dataset '${datasetId}':`);

          try {
            const [metadata] = await dataset.getMetadata();
            const accessEntries = metadata.access || [];

            // Analyze dataset-specific access
            const datasetAccess = analyzeAccess(
              accessEntries,
              credentials.client_email
            );

            // Combine with project-level access
            const combinedAccess = combineAccessInfo(
              datasetAccess,
              projectAccess
            );

            // Log detailed access information
            logAccessInfo(datasetId, combinedAccess);

            dataSetAccess.set(datasetId, combinedAccess);
          } catch (error) {
            console.error(
              `Error getting metadata for dataset ${datasetId}:`,
              error
            );
            dataSetAccess.set(datasetId, {
              error: "Could not retrieve access information",
              hasAccess: false,
            });
          }
        })
      );

      // Return enhanced dataset information
      return datasets.map((dataset) => {
        const datasetId = dataset.id || "unknown";
        const accessInfo = dataSetAccess.get(datasetId);

        return {
          id: datasetId,
          name: datasetId,
          location: dataset.metadata?.location,
          access: formatAccessResponse(
            accessInfo || {
              error: "No access information available",
              hasAccess: false,
            }
          ),
        };
      });
    } catch (error: any) {
      console.error("Error listing BigQuery datasets:", error);
      throw error instanceof ApiError
        ? error
        : ApiError.internal("Failed to list BigQuery datasets");
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
        throw ApiError.notFound("Connection not found");
      }

      // Check connection status
      if (connectionRecord.status !== ConnectionStatus.CONNECTED) {
        throw ApiError.badRequest("Connection is not active");
      }

      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(
        connectionRecord.credentialsEncrypted
      );

      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials,
      });

      // Get dataset
      const dataset = bigquery.dataset(datasetId);

      // Get tables
      const [tables] = await dataset.getTables();

      // Return table information
      return tables.map((table) => ({
        id: table.id,
        name: table.id,
        type: table.metadata.type,
      }));
    } catch (error: any) {
      console.error("Error listing BigQuery tables:", error);
      throw error instanceof ApiError
        ? error
        : ApiError.internal("Failed to list BigQuery tables");
    }
  }

  /**
   * Get table schema
   * @param connectionId Connection ID
   * @param datasetId Dataset ID
   * @param tableId Table ID
   * @returns Table schema
   */
  async getTableSchema(
    connectionId: string,
    datasetId: string,
    tableId: string
  ): Promise<any> {
    try {
      // Get connection from database using Drizzle ORM
      const connectionRecord = await connectionsStorage.findById(connectionId);

      if (!connectionRecord) {
        throw ApiError.notFound("Connection not found");
      }

      // Check connection status
      if (connectionRecord.status !== ConnectionStatus.CONNECTED) {
        throw ApiError.badRequest("Connection is not active");
      }

      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(
        connectionRecord.credentialsEncrypted
      );

      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials,
      });

      // Get table
      const dataset = bigquery.dataset(datasetId);
      const table = dataset.table(tableId);

      // Get table metadata
      const [metadata] = await table.getMetadata();

      return metadata.schema;
    } catch (error: any) {
      console.error("Error getting BigQuery table schema:", error);
      throw error instanceof ApiError
        ? error
        : ApiError.internal("Failed to get BigQuery table schema");
    }
  }

  /**
   * Get schemas from specific datasets (e.g., unified_account, unified_contact)
   * @param connectionId Connection ID
   * @param datasetNames Array of dataset names to fetch schemas from
   * @param tableNames Optional array of specific table names to filter
   * @returns Schemas from specified datasets
   */
  async getSchemasFromDatasets(connectionId: string, datasetNames: string[], tableNames?: string[]): Promise<any> {
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
      
      const result: any = {
        projectId: credentials.project_id,
        datasets: []
      };
      
      // Process each specified dataset
      for (const datasetName of datasetNames) {
        try {
          // Get the specific dataset
          const dataset = bigquery.dataset(datasetName);
          
          // Check if dataset exists by trying to get its metadata
          const [datasetMetadata] = await dataset.getMetadata();
          
          // Get tables in this dataset
          const [tables] = await dataset.getTables();
          
          const datasetInfo: any = {
            id: datasetName,
            name: datasetName,
            location: datasetMetadata.location,
            description: datasetMetadata.description || null,
            tables: []
          };
          
          // Process each table in the dataset
          for (const table of tables) {
            const tableId = table.id || 'unknown';
            
            // If tableNames is specified, only process those tables
            if (tableNames && tableNames.length > 0 && !tableNames.includes(tableId)) {
              continue;
            }
            
            try {
              // Get table metadata and schema
              const [metadata] = await table.getMetadata();
              
              const tableInfo = {
                id: tableId,
                name: tableId,
                type: metadata.type,
                schema: {
                  fields: metadata.schema?.fields || []
                },
                description: metadata.description || null,
                creationTime: metadata.creationTime || null,
                lastModifiedTime: metadata.lastModifiedTime || null,
                numRows: metadata.numRows || null,
                numBytes: metadata.numBytes || null,
                labels: metadata.labels || {}
              };
              
              datasetInfo.tables.push(tableInfo);
            } catch (tableError) {
              console.error(`Error getting schema for table ${datasetName}.${tableId}:`, tableError);
              // Add table with error info
              datasetInfo.tables.push({
                id: tableId,
                name: tableId,
                error: 'Could not retrieve table schema',
                hasAccess: false
              });
            }
          }
          
          result.datasets.push(datasetInfo);
        } catch (datasetError) {
          console.error(`Error processing dataset ${datasetName}:`, datasetError);
          // Add dataset with error info
          result.datasets.push({
            id: datasetName,
            name: datasetName,
            error: `Dataset '${datasetName}' not found or access denied`,
            hasAccess: false,
            tables: []
          });
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('Error getting schemas from specified datasets:', error);
      throw error instanceof ApiError ? error : ApiError.internal('Failed to get schemas from specified datasets');
    }
  }

  /**
   * Execute a query against BigQuery
   * @param connectionId Connection ID
   * @param queryString SQL query string
   * @param params Query parameters
   * @returns Query results
   */
  async executeQuery(
    connectionId: string,
    queryString: string,
    params?: any[]
  ): Promise<any> {
    try {
      // Get connection from database using Drizzle ORM
      const connectionRecord = await connectionsStorage.findById(connectionId);

      if (!connectionRecord) {
        throw ApiError.notFound("Connection not found");
      }

      // Check connection status
      if (connectionRecord.status !== ConnectionStatus.CONNECTED) {
        throw ApiError.badRequest("Connection is not active");
      }

      // Decrypt credentials
      const credentials = decryptObject<BigQueryCredentials>(
        connectionRecord.credentialsEncrypted
      );

      const resolvedQuery = queryString.replace(
        /{project}/g,
        credentials.project_id
      );

      // Create BigQuery client
      const bigquery = new BigQuery({
        projectId: credentials.project_id,
        credentials,
      });

      // Execute query
      const options: any = {};

      if (params) {
        options.params = params;
      }

      console.log(resolvedQuery);
      const [rows] = await bigquery.query({
        query: resolvedQuery,
        ...options,
      });

      return rows;
    } catch (error: any) {
      console.error("Error executing BigQuery query:", error);
      throw error instanceof ApiError
        ? error
        : ApiError.internal("Failed to execute BigQuery query");
    }
  }

  /**
   * Validate BigQuery credentials
   * @param credentials Credentials to validate
   */
  private validateCredentials(credentials: any): void {
    // Check required fields
    const requiredFields = [
      "type",
      "project_id",
      "private_key_id",
      "private_key",
      "client_email",
      "client_id",
      "auth_uri",
      "token_uri",
      "auth_provider_x509_cert_url",
      "client_x509_cert_url",
    ];

    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw ApiError.badRequest(`Invalid credentials: missing ${field}`);
      }
    }

    // Check credential type
    if (credentials.type !== "service_account") {
      throw ApiError.badRequest(
        "Invalid credentials: must be a service account"
      );
    }
  }
}

export default new BigQueryService();
