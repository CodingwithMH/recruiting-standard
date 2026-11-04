import { Router } from "express";
import {
  handleSearchAthletes,
  handleListProspects,
  handleSaveProspect,
  handleUpdateProspectNotes,
  handleRemoveProspect,
  handleListRecruitingRecords,
  handleGetRecruitingRecord,
  handleUpdateRecruitingRecord,
} from "../controllers/coach.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole, requireSchoolRole } from "../middleware/roles.js";
import { requireSchoolTenant } from "../middleware/tenant.js";
import { requireApprovedSchool } from "../middleware/schoolStatus.js";

export const coachRouter = Router();

// All coach routes require: authenticated + SCHOOL_STAFF + approved school + tenant isolation
coachRouter.use(
  authenticateToken,
  requireGlobalRole("PLATFORM_ADMIN", "SCHOOL_STAFF"),
  requireSchoolTenant,
  requireApprovedSchool,
  requireSchoolRole("SCHOOL_ADMIN", "COACH_RECRUITER")
);

// Athlete search — search approved athletes across the platform
coachRouter.get("/athletes", handleSearchAthletes);

// Saved prospects — coach's personal watch list within their school
coachRouter.get("/prospects", handleListProspects);
coachRouter.post("/prospects", handleSaveProspect);
coachRouter.patch("/prospects/:prospectId", handleUpdateProspectNotes);
coachRouter.delete("/prospects/:prospectId", handleRemoveProspect);

// Recruiting records — school-level records per athlete
coachRouter.get("/records", handleListRecruitingRecords);
coachRouter.get("/records/:athleteProfileId", handleGetRecruitingRecord);
coachRouter.patch("/records/:recordId", handleUpdateRecruitingRecord);

export default coachRouter;
