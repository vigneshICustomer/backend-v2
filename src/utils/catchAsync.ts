import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper function to catch async errors and pass them to error handling middleware
 * @param fn - Async function to wrap
 * @returns Express middleware function
 */
const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};

export default catchAsync;
