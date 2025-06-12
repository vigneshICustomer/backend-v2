import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import environment from '../config/environment';

/**
 * Convert error to ApiError if needed
 */
export const errorConverter = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = err;
  
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  
  next(error);
};

/**
 * Handle errors and send appropriate response
 */
export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  let { statusCode, message } = err;
  
  if (environment.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    status: 'error',
    message,
    ...(environment.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (environment.NODE_ENV === 'development') {
    console.error(err);
  }

  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Not found - ${req.originalUrl}`);
  next(error);
};

/**
 * Log errors for monitoring
 */
export const logError = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
  
  next(err);
};

/**
 * Handle async errors in routes
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler
 */
export const validationErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'ValidationError') {
    const errors: Record<string, string> = {};
    
    if (err.details) {
      // Joi validation error
      err.details.forEach((detail: any) => {
        errors[detail.path.join('.')] = detail.message;
      });
    } else if (err.errors) {
      // Mongoose validation error
      Object.keys(err.errors).forEach(key => {
        errors[key] = err.errors[key].message;
      });
    }
    
    const apiError = new ApiError(400, 'Validation Error');
    res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors,
    });
    return;
  }
  
  next(err);
};

/**
 * Database error handler
 */
export const databaseErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        const apiError = new ApiError(409, 'Resource already exists');
        return next(apiError);
      
      case '23503': // Foreign key violation
        const fkError = new ApiError(400, 'Referenced resource does not exist');
        return next(fkError);
      
      case '23502': // Not null violation
        const nullError = new ApiError(400, 'Required field is missing');
        return next(nullError);
      
      case 'ECONNREFUSED':
        const connError = new ApiError(503, 'Database connection failed');
        return next(connError);
      
      default:
        if (environment.NODE_ENV === 'development') {
          console.error('Database error:', err);
        }
        break;
    }
  }
  
  next(err);
};

/**
 * JWT error handler
 */
export const jwtErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'JsonWebTokenError') {
    const apiError = new ApiError(401, 'Invalid token');
    return next(apiError);
  }
  
  if (err.name === 'TokenExpiredError') {
    const apiError = new ApiError(401, 'Token expired');
    return next(apiError);
  }
  
  next(err);
};

/**
 * Rate limit error handler
 */
export const rateLimitErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.status === 429) {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later',
      retryAfter: err.retryAfter,
    });
    return;
  }
  
  next(err);
};
