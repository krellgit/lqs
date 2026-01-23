// Pipeline Output Types (from SLO system)
export interface PipelineOutput {
  ASIN: string;
  MSKU?: string;
  Content: {
    title: string;
    bullet_points: string[];
    description?: string;
    search_terms?: string;
  };
  listing_creation?: {
    quality_report: {
      usps_total: number;
      usp_coverage: number;
      keywords_used: number;
      quality_score: number;
      compliance_score: number;
      keyword_coverage: number;
      usps_represented: number;
      keywords_required: number;
      banned_terms_found: number;
    };
  };
  usp_approved_set?: USP[];
  keyword_package?: {
    primary?: Keyword[];
    secondary?: Keyword[];
    long_tail?: Keyword[];
    // Alternative nested structure
    keyword_sets?: {
      primary?: Keyword[];
      secondary?: Keyword[];
      long_tail?: Keyword[];
      excluded?: Keyword[];
    };
  };
  intent_themes_processed?: IntentTheme[];
  competitor_list_final?: Competitor[];
}

export interface USP {
  id?: string;
  text: string;
  category?: string;
  score?: number;
}

export interface Keyword {
  keyword?: string;
  keyword_text?: string;
  keyword_canonical?: string;
  score?: number;
  keyword_strength_score?: number;
  tier?: string;
}

export interface IntentTheme {
  theme: string;
  keywords?: string[];
  pain_points?: string[];
  frequency?: number;
}

export interface Competitor {
  asin?: string;
  title?: string;
  bullets?: string[];
}

// LQS Result Types
export interface LQSResult {
  lqs_total: number;
  grade: string;
  dimensions: {
    keyword_optimization: DimensionResult;
    usp_effectiveness: DimensionResult;
    readability: DimensionResult;
    competitive_position: DimensionResult;
    customer_alignment: DimensionResult;
    compliance: DimensionResult;
  };
  recommendations: string[];
  calculated_at: string;
  asin: string;
}

export interface DimensionResult {
  score: number;
  weight: number;
  weighted: number;
  breakdown: Record<string, number>;
  flags: string[];
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export const DIMENSION_WEIGHTS = {
  keyword_optimization: 0.25,
  usp_effectiveness: 0.20,
  readability: 0.15,
  competitive_position: 0.15,
  customer_alignment: 0.15,
  compliance: 0.10,
} as const;

export const GRADE_THRESHOLDS: Record<Grade, { min: number; max: number }> = {
  A: { min: 90, max: 100 },
  B: { min: 80, max: 89 },
  C: { min: 70, max: 79 },
  D: { min: 60, max: 69 },
  F: { min: 0, max: 59 },
};
