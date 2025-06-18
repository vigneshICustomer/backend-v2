import { Request, Response, NextFunction } from "express";
import logger from "@/utils/logger";

export const printRequests = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user?.user_id || "unknown";

  logger.info("Incoming request", {
    method: req.method,
    path: req.path,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId,
    timestamp: new Date().toISOString(),
  });

  next();
};
