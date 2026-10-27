import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { logger, c } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { standardRateLimiter } from "./middleware/rateLimiter.js";
import healthRouter from "./routes/health.routes.js";
import apiRouter from "./routes/index.js";

const app: Application = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: [env.CLIENT_ORIGIN, "http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (env.NODE_ENV !== "test") {
  app.use(
    morgan(
      (tokens, req, res) => {
        const status = tokens.status(req, res) || "200";
        const method = tokens.method(req, res) || "GET";
        const url = tokens.url(req, res) || "/";
        const responseTime = tokens["response-time"](req, res) || "0";
        const contentLength = tokens.res(req, res, "content-length") || "-";

        let statusColor = c.brightGreen;
        const statusCode = parseInt(status, 10);
        if (statusCode >= 500) {
          statusColor = c.brightRed;
        } else if (statusCode >= 400) {
          statusColor = c.brightYellow;
        } else if (statusCode >= 300) {
          statusColor = c.cyan;
        }

        return `${c.bold(c.brightCyan(method))} ${url} ${statusColor(status)} ${c.gray(`${contentLength} - ${responseTime} ms`)}`;
      },
      {
        stream: {
          write: (message: string) => logger.info("HTTP", message.trim()),
        },
      }
    )
  );
}

// Global rate limiting
app.use("/api", standardRateLimiter);

// Health check and root API routing
app.use("/health", healthRouter);
app.use("/api/v1", apiRouter);

// Root fallback handler
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    service: "The Recruiting Standard Backend API",
    status: "healthy",
    docs: "/api/v1/health",
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handling
app.use(errorHandler);

export default app;
