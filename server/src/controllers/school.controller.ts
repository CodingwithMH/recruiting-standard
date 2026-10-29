import { Request, Response, NextFunction } from "express";
import {
  registerSchool,
  schoolRegistrationSchema,
  SchoolRegistrationError,
} from "../services/school.service.js";

/**
 * POST /api/v1/schools/register
 * Public intake endpoint to register a new school program and primary administrator.
 */
export async function handleSchoolRegistration(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = schoolRegistrationSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed. Please verify all required institutional fields.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await registerSchool(parsed.data);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof SchoolRegistrationError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next(err);
  }
}
