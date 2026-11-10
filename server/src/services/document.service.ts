import { Prisma } from "@prisma/client";
import type {
  DocumentStatus,
  GlobalRole,
  SchoolStatus,
  VerificationStatus,
} from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import { evaluateSubscriptionAccess } from "../utils/subscriptionAccess.js";
import {
  PrivateStorageError,
  assertStorageKeyBelongsToProfile,
  buildDocumentStorageKey,
  createPresignedDocumentDownload,
  createPresignedDocumentUpload,
  deleteStoredObject,
  getStoredObjectMetadata,
  isPrivateStorageConfigured,
} from "./privateStorage.service.js";

export const MAX_DOCUMENT_BYTES = env.DOCUMENT_MAX_SIZE_BYTES;

export const DOCUMENT_MIME_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};

export const ALLOWED_DOCUMENT_MIME_TYPES = Object.keys(DOCUMENT_MIME_EXTENSIONS);

const DOCUMENT_TYPES = [
  "TRANSCRIPT",
  "ELIGIBILITY",
  "COMBINE_REPORT",
  "PHYSICAL",
  "OTHER",
] as const;

export class DocumentError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DocumentError";
    this.statusCode = statusCode;
  }
}

function normalizeMimeType(value: string): string {
  return value.split(";")[0].trim().toLowerCase();
}

export function getFileExtension(filename: string): string | null {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === base.length - 1) return null;

  const extension = base.slice(dotIndex + 1).trim().toLowerCase();
  return extension || null;
}

/**
 * Validates the declared file type against a strict allow-list and ensures the
 * filename extension agrees with the claimed MIME type. The extension is used
 * only to build the private storage key; the original filename is never trusted
 * as a path.
 */
export function resolveDocumentExtension(
  filename: string,
  mimeType: string
): string {
  const normalizedMime = normalizeMimeType(mimeType);
  const allowedExtensions = DOCUMENT_MIME_EXTENSIONS[normalizedMime];

  if (!allowedExtensions) {
    throw new DocumentError(
      `Unsupported document type. Upload a PDF, JPEG, or PNG file.`,
      400
    );
  }

  const extension = getFileExtension(filename);

  if (!extension) {
    throw new DocumentError(
      "The document filename must include a valid extension (for example .pdf).",
      400
    );
  }

  if (!allowedExtensions.includes(extension)) {
    throw new DocumentError(
      `The file extension .${extension} does not match the declared document type (${normalizedMime}).`,
      400
    );
  }

  return extension;
}

const safeFilename = z
  .string()
  .trim()
  .min(1, "A filename is required")
  .max(255, "Filenames must be 255 characters or fewer")
  .refine(
    (value) => !value.includes("/") && !value.includes("\\") && !value.includes("\0"),
    "Filenames cannot contain path separators"
  );

export const documentMetadataSchema = z
  .object({
    filename: safeFilename,
    mimeType: z.string().trim().min(1).max(150),
    sizeBytes: z.coerce
      .number()
      .int()
      .positive("The document must not be empty")
      .max(
        MAX_DOCUMENT_BYTES,
        `Documents must be ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB or smaller`
      ),
    type: z.enum(DOCUMENT_TYPES),
    title: z
      .string()
      .trim()
      .min(1, "A document title is required")
      .max(120, "Titles must be 120 characters or fewer"),
  })
  .superRefine((value, ctx) => {
    try {
      resolveDocumentExtension(value.filename, value.mimeType);
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mimeType"],
        message: err instanceof Error ? err.message : "Invalid document type",
      });
    }
  });

export const documentConfirmSchema = documentMetadataSchema.and(
  z.object({
    storageKey: z.string().trim().min(1).max(512),
  })
);

export const reviewDocumentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewerNotes: z.string().trim().max(2000).nullable().optional(),
});

export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;
export type DocumentConfirmInput = z.infer<typeof documentConfirmSchema>;
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;

export interface DocumentRequester {
  userId: string;
  globalRole: GlobalRole;
  schoolId?: string;
}

export interface DocumentAccessContext {
  athleteUserId: string;
  athleteAccountActive: boolean;
  documentStatus: DocumentStatus;
  athleteVerificationStatus: VerificationStatus;
  parentLinkActive?: boolean;
  schoolStatus?: SchoolStatus | null;
  subscriptionActive?: boolean;
}

