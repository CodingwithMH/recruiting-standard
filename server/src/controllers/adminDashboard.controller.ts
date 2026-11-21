import { Response, NextFunction } from "express";
import { getPlatformDashboard } from "../services/adminDashboard.service.js";

export async function handlePlatformDashboard(
  _req: unknown,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dashboard = await getPlatformDashboard();

    res.status(200).json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
