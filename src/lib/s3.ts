// S3 Service for fetching JSON reports from S3 bucket

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  prefix: string;
}

export interface S3ReportFile {
  name: string;
  asin: string;
  key: string;
  size: number;
  lastModified: Date;
}

/**
 * Extract ASIN from S3 object key/filename
 * Returns only the ASIN (B followed by 9 alphanumeric chars)
 */
function extractAsinFromKey(key: string): string {
  const filename = key.split('/').pop() || key;
  // Match ASIN at start of filename (before underscore or other delimiter)
  // Cannot use \b because underscore is a word character
  const asinMatch = filename.match(/^(B[A-Z0-9]{9})(?:_|\.json$)/i);
  if (asinMatch) {
    return asinMatch[1].toUpperCase();
  }
  // If no ASIN pattern found, return the full filename for debugging
  return filename.replace(/\.json$/i, '');
}

/**
 * Create S3 client from config
 */
function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Get S3 configuration from environment variables
 */
export function getS3ConfigFromEnv(): S3Config | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucket = process.env.S3_BUCKET;
  const prefix = process.env.S3_PREFIX || '';

  if (!accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    prefix,
  };
}

/**
 * Check if S3 configuration is available
 */
export function hasS3Config(): boolean {
  return getS3ConfigFromEnv() !== null;
}

/**
 * List all JSON report files in the configured S3 prefix
 */
export async function listS3Reports(configOverride?: S3Config): Promise<S3ReportFile[]> {
  const config = configOverride || getS3ConfigFromEnv();
  if (!config) {
    throw new Error('S3 configuration not found');
  }

  const client = createS3Client(config);

  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: config.prefix,
  });

  const response = await client.send(command);

  if (!response.Contents) {
    return [];
  }

  // Filter for JSON files only
  return response.Contents
    .filter((obj) => obj.Key && obj.Key.toLowerCase().endsWith('.json'))
    .map((obj) => ({
      name: obj.Key!.split('/').pop()!,
      asin: extractAsinFromKey(obj.Key!),
      key: obj.Key!,
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
    }));
}

/**
 * Fetch the content of a single report file from S3
 */
export async function fetchS3Report(key: string, configOverride?: S3Config): Promise<unknown> {
  const config = configOverride || getS3ConfigFromEnv();
  if (!config) {
    throw new Error('S3 configuration not found');
  }

  const client = createS3Client(config);

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  const response = await client.send(command);

  if (!response.Body) {
    throw new Error('Empty response body from S3');
  }

  const bodyString = await response.Body.transformToString();
  return JSON.parse(bodyString);
}

/**
 * Validate S3 configuration
 */
export async function validateS3Config(configOverride?: S3Config): Promise<{
  valid: boolean;
  error?: string;
}> {
  const config = configOverride || getS3ConfigFromEnv();
  if (!config) {
    return { valid: false, error: 'No S3 configuration found' };
  }

  try {
    const client = createS3Client(config);
    const command = new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: config.prefix,
      MaxKeys: 1,
    });

    await client.send(command);
    return { valid: true };
  } catch (error) {
    const err = error as Error & { code?: string; name?: string };
    const code = err.code || err.name;

    if (code === 'AccessDenied' || code === 'InvalidAccessKeyId') {
      return { valid: false, error: 'Invalid AWS credentials' };
    }
    if (code === 'NoSuchBucket') {
      return { valid: false, error: 'S3 bucket not found' };
    }

    return { valid: false, error: err.message || 'S3 connection failed' };
  }
}