export type DocumentAccessReason =
  | "OWNER"
  | "PLATFORM_ADMIN"
  | "PARENT_LINK"
  | "SCHOOL_STAFF"
  | "ATHLETE_INACTIVE"
  | "PARENT_NOT_LINKED"
  | "NO_SCHOOL"
  | "DOCUMENT_NOT_APPROVED"
  | "ATHLETE_NOT_APPROVED"
  | "SCHOOL_NOT_APPROVED"
  | "SUBSCRIPTION_INACTIVE"
  | "ROLE_NOT_ALLOWED";

export interface DocumentAccessDecision {
  allowed: boolean;
  reason: DocumentAccessReason;
}

/**
 * Pure access-control policy for private documents. Database-dependent facts
 * (parent link, school approval, subscription) are loaded by the caller and
 * evaluated here so the policy can be unit tested without a database.
 */
export function evaluateDocumentAccess(
  requester: DocumentRequester,
  context: DocumentAccessContext
): DocumentAccessDecision {
  if (requester.userId === context.athleteUserId) {
    return { allowed: true, reason: "OWNER" };
  }

  if (requester.globalRole === "PLATFORM_ADMIN") {
    return { allowed: true, reason: "PLATFORM_ADMIN" };
  }

  if (!context.athleteAccountActive) {
    return { allowed: false, reason: "ATHLETE_INACTIVE" };
  }

  if (requester.globalRole === "PARENT") {
    return context.parentLinkActive
      ? { allowed: true, reason: "PARENT_LINK" }
      : { allowed: false, reason: "PARENT_NOT_LINKED" };
  }

  if (requester.globalRole === "SCHOOL_STAFF") {
    if (!requester.schoolId) {
      return { allowed: false, reason: "NO_SCHOOL" };
    }

    if (context.documentStatus !== "APPROVED") {
      return { allowed: false, reason: "DOCUMENT_NOT_APPROVED" };
    }

    if (context.athleteVerificationStatus !== "APPROVED") {
      return { allowed: false, reason: "ATHLETE_NOT_APPROVED" };
    }

    if (context.schoolStatus !== "APPROVED") {
      return { allowed: false, reason: "SCHOOL_NOT_APPROVED" };
    }

    if (!context.subscriptionActive) {
      return { allowed: false, reason: "SUBSCRIPTION_INACTIVE" };
    }

    return { allowed: true, reason: "SCHOOL_STAFF" };
  }

  return { allowed: false, reason: "ROLE_NOT_ALLOWED" };
}

function accessDeniedMessage(reason: DocumentAccessReason): string {
  switch (reason) {
    case "ATHLETE_INACTIVE":
      return "Document access is unavailable because the athlete account is not active.";
    case "PARENT_NOT_LINKED":
      return "Access denied. Your account is not actively linked to this athlete.";
    case "NO_SCHOOL":
      return "Access denied. Your account is not affiliated with a school.";
    case "DOCUMENT_NOT_APPROVED":
      return "This document has not been approved for school review.";
    case "ATHLETE_NOT_APPROVED":
      return "This athlete's profile has not been verified for recruiting review.";
    case "SCHOOL_NOT_APPROVED":
      return "Access denied. Your school must be approved to review documents.";
    case "SUBSCRIPTION_INACTIVE":
      return "An active school subscription is required to access athlete documents.";
    default:
      return "Access denied. You do not have permission to view this document.";
  }
}

export type DocumentReviewReason = "ALLOWED" | "NO_CHANGE";

export interface DocumentReviewDecision {
  allowed: boolean;
  reason: DocumentReviewReason;
}

/**
 * Pure review policy for private documents. Reviewers may approve or reject a
 * pending document and may reverse a previous decision (approved -> rejected
 * and vice versa), but re-reviewing a document into its current status is a
 * no-op that must be rejected so `reviewedAt` and reviewer attribution stay
 * accurate.
 */
export function evaluateDocumentReview(input: {
  currentStatus: DocumentStatus;
  requestedStatus: "APPROVED" | "REJECTED";
}): DocumentReviewDecision {
  return input.currentStatus === input.requestedStatus
    ? { allowed: false, reason: "NO_CHANGE" }
    : { allowed: true, reason: "ALLOWED" };
}

/**
 * Rejections must carry reviewer notes so the athlete receives actionable
 * feedback. Approval notes stay optional.
 */
export function assertDocumentReviewNotes(
  status: "APPROVED" | "REJECTED",
  reviewerNotes: string | null
): void {
  if (status === "REJECTED" && !reviewerNotes) {
    throw new DocumentError(
      "Add reviewer notes explaining why the document was rejected.",
      400
    );
  }
}

const documentSelect = {
  id: true,
  athleteProfileId: true,
  type: true,
  title: true,
  fileSizeBytes: true,
  mimeType: true,
  status: true,
  reviewerNotes: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DocumentSelect;

async function getAthleteProfileForUser(userId: string) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new DocumentError(
      "Create your athlete profile before uploading documents.",
      404
    );
  }

  return profile;
}

