// Version detection for S3 files based on filename dates
// Adapted from SLOVD version detection system

import { S3ReportFile } from './s3';

export interface VersionedFile {
  asin: string;
  version: number;
  date: string;
  key: string;
  name: string;
  size: number;
  lastModified: Date;
}

/**
 * Extract date from filename patterns:
 * - Format 1: {ASIN}_{YYYY-MM-DD}.json
 * - Format 2: {ASIN}_{user}_{testname}_{YYYYMMDD}_{HHMMSS}.json (ACGlogs format)
 * Returns date in YYYY-MM-DD format, or null if no date pattern found
 */
export function extractDateFromFilename(key: string): string | null {
  const filename = key.split('/').pop() || key;

  // Try format 1: {ASIN}_{YYYY-MM-DD}.json
  const dashMatch = filename.match(/_(\d{4}-\d{2}-\d{2})\.json$/);
  if (dashMatch) {
    return dashMatch[1];
  }

  // Try format 2: {ASIN}_{user}_{testname}_{YYYYMMDD}_{HHMMSS}.json
  // Extract YYYYMMDD and convert to YYYY-MM-DD
  const compactMatch = filename.match(/_(\d{8})_\d{6}\.json$/);
  if (compactMatch) {
    const yyyymmdd = compactMatch[1];
    const yyyy = yyyymmdd.substring(0, 4);
    const mm = yyyymmdd.substring(4, 6);
    const dd = yyyymmdd.substring(6, 8);
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

/**
 * Group S3 files by ASIN and assign version numbers based on chronological order
 * Returns a Map of ASIN -> sorted array of VersionedFile (oldest to newest)
 */
export function detectVersions(files: S3ReportFile[]): Map<string, VersionedFile[]> {
  const grouped = new Map<string, VersionedFile[]>();

  // Group files by ASIN
  for (const file of files) {
    if (!grouped.has(file.asin)) {
      grouped.set(file.asin, []);
    }

    const date = extractDateFromFilename(file.key);
    const versionedFile: VersionedFile = {
      asin: file.asin,
      version: 0, // Will be assigned after sorting
      date: date || file.lastModified.toISOString().split('T')[0], // Fallback to lastModified
      key: file.key,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
    };

    grouped.get(file.asin)!.push(versionedFile);
  }

  // Sort each group by date and assign version numbers
  for (const [asin, versions] of grouped.entries()) {
    // Sort by date ascending (oldest first)
    versions.sort((a, b) => a.date.localeCompare(b.date));

    // Assign sequential version numbers starting from 1
    versions.forEach((file, index) => {
      file.version = index + 1;
    });
  }

  return grouped;
}

/**
 * Get the latest version from a list of versioned files
 */
export function getLatestVersionFromFiles(versions: VersionedFile[]): VersionedFile | null {
  if (versions.length === 0) {
    return null;
  }
  // Versions are already sorted, so the last one is latest
  return versions[versions.length - 1];
}

/**
 * Get only the latest version of each ASIN
 */
export function getLatestVersions(files: S3ReportFile[]): S3ReportFile[] {
  const grouped = detectVersions(files);
  const latestVersions: S3ReportFile[] = [];

  for (const [asin, versions] of grouped.entries()) {
    const latest = getLatestVersionFromFiles(versions);
    if (latest) {
      // Convert back to S3ReportFile format
      latestVersions.push({
        name: latest.name,
        asin: latest.asin,
        key: latest.key,
        size: latest.size,
        lastModified: latest.lastModified,
      });
    }
  }

  return latestVersions;
}
