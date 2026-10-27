import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface CustomError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (env.NODE_ENV !== "test") {
    logger.error("APP", `Error ${statusCode}: ${message}`, err.stack || err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV === "development" ? { stack: err.stack, details: err.details } : {}),
    timestamp: new Date().toISOString(),
  });
};
