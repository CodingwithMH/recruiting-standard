import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const isTest = process.env.NODE_ENV === "test" || process.env.npm_lifecycle_event === "test";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: isTest
    ? z.string().default("postgresql://postgres:postgres@localhost:5432/recruiting_standard_test?schema=public")
    : z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: isTest
    ? z.string().default("test-only-secret-value-not-used-in-production-min-32-chars")
    : z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  REDIS_URL: z.string().optional(),

  // Private document storage (S3-compatible). Optional in local development.
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ENDPOINT: z.string().url().optional().or(z.literal("")),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  // Public highlight video storage (Cloudinary). Optional in local development.
  // Videos are public-to-school assets, unlike private document storage above.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default("recruiting-standard/highlights"),
  CLOUDINARY_MAX_VIDEO_BYTES: z.coerce.number().int().positive().default(104857600),

  // Transactional email. Optional in local development.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().int().positive().optional()),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default("notifications@therecruitingstandard.com"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("[config] Invalid environment configuration:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
