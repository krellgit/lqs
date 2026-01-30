import { NextResponse } from 'next/server';
import { listS3Reports, fetchS3Report, hasS3Config } from '@/lib/s3';
import { PipelineOutput } from '@/lib/types';
import { getLatestVersions } from '@/lib/versionDetection';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PainDiagnostic {
  asin: string;
  productName: string;
  fileName: string;

  // Data availability
  hasUSPs: boolean;
  approvedUSPsCount: number;
  uspPainPointsCount: number;
  uspPainPointsSample: string[];

  hasIntentThemes: boolean;
  intentThemesCount: number;
  themePainPointsCount: number;
  themePainPointsSample: string[];

  // Combined
  totalUniquePainPoints: number;
  combinedPainPointsSample: string[];

  // Content
  bulletCount: number;
  hasDescription: boolean;
  contentSample: string;
}

function getApprovedUSPs(data: PipelineOutput) {
  if (data.USPs) {
    return data.USPs.filter(u => u.approved === 1);
  }
  return data.usp_approved_set || [];
}

export async function GET(request: Request) {
  try {
    if (!hasS3Config()) {
      return NextResponse.json({
        error: 'S3 not configured',
      }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const targetAsin = searchParams.get('asin');
    const limit = parseInt(searchParams.get('limit') || '10');

    // List and fetch reports
    const allFiles = await listS3Reports();
    const latestVersionFiles = getLatestVersions(allFiles);

    const diagnostics: PainDiagnostic[] = [];

    for (const file of latestVersionFiles.slice(0, limit)) {
      try {
        const data = await fetchS3Report(file.key) as PipelineOutput;

        // Skip if not target ASIN (when filtering)
        if (targetAsin && data.ASIN !== targetAsin) continue;

        // Extract USP pain points
        const approvedUSPs = getApprovedUSPs(data);
        const uspPainPoints = approvedUSPs.flatMap(u => u.pains || []);

        // Extract theme pain points
        const themes = data.intent_themes_processed || [];
        const themePainPoints = themes.flatMap(t => [...(t.pains || []), ...(t.pain_points || [])]);

        // Combine and deduplicate
        const allPainPoints = [...new Set([...themePainPoints, ...uspPainPoints])];

        // Get content sample
        const bullets = data.Content?.bullet_points || [];
        const contentSample = bullets.slice(0, 2).join(' | ').substring(0, 200);

        const productName = data.Content?.title?.split(',')[0] ||
                           data.Content?.title?.substring(0, 50) ||
                           data.ASIN;

        diagnostics.push({
          asin: data.ASIN,
          productName,
          fileName: file.name,

          hasUSPs: approvedUSPs.length > 0,
          approvedUSPsCount: approvedUSPs.length,
          uspPainPointsCount: uspPainPoints.length,
          uspPainPointsSample: uspPainPoints.slice(0, 5),

          hasIntentThemes: themes.length > 0,
          intentThemesCount: themes.length,
          themePainPointsCount: themePainPoints.length,
          themePainPointsSample: themePainPoints.slice(0, 5),

          totalUniquePainPoints: allPainPoints.length,
          combinedPainPointsSample: allPainPoints.slice(0, 5),

          bulletCount: bullets.length,
          hasDescription: !!data.Content?.description,
          contentSample,
        });

        // If filtering by ASIN, stop after finding it
        if (targetAsin && data.ASIN === targetAsin) break;

      } catch (error) {
        console.error(`Error processing ${file.key}:`, error);
      }
    }

    return NextResponse.json({
      diagnostics,
      summary: {
        totalInspected: diagnostics.length,
        withUSPPainPoints: diagnostics.filter(d => d.uspPainPointsCount > 0).length,
        withThemePainPoints: diagnostics.filter(d => d.themePainPointsCount > 0).length,
        withNoPainPoints: diagnostics.filter(d => d.totalUniquePainPoints === 0).length,
      },
    });

  } catch (error) {
    console.error('Diagnostic API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
