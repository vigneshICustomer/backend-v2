import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import environment from '../config/environment';
import connection from '../config/database';
import { accountLockingTable, usersTable } from '../config/tableConfig';

/**
 * General rate limiter for API endpoints
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: environment.RATE_LIMIT_COUNT, // Limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password reset rate limiter
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    status: 'error',
    message: 'Too many password reset attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Account locking middleware for failed login attempts
 */
export const checkAccountLocking = async (req: Request, res: Response, next: any): Promise<void> => {
  const ip = getClientIP(req);
  
  try {
    // Check if IP is currently locked
    const lockQuery = `
      SELECT * FROM ${accountLockingTable.schemaTableName}
      WHERE ${accountLockingTable.ip} = $1
      AND ${accountLockingTable.timestamp} > NOW() - INTERVAL '24 hours'
    `;
    
    const lockResult = await connection.query(lockQuery, [ip]);
    
    if (lockResult.rows.length > 0) {
      const lockRecord = lockResult.rows[0];
      
      if (lockRecord.tries >= 5) {
        res.status(429).json({
          status: 'error',
          message: 'Too many failed login attempts. Account temporarily locked.',
        });
        return;
      }
    }
    
    next();
  } catch (error) {
    console.error('Account locking check error:', error);
    next(); // Continue on error to not block legitimate requests
  }
};

/**
 * Record failed login attempt
 */
export const recordFailedLogin = async (ip: string): Promise<void> => {
  try {
    // Check if record exists for this IP
    const existingQuery = `
      SELECT * FROM ${accountLockingTable.schemaTableName}
      WHERE ${accountLockingTable.ip} = $1
      AND ${accountLockingTable.timestamp} > NOW() - INTERVAL '24 hours'
    `;
    
    const existingResult = await connection.query(existingQuery, [ip]);
    
    if (existingResult.rows.length > 0) {
      // Update existing record
      const updateQuery = `
        UPDATE ${accountLockingTable.schemaTableName}
        SET ${accountLockingTable.tries} = ${accountLockingTable.tries} + 1,
            ${accountLockingTable.timestamp} = NOW()
        WHERE ${accountLockingTable.ip} = $1
      `;
      
      await connection.query(updateQuery, [ip]);
    } else {
      // Create new record
      const insertQuery = `
        INSERT INTO ${accountLockingTable.schemaTableName}
        (${accountLockingTable.ip}, ${accountLockingTable.tries}, ${accountLockingTable.timestamp})
        VALUES ($1, 1, NOW())
      `;
      
      await connection.query(insertQuery, [ip]);
    }
  } catch (error) {
    console.error('Failed to record login attempt:', error);
  }
};

/**
 * Clear failed login attempts for successful login
 */
export const clearFailedLogins = async (ip: string): Promise<void> => {
  try {
    const deleteQuery = `
      DELETE FROM ${accountLockingTable.schemaTableName}
      WHERE ${accountLockingTable.ip} = $1
    `;
    
    await connection.query(deleteQuery, [ip]);
  } catch (error) {
    console.error('Failed to clear login attempts:', error);
  }
};

/**
 * User-specific rate limiting based on requests_made field
 */
export const checkUserRequestLimit = async (req: Request, res: Response, next: any) => {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }
  
  try {
    const userQuery = `
      SELECT ${usersTable.requests_made} 
      FROM ${usersTable.schemaTableName} 
      WHERE ${usersTable.email} = $1
    `;
    
    const userResult = await connection.query(userQuery, [email]);
    
    if (userResult.rows.length > 0) {
      const requestsMade = userResult.rows[0].requests_made || 0;
      
      if (requestsMade > 5) {
        return res.status(429).json({
          status: 'error',
          message: 'Too Many Requests! Come again in 24 hours!',
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('User request limit check error:', error);
    next(); // Continue on error
  }
};

/**
 * Increment user request count
 */
export const incrementUserRequests = async (email: string): Promise<void> => {
  try {
    const updateQuery = `
      UPDATE ${usersTable.schemaTableName}
      SET ${usersTable.requests_made} = COALESCE(${usersTable.requests_made}, 0) + 1
      WHERE ${usersTable.email} = $1
    `;
    
    await connection.query(updateQuery, [email]);
  } catch (error) {
    console.error('Failed to increment user requests:', error);
  }
};

/**
 * Reset user request count (for successful operations)
 */
export const resetUserRequests = async (email: string): Promise<void> => {
  try {
    const updateQuery = `
      UPDATE ${usersTable.schemaTableName}
      SET ${usersTable.requests_made} = 0
      WHERE ${usersTable.email} = $1
    `;
    
    await connection.query(updateQuery, [email]);
  } catch (error) {
    console.error('Failed to reset user requests:', error);
  }
};

/**
 * Get client IP address helper
 */
export const getClientIP = (req: Request): string => {
  const defaultIP = "0.0.0.0";
  return (
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.headers["cf-connecting-ip"] ||
    req.socket.remoteAddress ||
    defaultIP
  ) as string;
};


/**
 * Get API key middleware for enrichment endpoints
 */
export const getAPIkey = async (req: any, res: Response, next: any): Promise<void> => {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
      return;
    }

    // Get API key from user_auth table
    const query = `
      SELECT oauth_token 
      FROM copilot_api.user_auth 
      WHERE user_id = $1
    `;
    
    const result = await connection.query(query, [user_id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'API key not found for user'
      });
      return;
    }
    
    req.apiKey = result.rows[0].oauth_token;
    next();
  } catch (error) {
    console.error('API key retrieval error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving API key'
    });
  }
};

/**
 * API endpoint specific rate limiters
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit file uploads
  message: {
    status: 'error',
    message: 'Too many file uploads, please try again later.',
  },
});

export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit search requests
  message: {
    status: 'error',
    message: 'Too many search requests, please try again later.',
  },
});

export const emailRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit email sending
  message: {
    status: 'error',
    message: 'Too many email requests, please try again later.',
  },
});
