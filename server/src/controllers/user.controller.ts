import { Request, Response, NextFunction } from "express";
import {
  UserManagementError,
  getUser,
  listUsers,
  sendUserPasswordReset,
  updateUser,
  updateUserSchema,
  userListQuerySchema,
} from "../services/user.service.js";

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function handleUserError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof UserManagementError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next(err);
}

export async function handleListUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = userListQuerySchema.safeParse({
      role:
        typeof req.query.role === "string"
          ? req.query.role.toUpperCase()
          : undefined,
      status:
        typeof req.query.status === "string"
          ? req.query.status.toUpperCase()
          : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
    });

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const users = await listUsers(parsed.data);

    res.status(200).json({
      success: true,
      data: users,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleUserError(err, res, next);
  }
}

export async function handleGetUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await getUser(getParam(req.params.id));

    res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleUserError(err, res, next);
  }
}

export async function handleUpdateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = await updateUser(getParam(req.params.id), parsed.data);

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleUserError(err, res, next);
  }
}

export async function handleSendUserPasswordReset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await sendUserPasswordReset(getParam(req.params.id));

    res.status(200).json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleUserError(err, res, next);
  }
}
