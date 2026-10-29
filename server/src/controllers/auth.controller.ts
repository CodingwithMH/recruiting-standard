import { Request, Response, NextFunction } from "express";
import {
  registerUser,
  registerSchema,
  loginUser,
  loginSchema,
  getMe,
  AuthError,
} from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../types/index.js";

/**
 * POST /api/v1/auth/register
 * Creates a new user account.
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await registerUser(parsed.data);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof AuthError) {
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

/**
 * POST /api/v1/auth/login
 * Authenticates a user and returns a JWT session token.
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await loginUser(parsed.data);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof AuthError) {
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

/**
 * GET /api/v1/auth/me
 * Returns the current authenticated user's profile.
 * Requires a valid JWT in the Authorization header.
 */
export async function me(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = await getMe(req.user.userId);

    res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof AuthError) {
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
