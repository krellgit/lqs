import { NextResponse } from 'next/server';
import { listS3Reports, fetchS3Report, hasS3Config } from '@/lib/s3';
import { calculateLQS } from '@/lib/lqs-calculator';
import { PipelineOutput, LQSResult } from '@/lib/types';
import { getLatestVersions, detectVersions } from '@/lib/versionDetection';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface LQSScoreEntry {
  asin: string;
  msku?: string;
  productName?: string;
  lqs: LQSResult;
  lastModified: string;
  fileName: string;
  content: {
    title: string;
    bullet_points: string[];
    description?: string;
    backend_keywords?: string[];
  };
}

export interface ScoresResponse {
  configured: boolean;
  scores?: LQSScoreEntry[];
  errors?: Array<{ asin: string; error: string }>;
  meta?: {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    timestamp: string;
    source: string;
    bucket?: string;
    prefix?: string;
  };
  error?: string;
}

/**
 * GET /api/scores - Get LQS scores for all reports in S3
 */
export async function GET(): Promise<NextResponse<ScoresResponse>> {
  try {
    if (!hasS3Config()) {
      return NextResponse.json({
        configured: false,
        error: 'S3 not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET environment variables.',
      }, { status: 503 });
    }

    // List all JSON files in S3
    const allReportFiles = await listS3Reports();

    if (allReportFiles.length === 0) {
      return NextResponse.json({
        configured: true,
        scores: [],
        meta: {
          totalFiles: 0,
          processedFiles: 0,
          failedFiles: 0,
          timestamp: new Date().toISOString(),
          source: 's3',
          bucket: process.env.S3_BUCKET,
          prefix: process.env.S3_PREFIX || '',
        },
      });
    }

    // Detect versions and get only the latest version of each ASIN
    const versionedMap = detectVersions(allReportFiles);
    const latestVersionFiles = getLatestVersions(allReportFiles);

    console.log(`[LQS API] Total files: ${allReportFiles.length}, Unique ASINs: ${versionedMap.size}, Latest versions: ${latestVersionFiles.length}`);

    // Fetch and calculate LQS for each latest version
    const scores: LQSScoreEntry[] = [];
    const errors: Array<{ asin: string; error: string }> = [];

    for (const file of latestVersionFiles) {
      try {
        const rawContent = await fetchS3Report(file.key);
        const pipelineOutput = rawContent as PipelineOutput;

        // Calculate LQS
        const lqsResult = calculateLQS(pipelineOutput);

        // Extract product name from Content
        const productName = pipelineOutput.Content?.title?.split(',')[0] ||
                           pipelineOutput.Content?.title?.substring(0, 50) ||
                           pipelineOutput.ASIN;

        // Use ASIN from JSON content (B followed by 9 chars), not filename
        const asin = pipelineOutput.ASIN || file.asin;

        scores.push({
          asin: asin,
          msku: pipelineOutput.MSKU,
          productName,
          lqs: lqsResult,
          lastModified: file.lastModified.toISOString(),
          fileName: file.name,
          content: {
            title: pipelineOutput.Content?.title || '',
            bullet_points: pipelineOutput.Content?.bullet_points || [],
            description: pipelineOutput.Content?.description,
            backend_keywords: pipelineOutput.Content?.backend_search_terms?.split(',').map(k => k.trim()) ||
                              pipelineOutput.Content?.search_terms?.split(',').map(k => k.trim()) ||
                              [],
          },
        });
      } catch (error) {
        errors.push({
          asin: file.asin,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Sort by LQS score descending
    scores.sort((a, b) => b.lqs.lqs_total - a.lqs.lqs_total);

    return NextResponse.json({
      configured: true,
      scores,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        totalFiles: allReportFiles.length,
        uniqueAsins: versionedMap.size,
        processedFiles: scores.length,
        failedFiles: errors.length,
        timestamp: new Date().toISOString(),
        source: 's3',
        bucket: process.env.S3_BUCKET,
        prefix: process.env.S3_PREFIX || '',
      },
    });
  } catch (error) {
    console.error('Scores API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isAuthError = errorMessage.includes('AccessDenied') || errorMessage.includes('InvalidAccessKeyId');

    return NextResponse.json({
      configured: true,
      error: errorMessage,
    }, {
      status: isAuthError ? 401 : 500
    });
  }
}