export async function initiateDocumentUpload(
  userId: string,
  input: DocumentMetadataInput
) {
  if (!isPrivateStorageConfigured()) {
    throw new PrivateStorageError(
      "Private document storage is not configured yet. Add STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, and STORAGE_SECRET_ACCESS_KEY to the API environment.",
      503
    );
  }

  const profile = await getAthleteProfileForUser(userId);
  const extension = resolveDocumentExtension(input.filename, input.mimeType);
  const storageKey = buildDocumentStorageKey(profile.id, extension);
  const presigned = await createPresignedDocumentUpload(
    storageKey,
    normalizeMimeType(input.mimeType)
  );

  return {
    ...presigned,
    contentType: normalizeMimeType(input.mimeType),
    maxBytes: MAX_DOCUMENT_BYTES,
    allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
  };
}

export async function confirmDocumentUpload(
  userId: string,
  input: DocumentConfirmInput
) {
  const profile = await getAthleteProfileForUser(userId);
  const extension = resolveDocumentExtension(input.filename, input.mimeType);

  try {
    assertStorageKeyBelongsToProfile(input.storageKey, profile.id);
  } catch (err) {
    if (err instanceof PrivateStorageError) {
      throw new DocumentError(err.message, err.statusCode);
    }
    throw err;
  }

  if (getFileExtension(input.storageKey) !== extension) {
    throw new DocumentError(
      "The storage key does not match the declared document type.",
      400
    );
  }

  const existing = await prisma.document.findFirst({
    where: { privateStorageRef: input.storageKey },
    select: { id: true },
  });

  if (existing) {
    throw new DocumentError(
      "This upload has already been confirmed.",
      409
    );
  }

  const stored = await getStoredObjectMetadata(input.storageKey);
  const actualMimeType = stored.contentType
    ? normalizeMimeType(stored.contentType)
    : "";

  if (actualMimeType !== normalizeMimeType(input.mimeType)) {
    await safelyDeleteStoredObject(input.storageKey);
    throw new DocumentError(
      "The uploaded file type does not match the declared document type.",
      400
    );
  }

  if (stored.contentLength !== input.sizeBytes) {
    await safelyDeleteStoredObject(input.storageKey);
    throw new DocumentError(
      "The uploaded file size does not match the declared document size.",
      400
    );
  }

  try {
    return await prisma.document.create({
      data: {
        athleteProfileId: profile.id,
        type: input.type,
        title: input.title,
        privateStorageRef: input.storageKey,
        fileSizeBytes: input.sizeBytes,
        mimeType: normalizeMimeType(input.mimeType),
        status: "PENDING",
      },
      select: documentSelect,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new DocumentError("This upload has already been confirmed.", 409);
    }
    throw err;
  }
}

export async function listAthleteDocuments(userId: string) {
  const profile = await getAthleteProfileForUser(userId);

  return prisma.document.findMany({
    where: { athleteProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });
}

export async function deleteAthleteDocument(
  userId: string,
  documentId: string
) {
  const profile = await getAthleteProfileForUser(userId);

  const document = await prisma.document.findFirst({
    where: { id: documentId, athleteProfileId: profile.id },
    select: { id: true, status: true, privateStorageRef: true },
  });

  if (!document) {
    throw new DocumentError("Document not found.", 404);
  }

  if (document.status === "APPROVED") {
    throw new DocumentError(
      "Approved documents cannot be removed. Please contact platform support.",
      409
    );
  }

  await prisma.document.delete({ where: { id: document.id } });
  await safelyDeleteStoredObject(document.privateStorageRef);
}

async function safelyDeleteStoredObject(storageKey: string): Promise<void> {
  try {
    await deleteStoredObject(storageKey);
  } catch (err) {
    logger.warn(
      "STORAGE",
      `Failed to delete private document object ${storageKey}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

export async function getDocumentAccessUrl(
  requester: DocumentRequester,
  documentId: string
) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      mimeType: true,
      status: true,
      privateStorageRef: true,
      athleteProfile: {
        select: {
          userId: true,
          verificationStatus: true,
          user: { select: { status: true } },
        },
      },
    },
  });

  if (!document) {
    throw new DocumentError("Document not found.", 404);
  }

  const athleteUserId = document.athleteProfile.userId;
  const isOwner = requester.userId === athleteUserId;
  const isAdmin = requester.globalRole === "PLATFORM_ADMIN";

  let parentLinkActive: boolean | undefined;
  let schoolStatus: SchoolStatus | null | undefined;
  let subscriptionActive: boolean | undefined;

  if (requester.globalRole === "PARENT" && !isOwner) {
    const link = await prisma.parentAthleteLink.findFirst({
      where: {
        parentUserId: requester.userId,
        athleteUserId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    parentLinkActive = Boolean(link);
  }

  if (requester.globalRole === "SCHOOL_STAFF" && !isAdmin && requester.schoolId) {
    const [school, subscription] = await Promise.all([
      prisma.school.findUnique({
        where: { id: requester.schoolId },
        select: { status: true },
      }),
      prisma.subscription.findUnique({
        where: { schoolId: requester.schoolId },
        select: { state: true, expirationDate: true },
      }),
    ]);

    schoolStatus = school?.status ?? null;
    subscriptionActive = evaluateSubscriptionAccess(subscription).allowed;
  }

  const decision = evaluateDocumentAccess(requester, {
    athleteUserId,
    athleteAccountActive: document.athleteProfile.user.status === "ACTIVE",
    documentStatus: document.status,
    athleteVerificationStatus: document.athleteProfile.verificationStatus,
    parentLinkActive,
    schoolStatus,
    subscriptionActive,
  });

  if (!decision.allowed) {
    throw new DocumentError(accessDeniedMessage(decision.reason), 403);
  }

  const { downloadUrl, expiresInSeconds } =
    await createPresignedDocumentDownload(document.privateStorageRef);

  return {
    document: {
      id: document.id,
      title: document.title,
      mimeType: document.mimeType,
      status: document.status,
    },
    downloadUrl,
    expiresInSeconds,
  };
}

const reviewQueueSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  fileSizeBytes: true,
  mimeType: true,
  reviewerNotes: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  athleteProfile: {
    select: {
      id: true,
      primarySport: true,
      graduationYear: true,
      verificationStatus: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
  reviewer: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.DocumentSelect;

export const documentReviewQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type DocumentReviewQuery = z.infer<typeof documentReviewQuerySchema>;

export async function listDocumentsForReview(query: DocumentReviewQuery) {
  const { status, page, limit } = query;
  const where: Prisma.DocumentWhereInput = status ? { status } : {};
  const skip = (page - 1) * limit;

  const [total, documents] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      select: reviewQueueSelect,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  return {
    documents,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

const reviewResultSelect = {
  ...documentSelect,
  reviewer: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.DocumentSelect;

export async function reviewDocument(
  reviewerId: string,
  documentId: string,
  input: ReviewDocumentInput
) {
  const reviewerNotes = input.reviewerNotes?.trim() || null;

  assertDocumentReviewNotes(input.status, reviewerNotes);

  const existing = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new DocumentError("Document not found.", 404);
  }

  const decision = evaluateDocumentReview({
    currentStatus: existing.status,
    requestedStatus: input.status,
  });

  if (!decision.allowed) {
    throw new DocumentError(
      input.status === "APPROVED"
        ? "This document has already been approved."
        : "This document has already been rejected.",
      409
    );
  }

  return prisma.document.update({
    where: { id: documentId },
    data: {
      status: input.status,
      reviewerId,
      reviewerNotes,
      reviewedAt: new Date(),
    },
    select: reviewResultSelect,
  });
}

export async function listApprovedDocumentsForAthlete(
  athleteProfileId: string
) {
  const profile = await prisma.athleteProfile.findFirst({
    where: {
      id: athleteProfileId,
      verificationStatus: "APPROVED",
      user: { status: "ACTIVE", globalRole: "ATHLETE" },
    },
    select: { id: true },
  });

  if (!profile) {
    throw new DocumentError("Approved athlete profile not found.", 404);
  }

  return prisma.document.findMany({
    where: { athleteProfileId: profile.id, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });
}

/**
 * Parents/guardians with an ACTIVE link may oversee the athlete's uploaded
 * documents (any status, so they can help address rejections). Downloads go
 * through the same signed-URL access endpoint, which re-checks the link.
 */
export async function listParentAthleteDocuments(
  parentUserId: string,
  linkId: string
) {
  const link = await prisma.parentAthleteLink.findFirst({
    where: { id: linkId, parentUserId, status: "ACTIVE" },
    select: { athleteUserId: true },
  });

  if (!link) {
    throw new DocumentError(
      "Active guardian link not found. The athlete must approve the link first.",
      404
    );
  }

  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: link.athleteUserId },
    select: { id: true },
  });

  if (!profile) {
    throw new DocumentError("Athlete profile not found.", 404);
  }

  return prisma.document.findMany({
    where: { athleteProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });
}
