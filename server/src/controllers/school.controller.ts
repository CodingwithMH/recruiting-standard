import { Request, Response, NextFunction } from "express";
import {
  registerSchool,
  schoolRegistrationSchema,
  schoolProfileUpdateSchema,
  schoolListQuerySchema,
  addSchoolMemberSchema,
  updateSchoolMemberSchema,
  listSchools,
  getSchoolProfile,
  updateSchoolProfile,
  approveSchool,
  rejectSchool,
  suspendSchool,
  listSchoolMembers,
  addSchoolMember,
  updateSchoolMember,
  removeSchoolMember,
  SchoolRegistrationError,
} from "../services/school.service.js";
import type { AuthenticatedRequest } from "../types/index.js";

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function sendValidationError(
  res: Response,
  details: Record<string, string[] | undefined>
): void {
  res.status(400).json({
    success: false,
    error: "Validation failed. Please verify all required fields.",
    details,
    timestamp: new Date().toISOString(),
  });
}

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

/**
 * GET /api/v1/schools
 * Platform Admin only. Optional `?status=PENDING|APPROVED|SUSPENDED|REJECTED`.
 */
export async function handleListSchools(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = schoolListQuerySchema.safeParse({
      status:
        typeof req.query.status === "string"
          ? req.query.status.toUpperCase()
          : undefined,
    });

    if (!parsed.success) {
      sendValidationError(res, parsed.error.flatten().fieldErrors);
      return;
    }

    const schools = await listSchools(parsed.data.status);

    res.status(200).json({
      success: true,
      data: schools,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/schools/:id
 * Platform Admin or a member of the school.
 */
export async function handleGetSchool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const school = await getSchoolProfile(getParam(req.params.id));

    res.status(200).json({
      success: true,
      data: school,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/schools/:id
 * Platform Admin or the school's School Admin.
 */
export async function handleUpdateSchool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = schoolProfileUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.flatten().fieldErrors);
      return;
    }

    const school = await updateSchoolProfile(getParam(req.params.id), parsed.data);

    res.status(200).json({
      success: true,
      message: "School profile updated successfully",
      data: school,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/schools/:id/approve
 * Platform Admin only. Issues the permanent School ID on first approval.
 */
export async function handleApproveSchool(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const school = await approveSchool(getParam(req.params.id), req.user.userId);

    res.status(200).json({
      success: true,
      message: "School approved. A permanent School ID has been issued.",
      data: school,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/schools/:id/reject
 * Platform Admin only. Rejects a pending registration without issuing an ID.
 */
export async function handleRejectSchool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const school = await rejectSchool(getParam(req.params.id));

    res.status(200).json({
      success: true,
      message: "School registration rejected.",
      data: school,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/schools/:id/suspend
 * Platform Admin only. Blocks portal access while preserving the School ID.
 */
export async function handleSuspendSchool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const school = await suspendSchool(getParam(req.params.id));

    res.status(200).json({
      success: true,
      message: "School suspended. Portal access is now blocked.",
      data: school,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/schools/:id/members
 * Platform Admin or the school's School Admin.
 */
export async function handleListMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const members = await listSchoolMembers(getParam(req.params.id));

    res.status(200).json({
      success: true,
      data: members,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/schools/:id/members
 * Adds/invites a coach or School Admin to the school.
 */
export async function handleAddMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = addSchoolMemberSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.flatten().fieldErrors);
      return;
    }

    const result = await addSchoolMember(getParam(req.params.id), parsed.data);

    res.status(201).json({
      success: true,
      message: result.invited
        ? "Member added. A password setup email has been sent."
        : "Member added successfully.",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/schools/:id/members/:membershipId
 * Updates a membership's role or title.
 */
export async function handleUpdateMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = updateSchoolMemberSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.flatten().fieldErrors);
      return;
    }

    const member = await updateSchoolMember(
      getParam(req.params.id),
      getParam(req.params.membershipId),
      parsed.data
    );

    res.status(200).json({
      success: true,
      message: "Membership updated successfully",
      data: member,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/schools/:id/members/:membershipId
 * Revokes a membership.
 */
export async function handleRemoveMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const membership = await removeSchoolMember(
      getParam(req.params.id),
      getParam(req.params.membershipId)
    );

    res.status(200).json({
      success: true,
      message: "Member removed from the school.",
      data: membership,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
