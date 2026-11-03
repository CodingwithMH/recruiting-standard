import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";

export const MAX_HIGHLIGHTS_PER_ATHLETE = 10;
export const MAX_VIDEO_BYTES = env.CLOUDINARY_MAX_VIDEO_BYTES;
export const ALLOWED_VIDEO_FORMATS = ["mp4", "mov", "webm", "m4v"];

const ALLOWED_EXTERNAL_HOSTS = {
  HUDL: ["hudl.com"],
  YOUTUBE: ["youtube.com", "youtu.be"],
  VIMEO: ["vimeo.com"],
} as const;

export class HighlightError extends Error {
  constructor(public message: string, public statusCode = 400) {
    super(message);
    this.name = "HighlightError";
  }
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new HighlightError(
      "Video uploads are not configured yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to the API environment.",
      503
    );
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: env.CLOUDINARY_UPLOAD_FOLDER.replace(/\/+$/, ""),
  };
}

/**
 * Cloudinary expects a SHA-1 signature over alphabetically sorted parameters
 * joined as `key=value&...` with the API secret appended. The secret never
 * leaves the server; the browser only receives the short-lived signature.
 */
function signUploadParams(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${toSign}${apiSecret}`)
    .digest("hex");
}

export async function createVideoUploadCredentials(userId: string) {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `${config.folder}/athletes/${userId}`;

  const signature = signUploadParams({ folder, timestamp }, config.apiSecret);

  return {
    provider: "CLOUDINARY" as const,
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    signature,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`,
    maxBytes: MAX_VIDEO_BYTES,
    allowedFormats: ALLOWED_VIDEO_FORMATS,
  };
}

function inferProvider(videoUrl: string) {
  const hostname = new URL(videoUrl).hostname.toLowerCase();

  if (hostname === "res.cloudinary.com") {
    return "CLOUDINARY" as const;
  }

  for (const [provider, domains] of Object.entries(ALLOWED_EXTERNAL_HOSTS)) {
    if (
      domains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      )
    ) {
      return provider as keyof typeof ALLOWED_EXTERNAL_HOSTS;
    }
  }

  return null;
}

function assertCloudinaryUrl(videoUrl: string): void {
  const config = getCloudinaryConfig();
  const { pathname } = new URL(videoUrl);

  if (!pathname.startsWith(`/${config.cloudName}/video/upload/`)) {
    throw new HighlightError(
      "Cloudinary video links must belong to this platform's Cloudinary account.",
      400
    );
  }
}

export const saveHighlightSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  videoUrl: z
    .string()
    .trim()
    .url("A valid video URL is required")
    .max(2048)
    .refine(
      (value) => value.startsWith("https://"),
      "Video links must use HTTPS"
    ),
  publicId: z.string().trim().max(255).optional(),
  durationSeconds: z.coerce
    .number()
    .int()
    .min(0)
    .max(86_400)
    .optional(),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(0)
    .max(2_000_000_000)
    .optional(),
});

export type SaveHighlightInput = z.infer<typeof saveHighlightSchema>;

const highlightSelect = {
  id: true,
  title: true,
  videoUrl: true,
  provider: true,
  publicId: true,
  durationSeconds: true,
  sizeBytes: true,
  createdAt: true,
} as const;

export async function listHighlights(userId: string) {
  return prisma.highlightVideo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: highlightSelect,
  });
}

export async function saveHighlight(
  userId: string,
  input: SaveHighlightInput
) {
  const provider = inferProvider(input.videoUrl);

  if (!provider) {
    throw new HighlightError(
      "Only Cloudinary uploads and Hudl, YouTube, or Vimeo links are supported.",
      400
    );
  }

  if (provider === "CLOUDINARY") {
    assertCloudinaryUrl(input.videoUrl);
  }

  const existingCount = await prisma.highlightVideo.count({
    where: { userId },
  });

  if (existingCount >= MAX_HIGHLIGHTS_PER_ATHLETE) {
    throw new HighlightError(
      `You can publish up to ${MAX_HIGHLIGHTS_PER_ATHLETE} highlight videos. Remove one before adding another.`,
      400
    );
  }

  try {
    return await prisma.highlightVideo.create({
      data: {
        userId,
        title: input.title,
        videoUrl: input.videoUrl,
        provider,
        publicId: input.publicId,
        durationSeconds: input.durationSeconds,
        sizeBytes: input.sizeBytes,
      },
      select: highlightSelect,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HighlightError(
        "That highlight video has already been added.",
        409
      );
    }
    throw err;
  }
}

async function destroyCloudinaryAsset(publicId: string): Promise<void> {
  const config = getCloudinaryConfig();
  const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/video/upload?public_ids[]=${encodeURIComponent(publicId)}`;
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString(
    "base64"
  );

  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) {
    logger.warn(
      "STORAGE",
      `Cloudinary refused to delete video ${publicId} (HTTP ${response.status})`
    );
  }
}

export async function deleteHighlight(userId: string, highlightId: string) {
  const highlight = await prisma.highlightVideo.findFirst({
    where: { id: highlightId, userId },
    select: { id: true, provider: true, publicId: true },
  });

  if (!highlight) {
    throw new HighlightError("Highlight video not found.", 404);
  }

  await prisma.highlightVideo.delete({ where: { id: highlight.id } });

  if (
    highlight.provider === "CLOUDINARY" &&
    highlight.publicId &&
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  ) {
    try {
      await destroyCloudinaryAsset(highlight.publicId);
    } catch (err) {
      logger.warn(
        "STORAGE",
        `Failed to clean up Cloudinary video ${highlight.publicId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}
