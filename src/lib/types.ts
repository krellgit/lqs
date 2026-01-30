// Pipeline Output Types (actual S3 structure)
export interface PipelineOutput {
  ASIN: string;
  MSKU?: string;
  Content: {
    title: string;
    bullet_points: string[];
    description?: string;
    search_terms?: string;
    backend_search_terms?: string;
    metadata?: {
      quality_score?: number;
      status?: string;
    };
  };
  // Actual S3 field names (case-sensitive, with spaces)
  'Competitors Final List'?: Competitor[];
  'Competitors Trimmed List'?: Competitor[];
  Keywords?: {
    enriched?: Keyword[];
    rufus?: any[];
    competitors?: any[];
    product_profile?: any[];
  };
  USPs?: USP[];
  intent_themes_processed?: IntentTheme[];

  // Legacy field names for backward compatibility
  listing_creation?: {
    quality_report?: {
      usps_total?: number;
      usp_coverage?: number;
      keywords_used?: number;
      quality_score?: number;
      compliance_score?: number;
      keyword_coverage?: number;
      usps_represented?: number;
      keywords_required?: number;
      banned_terms_found?: number;
    };
  };
  competitor_list_final?: Competitor[];
  usp_approved_set?: USP[];
  keyword_package?: {
    primary?: Keyword[];
    secondary?: Keyword[];
    long_tail?: Keyword[];
    keyword_sets?: {
      primary?: Keyword[];
      secondary?: Keyword[];
      long_tail?: Keyword[];
      excluded?: Keyword[];
    };
  };
}

export interface USP {
  // Actual S3 structure
  point?: string;
  usp_text?: string;
  usp_id?: string;
  approved?: number; // 1=approved, 0=not
  total_usp_score?: number;
  pains?: string[];
  desires?: string[];
  themes?: string[];
  placement_plan?: string[]; // e.g., ["bullet_point_2", "description"]

  // Legacy fields
  id?: string;
  text?: string;
  category?: string;
  score?: number;
}

export interface Keyword {
  // Actual S3 structure
  keyword_canonical?: string;
  keyword_text?: string;
  priority_tier?: string; // "Primary", "Secondary", "Long-tail", "Excluded"
  keyword_strength_score?: number;
  tier_notes?: string;
  demand_tier?: string;
  placement_plan?: string[]; // e.g., ["title", "bullet_point_1"]

  // Legacy fields
  keyword?: string;
  score?: number;
  tier?: string;
}

export interface IntentTheme {
  // Actual S3 structure
  name?: string;
  pains?: string[];
  desires?: string[];
  features?: Array<string | { feature: string; interest_score?: number }>; // Can be strings or objects
  questions?: string[];
  frequency_score?: number;
  importance_score?: number;

  // Legacy fields
  theme?: string;
  keywords?: string[];
  pain_points?: string[];
  frequency?: number;
}

export interface Competitor {
  asin?: string;
  title?: string;
  bullet_points?: string[]; // Actual S3 field name
  bullets?: string[]; // Legacy
  brand?: string;
  price?: number;
  rating?: number;
  relevance_score?: number;
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
