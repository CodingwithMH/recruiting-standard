import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  let dbStatus = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "unavailable (local preview mode)";
  }

  res.status(200).json({
    success: true,
    message: "MVP 4.18 API is operational",
    service: "mvp-418-server",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    version: "1.0.0",
  });
});

export default router;
