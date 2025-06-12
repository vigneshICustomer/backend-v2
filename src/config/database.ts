import { Client } from 'pg';
import { BigQuery } from '@google-cloud/bigquery';
import environment from './environment';

// Database connection configuration
const connectionConfig = {
  host: environment.DB_HOST,
  user: environment.DB_USER,
  password: environment.DB_PASSWORD,
  database: environment.DB_NAME,
  port: environment.DB_PORT,
  ssl: environment.NODE_ENV === 'development' ? {
    rejectUnauthorized: false,
  } : undefined,
};

// Create the original PostgreSQL connection
export const originalConnection = new Client(connectionConfig);

// BigQuery connections for different projects
export const zillaProdConnection = new BigQuery({
  keyFilename: './config/credentials/zilla.json',
  projectId: 'zilla-data-project'
});

export const reltioProdConnection = new BigQuery({
  keyFilename: './config/credentials/reltio.json',
  projectId: 'reltio-edw'
});

export const icustomerProdConnection = new BigQuery({
  keyFilename: './config/credentials/icustomer.json',
  projectId: 'icustomer-warahouse'
});

// For now, use only PostgreSQL connection
// BigQuery integration can be added later when needed
export const connection = originalConnection;

// OGraph database connection (if needed)
const oGraphConnectionConfig = {
  ...connectionConfig,
  database: environment.DB_NAME + '_ograph' // Assuming ograph database naming convention
};

// export const oGraphConnection = new Client(oGraphConnectionConfig);

// Initialize database connections
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Connect to main PostgreSQL database
    await connection.connect();
    console.log(`Connected to ${environment.NODE_ENV} database`);
    
    // Connect to OGraph database
    // try {
    //   await oGraphConnection.connect();
    //   console.log(`Connected to ${environment.NODE_ENV} OGraph database`);
    // } catch (oGraphError) {
    //   console.warn('OGraph database connection failed:', oGraphError);
    //   // OGraph connection is optional, so we don't throw here
    // }
    
  } catch (error) {
    console.error('Database connection error:', error);
    console.warn('⚠️  Server will start without database connection');
    console.warn('⚠️  Please update database credentials in .env file');
    // Don't throw error to allow server to start for demonstration
  }
};

// Graceful shutdown
// export const closeDatabase = async (): Promise<void> => {
//   try {
//     await originalConnection.end();
//     await oGraphConnection.end();
//     console.log('Database connections closed');
//   } catch (error) {
//     console.error('Error closing database connections:', error);
//   }
// };

// Database health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await connection.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Transaction helper
export const withTransaction = async <T>(
  callback: (client: Client) => Promise<T>
): Promise<T> => {
  const client = new Client(connectionConfig);
  await client.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
};

export default connection;
