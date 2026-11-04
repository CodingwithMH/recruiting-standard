import { Router } from "express";
import {
  handleSchoolRegistration,
  handleListSchools,
  handleGetSchool,
  handleUpdateSchool,
  handleApproveSchool,
  handleRejectSchool,
  handleSuspendSchool,
  handleListMembers,
  handleAddMember,
  handleUpdateMember,
  handleRemoveMember,
} from "../controllers/school.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole, requireSchoolRole } from "../middleware/roles.js";
import { requireSchoolTenant } from "../middleware/tenant.js";
import { requireApprovedSchool } from "../middleware/schoolStatus.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

export const schoolRouter = Router();

// Public school intake route
schoolRouter.post("/register", authRateLimiter, handleSchoolRegistration);

// Platform Admin approval workflow
schoolRouter.get(
  "/",
  authenticateToken,
  requireGlobalRole("PLATFORM_ADMIN"),
  handleListSchools
);
schoolRouter.post(
  "/:id/approve",
  authenticateToken,
  requireGlobalRole("PLATFORM_ADMIN"),
  handleApproveSchool
);
schoolRouter.post(
  "/:id/reject",
  authenticateToken,
  requireGlobalRole("PLATFORM_ADMIN"),
  handleRejectSchool
);
schoolRouter.post(
  "/:id/suspend",
  authenticateToken,
  requireGlobalRole("PLATFORM_ADMIN"),
  handleSuspendSchool
);

// School profile (Platform Admin or an approved school member)
// Explicitly gate to school-affiliated roles; Athletes and Parents never have
// a schoolId so this is defence-in-depth rather than a critical fix.
schoolRouter.get(
  "/:id",
  authenticateToken,
  requireGlobalRole("PLATFORM_ADMIN", "SCHOOL_STAFF"),
  requireSchoolTenant,
  requireApprovedSchool,
  handleGetSchool
);
schoolRouter.patch(
  "/:id",
  authenticateToken,
  requireSchoolTenant,
  requireApprovedSchool,
  requireSchoolRole("SCHOOL_ADMIN"),
  handleUpdateSchool
);

// Authorized-user management (Platform Admin or the school's School Admin)
schoolRouter.get(
  "/:id/members",
  authenticateToken,
  requireSchoolTenant,
  requireApprovedSchool,
  requireSchoolRole("SCHOOL_ADMIN"),
  handleListMembers
);
schoolRouter.post(
  "/:id/members",
  authenticateToken,
  requireSchoolTenant,
  requireApprovedSchool,
  requireSchoolRole("SCHOOL_ADMIN"),
  handleAddMember
);
schoolRouter.patch(
  "/:id/members/:membershipId",
  authenticateToken,
  requireSchoolTenant,
  requireApprovedSchool,
  requireSchoolRole("SCHOOL_ADMIN"),
  handleUpdateMember
);
schoolRouter.delete(
  "/:id/members/:membershipId",
  authenticateToken,
  requireSchoolTenant,
  requireApprovedSchool,
  requireSchoolRole("SCHOOL_ADMIN"),
  handleRemoveMember
);

export default schoolRouter;
