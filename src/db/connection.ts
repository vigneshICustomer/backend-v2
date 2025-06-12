import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import environment from '../config/environment';

// Create connection pool with proper configuration
const pool = new Pool({
  host: environment.DB_HOST,
  port: environment.DB_PORT,
  user: environment.DB_USER,
  password: environment.DB_PASSWORD,
  database: environment.DB_NAME,
  
  // Connection pool configuration to prevent "connection exceeded" errors
  max: 20,                    // Maximum connections in pool
  min: 2,                     // Minimum connections to maintain
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout for new connections
  maxUses: 7500,              // Retire connections after 7500 uses
  
  // Additional safety settings
  allowExitOnIdle: true,
  
  // SSL configuration for production
  ssl: { rejectUnauthorized: false } 
});

// Create Drizzle instance with the pool
export const db = drizzle(pool);

// Connection pool monitoring
pool.on('connect', (client) => {
  console.log('New database client connected');
});

pool.on('error', (err, client) => {
  console.error('Database pool error:', err);
});

pool.on('remove', (client) => {
  console.log('Database client removed from pool');
});

// Health check function
export const checkDatabaseHealth = async () => {
  try {
    const result = await pool.query('SELECT 1 as health_check');
    return { 
      status: 'healthy', 
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down database pool...');
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Export pool for direct access if needed
export { pool };
