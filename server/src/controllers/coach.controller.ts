import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  CoachError,
  athleteSearchQuerySchema,
  saveProspectSchema,
  updateProspectNotesSchema,
  updateRecruitingRecordSchema,
  searchAthletes,
  listProspects,
  saveProspect,
  updateProspectNotes,
  removeProspect,
  getOrCreateRecruitingRecord,
  listRecruitingRecords,
  updateRecruitingRecord,
  deleteRecruitingRecord,
} from "../services/coach.service.js";

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function handleCoachError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof CoachError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next(err);
}

// ---------------------------------------------------------------------------
// Athlete search
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/coach/athletes
 * Search APPROVED athletes only. All filters are optional query parameters:
 *   sport, graduationYear, position, location, search, page, limit
 */
export async function handleSearchAthletes(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = athleteSearchQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await searchAthletes(parsed.data);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleCoachError(err, res, next);
  }
}

// ---------------------------------------------------------------------------
// Prospects
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/coach/prospects
 * List the calling coach's saved prospects for their school.
 */
export async function handleListProspects(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.schoolId) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const prospects = await listProspects(req.schoolId, req.user.userId);

    res.status(200).json({
      success: true,
      data: prospects,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleCoachError(err, res, next);
  }
}

/**
 * POST /api/v1/coach/prospects
 * Save an athlete as a prospect for the calling coach's school.
 */
export async function handleSaveProspect(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.schoolId) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const parsed = saveProspectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const prospect = await saveProspect(
      req.schoolId,
      req.user.userId,
      parsed.data
    );

    res.status(201).json({
      success: true,
      message: "Athlete saved as prospect.",
      data: prospect,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleCoachError(err, res, next);
  }
}

/**
 * PATCH /api/v1/coach/prospects/:prospectId
 * Update the private notes on a saved prospect.
 */
export async function handleUpdateProspectNotes(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.schoolId) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const parsed = updateProspectNotesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const prospect = await updateProspectNotes(
      req.schoolId,
      req.user.userId,
      getParam(req.params.prospectId),
      parsed.data
    );

    res.status(200).json({
      success: true,
      message: "Prospect notes updated.",
      data: prospect,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleCoachError(err, res, next);
  }
}

/**
 * DELETE /api/v1/coach/prospects/:prospectId
 * Remove a saved prospect (coach's own record only).
 */
export async function handleRemoveProspect(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.schoolId) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await removeProspect(
      req.schoolId,
      req.user.userId,
      getParam(req.params.prospectId)
    );

    res.status(200).json({
      success: true,
      message: "Prospect removed.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleCoachError(err, res, next);
  }
}

// ---------------------------------------------------------------------------
// Recruiting records
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/coach/records
 * List all recruiting records for the calling coach's school.
 * Optional ?status=EVALUATING|CONTACTED|OFFERED|COMMITTED|PASSED
 */
export async function handleListRecruitingRecords(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.schoolId) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const statusFilter =
      typeof req.query.status === "string"
        ? req.query.status.toUpperCase()
        : undefined;

    const records = await listRecruitingRecords(req.schoolId, statusFilter);

    res.status(200).json({
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleCoachError(err, res, next);
  }
}

/**
 * GET /api/v1/coach/records/:athleteProfileId
 * Get (or lazily create) the recruiting record for one athlete within the school.
 */
export async function handleGetRecruitingRecord(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.schoolId) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const record = await getOrCreateRecruitingRecord(
      req.schoolId,
      getParam(req.params.athleteProfileId)
    );

    res.status(200).json({
      success: true,
      data: record,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleCoachError(err, res, next);
  }
}

/**
 * PATCH /api/v1/coach/records/:recordId
 * Update status, private notes, contact logs, offers, or commitments on a record.
 * Private notes are NEVER returned to the athlete or other schools.
 */
export async function handleUpdateRecruitingRecord(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.schoolId) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const parsed = updateRecruitingRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const record = await updateRecruitingRecord(
      req.schoolId,
      getParam(req.params.recordId),
      parsed.data
    );

    res.status(200).json({
      success: true,
      message: "Recruiting record updated.",
      data: record,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleCoachError(err, res, next);
  }
}

/**
 * DELETE /api/v1/coach/records/:recordId
 * Remove an athlete from the school's recruiting records board.
 */
export async function handleDeleteRecruitingRecord(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.schoolId) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await deleteRecruitingRecord(req.schoolId, getParam(req.params.recordId));

    res.status(200).json({
      success: true,
      message: "Recruiting record removed.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleCoachError(err, res, next);
  }
}

