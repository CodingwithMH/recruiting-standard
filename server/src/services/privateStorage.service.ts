import { randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

export class PrivateStorageError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "PrivateStorageError";
    this.statusCode = statusCode;
  }
}

interface PrivateStorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

let cachedClient: S3Client | null = null;

export function isPrivateStorageConfigured(): boolean {
  return Boolean(
    env.STORAGE_BUCKET?.trim() &&
      env.STORAGE_ACCESS_KEY_ID?.trim() &&
      env.STORAGE_SECRET_ACCESS_KEY?.trim()
  );
}

function getStorageConfig(): PrivateStorageConfig {
  const bucket = env.STORAGE_BUCKET?.trim();
  const accessKeyId = env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.STORAGE_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new PrivateStorageError(
      "Private document storage is not configured. Add STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, and STORAGE_SECRET_ACCESS_KEY to the API environment.",
      503
    );
  }

  return {
    bucket,
    region: env.STORAGE_REGION?.trim() || "us-east-1",
    endpoint: env.STORAGE_ENDPOINT?.trim() || undefined,
    accessKeyId,
    secretAccessKey,
  };
}

function getClient(config: PrivateStorageConfig): S3Client {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    // Custom S3-compatible providers (MinIO, R2, GCS interoperability) almost
    // always require path-style bucket addressing.
    forcePathStyle: Boolean(config.endpoint),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

const DOCUMENT_KEY_PREFIX = "documents/athlete-profiles";

export function documentStoragePrefix(athleteProfileId: string): string {
  return `${DOCUMENT_KEY_PREFIX}/${athleteProfileId}/`;
}

/**
 * Builds an unguessable, athlete-scoped storage key. Client-supplied filenames
 * never become part of the object key, which prevents path traversal and
 * cross-athlete object reuse.
 */
export function buildDocumentStorageKey(
  athleteProfileId: string,
  extension: string
): string {
  return `${documentStoragePrefix(athleteProfileId)}${randomUUID()}.${extension}`;
}

const STORAGE_KEY_SUFFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,10}$/i;

export function assertStorageKeyBelongsToProfile(
  storageKey: string,
  athleteProfileId: string
): void {
  const prefix = documentStoragePrefix(athleteProfileId);

  if (
    !storageKey.startsWith(prefix) ||
    !STORAGE_KEY_SUFFIX.test(storageKey.slice(prefix.length))
  ) {
    throw new PrivateStorageError(
      "The provided storage key does not belong to this athlete profile.",
      403
    );
  }
}

export interface PresignedUpload {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

export async function createPresignedDocumentUpload(
  storageKey: string,
  contentType: string
): Promise<PresignedUpload> {
  const config = getStorageConfig();
  const client = getClient(config);
  const expiresInSeconds = env.STORAGE_SIGNED_URL_TTL_SECONDS;

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      ContentType: contentType,
    }),
    { expiresIn: expiresInSeconds }
  );

  return { uploadUrl, storageKey, expiresInSeconds };
}

export async function createPresignedDocumentDownload(
  storageKey: string
): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
  const config = getStorageConfig();
  const client = getClient(config);
  const expiresInSeconds = env.STORAGE_SIGNED_URL_TTL_SECONDS;

  const downloadUrl = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
    }),
    { expiresIn: expiresInSeconds }
  );

  return { downloadUrl, expiresInSeconds };
}

export interface StoredObjectMetadata {
  contentLength: number | undefined;
  contentType: string | undefined;
  etag: string | undefined;
}

export async function getStoredObjectMetadata(
  storageKey: string
): Promise<StoredObjectMetadata> {
  const config = getStorageConfig();
  const client = getClient(config);

  try {
    const result = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
      })
    );

    return {
      contentLength: result.ContentLength,
      contentType: result.ContentType,
      etag: result.ETag,
    };
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;

    if (status === 404) {
      throw new PrivateStorageError(
        "The uploaded file could not be found in private storage. Please upload the file again.",
        400
      );
    }

    throw err;
  }
}

export async function deleteStoredObject(storageKey: string): Promise<void> {
  const config = getStorageConfig();
  const client = getClient(config);

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
    })
  );
}
