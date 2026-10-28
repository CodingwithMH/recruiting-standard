import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger, c } from "./utils/logger.js";

async function startServer() {
  try {
    // 1. Verify Database Connection
    try {
      await prisma.$connect();
      logger.info(
        "DB",
        `✅ ${c.brightCyan("Neon PostgreSQL")} database connection verified via ${c.green("Prisma ORM")}`
      );
      logger.info(
        "DB",
        `✅ ${c.green("Prisma models")} synchronized successfully with database`
      );
    } catch (dbError: unknown) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      logger.warn("DB", `⚠️ Database connection not ready: ${c.yellow(msg)}`);
      logger.warn(
        "DB",
        `⚠️ Running in ${c.yellow("preview/offline mode")}. Database features will be limited.`
      );
    }

    // 2. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      logger.info(
        "APP",
        `🚀 ${c.bold(c.brightWhite("MVP 4.18 API Server"))} running on port ${c.bold(c.brightGreen(env.PORT))}`
      );
      logger.info("APP", `   ${c.cyan("Environment")} : ${c.brightYellow(env.NODE_ENV)}`);
      logger.info("APP", `   ${c.cyan("CORS Origin")} : ${c.white(env.CLIENT_ORIGIN)}`);
      logger.info("APP", `   ${c.cyan("ORM Engine")}  : ${c.green("Prisma ORM")}`);
      logger.info(
        "APP",
        `   ${c.cyan("Health Check")}: ${c.white(`http://localhost:${env.PORT}/health`)}`
      );
      logger.info(
        "APP",
        `   ${c.cyan("Auth Routes")} : ${c.white(`http://localhost:${env.PORT}/api/v1/auth`)}`
      );
      logger.info(
        "APP",
        `   ${c.cyan("API Base")}    : ${c.white(`http://localhost:${env.PORT}/api/v1`)}`
      );
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.error(
          "APP",
          `Port ${c.bold(env.PORT)} is already in use. Please terminate existing process.`
        );
        process.exit(1);
      } else {
        logger.error("APP", `Server error: ${err.message}`);
      }
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info("APP", `Received ${c.yellow(signal)}. Initiating graceful shutdown.`);
      server.close(async () => {
        try {
          await prisma.$disconnect();
          logger.info("DB", "Prisma database client disconnected successfully.");
        } catch (err: unknown) {
          logger.error("DB", `Error disconnecting Prisma: ${err}`);
        }
        process.exit(0);
      });

      setTimeout(() => {
        logger.error("APP", "Forced shutdown initiated due to termination timeout.");
        process.exit(1);
      }, 5000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("APP", `Fatal server startup error: ${errorMsg}`);
    process.exit(1);
  }
}

startServer();
