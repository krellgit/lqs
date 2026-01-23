import { syllable } from 'syllable';
import stringSimilarity from 'string-similarity';
import {
  PipelineOutput,
  LQSResult,
  DimensionResult,
  Grade,
  DIMENSION_WEIGHTS,
  GRADE_THRESHOLDS,
} from './types';

// Main calculator function
export function calculateLQS(data: PipelineOutput): LQSResult {
  const keywordOptimization = calculateKeywordOptimization(data);
  const uspEffectiveness = calculateUSPEffectiveness(data);
  const readability = calculateReadability(data);
  const competitivePosition = calculateCompetitivePosition(data);
  const customerAlignment = calculateCustomerAlignment(data);
  const compliance = calculateCompliance(data);

  const lqsTotal =
    keywordOptimization.weighted +
    uspEffectiveness.weighted +
    readability.weighted +
    competitivePosition.weighted +
    customerAlignment.weighted +
    compliance.weighted;

  const recommendations = generateRecommendations({
    keyword_optimization: keywordOptimization,
    usp_effectiveness: uspEffectiveness,
    readability: readability,
    competitive_position: competitivePosition,
    customer_alignment: customerAlignment,
    compliance: compliance,
  });

  return {
    lqs_total: Math.round(lqsTotal * 10) / 10,
    grade: getGrade(lqsTotal),
    dimensions: {
      keyword_optimization: keywordOptimization,
      usp_effectiveness: uspEffectiveness,
      readability: readability,
      competitive_position: competitivePosition,
      customer_alignment: customerAlignment,
      compliance: compliance,
    },
    recommendations,
    calculated_at: new Date().toISOString(),
    asin: data.ASIN,
  };
}

function getGrade(score: number): Grade {
  if (score >= GRADE_THRESHOLDS.A.min) return 'A';
  if (score >= GRADE_THRESHOLDS.B.min) return 'B';
  if (score >= GRADE_THRESHOLDS.C.min) return 'C';
  if (score >= GRADE_THRESHOLDS.D.min) return 'D';
  return 'F';
}

// Helper to extract keyword text
function getKeywordText(kw: { keyword?: string; keyword_text?: string; keyword_canonical?: string }): string {
  return kw.keyword || kw.keyword_text || kw.keyword_canonical || '';
}

// Helper to get keywords from package (handles both flat and nested structures)
function getKeywords(data: PipelineOutput, tier: 'primary' | 'secondary' | 'long_tail'): string[] {
  const pkg = data.keyword_package;
  if (!pkg) return [];

  // Try flat structure first
  const flatKeywords = pkg[tier];
  if (flatKeywords && flatKeywords.length > 0) {
    return flatKeywords.map(k => getKeywordText(k).toLowerCase()).filter(k => k.length > 0);
  }

  // Try nested structure
  const nestedKeywords = pkg.keyword_sets?.[tier];
  if (nestedKeywords && nestedKeywords.length > 0) {
    return nestedKeywords.map(k => getKeywordText(k).toLowerCase()).filter(k => k.length > 0);
  }

  return [];
}

// 1. Keyword Optimization (25%)
function calculateKeywordOptimization(data: PipelineOutput): DimensionResult {
  const flags: string[] = [];
  const weight = DIMENSION_WEIGHTS.keyword_optimization;

  // Get coverage from existing quality_report
  const coverage = data.listing_creation?.quality_report?.keyword_coverage ?? 70;

  // Calculate title placement
  const primaryKeywords = getKeywords(data, 'primary');
  const title = data.Content?.title?.toLowerCase() || '';

  let primaryInTitle = 0;
  primaryKeywords.forEach(kw => {
    if (title.includes(kw)) primaryInTitle++;
  });

  const titlePlacement = primaryKeywords.length > 0
    ? (primaryInTitle / primaryKeywords.length) * 100
    : 80;

  if (primaryInTitle < primaryKeywords.length) {
    flags.push(`${primaryKeywords.length - primaryInTitle} primary keywords missing from title`);
  }

  // Calculate tier alignment (simplified)
  const tierAlignment = calculateTierAlignment(data);

  const score = 0.40 * coverage + 0.30 * titlePlacement + 0.30 * tierAlignment;

  return {
    score: Math.round(score),
    weight,
    weighted: Math.round(score * weight * 10) / 10,
    breakdown: {
      coverage: Math.round(coverage),
      title_placement: Math.round(titlePlacement),
      tier_alignment: Math.round(tierAlignment),
    },
    flags,
  };
}

function calculateTierAlignment(data: PipelineOutput): number {
  const title = data.Content?.title?.toLowerCase() || '';
  const bullets = (data.Content?.bullet_points || []).map(b => b.toLowerCase());
  const description = data.Content?.description?.toLowerCase() ?? '';

  const primary = getKeywords(data, 'primary');
  const secondary = getKeywords(data, 'secondary');

  let score = 0;
  let maxScore = 0;

  // Primary keywords should be in title or top bullets
  primary.forEach(kw => {
    maxScore += 1;
    if (title.includes(kw)) {
      score += 1;
    } else if (bullets.slice(0, 2).some(b => b.includes(kw))) {
      score += 0.75;
    } else if (bullets.some(b => b.includes(kw))) {
      score += 0.5;
    } else if (description.includes(kw)) {
      score += 0.25;
    }
  });

  // Secondary keywords should be in bullets
  secondary.forEach(kw => {
    maxScore += 1;
    if (bullets.some(b => b.includes(kw))) {
      score += 1;
    } else if (description.includes(kw)) {
      score += 0.75;
    }
  });

  return maxScore > 0 ? (score / maxScore) * 100 : 80;
}

// 2. USP Effectiveness (20%)
function calculateUSPEffectiveness(data: PipelineOutput): DimensionResult {
  const flags: string[] = [];
  const weight = DIMENSION_WEIGHTS.usp_effectiveness;

  // Get coverage from existing quality_report
  const coverage = data.listing_creation?.quality_report?.usp_coverage ?? 70;

  // Calculate differentiation
  const differentiation = calculateDifferentiation(data);
  if (differentiation < 60) {
    flags.push('USP phrasing too similar to competitors');
  }

  // Calculate proof strength
  const proofStrength = calculateProofStrength(data);

  const score = 0.40 * coverage + 0.35 * differentiation + 0.25 * proofStrength;

  return {
    score: Math.round(score),
    weight,
    weighted: Math.round(score * weight * 10) / 10,
    breakdown: {
      coverage: Math.round(coverage),
      differentiation: Math.round(differentiation),
      proof_strength: Math.round(proofStrength),
    },
    flags,
  };
}

function calculateDifferentiation(data: PipelineOutput): number {
  const bullets = data.Content?.bullet_points || [];
  const competitors = data.competitor_list_final ?? [];

  if (competitors.length === 0) return 75; // Default if no competitor data

  const competitorBullets = competitors.flatMap(c => c.bullets ?? []);
  if (competitorBullets.length === 0) return 75;

  let totalDiff = 0;
  bullets.forEach(bullet => {
    const similarities = competitorBullets.map(cb =>
      stringSimilarity.compareTwoStrings(bullet.toLowerCase(), cb.toLowerCase())
    );
    const maxSimilarity = Math.max(...similarities, 0);

    // Score inversely proportional to similarity
    if (maxSimilarity < 0.3) totalDiff += 1;
    else if (maxSimilarity < 0.5) totalDiff += 0.7;
    else if (maxSimilarity < 0.7) totalDiff += 0.4;
    else totalDiff += 0.1;
  });

  return (totalDiff / bullets.length) * 100;
}

function calculateProofStrength(data: PipelineOutput): number {
  const content = [data.Content?.title || '', ...(data.Content?.bullet_points || [])].join(' ');

  let score = 0;
  const checks = {
    hasNumbers: /\d+/.test(content),
    hasMeasurements: /\d+\s*(mg|ml|oz|lb|kg|g|cm|inch|"|'|%|hour|minute|day|year)/i.test(content),
    hasProofWords: /(tested|proven|certified|clinically|scientifically|lab|FDA|verified)/i.test(content),
    hasComparison: /(than|vs\.?|versus|compared|better|faster|stronger|more)/i.test(content),
    hasSpecifics: /(patented|award|#1|best-selling|original|authentic)/i.test(content),
  };

  if (checks.hasNumbers) score += 20;
  if (checks.hasMeasurements) score += 25;
  if (checks.hasProofWords) score += 25;
  if (checks.hasComparison) score += 15;
  if (checks.hasSpecifics) score += 15;

  return Math.min(100, score);
}

// 3. Readability (15%)
function calculateReadability(data: PipelineOutput): DimensionResult {
  const flags: string[] = [];
  const weight = DIMENSION_WEIGHTS.readability;

  const allText = [data.Content?.title || '', ...(data.Content?.bullet_points || [])].join(' ');

  // Flesch Reading Ease
  const fleschScore = calculateFleschScore(allText);
  const fleschNormalized = normalizeFleschScore(fleschScore);

  if (fleschScore < 50) {
    flags.push('Content may be too complex for average readers');
  }

  // Scannability
  const scannability = calculateScannability(data.Content?.bullet_points || []);

  // Title clarity
  const titleClarity = calculateTitleClarity(data.Content?.title || '');

  const score = 0.40 * fleschNormalized + 0.35 * scannability + 0.25 * titleClarity;

  return {
    score: Math.round(score),
    weight,
    weighted: Math.round(score * weight * 10) / 10,
    breakdown: {
      flesch_score: Math.round(fleschNormalized),
      scannability: Math.round(scannability),
      title_clarity: Math.round(titleClarity),
    },
    flags,
  };
}

function calculateFleschScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllableCount = words.reduce((sum, word) => sum + syllable(word), 0);

  if (sentences.length === 0 || words.length === 0) return 60;

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllableCount / words.length;

  return 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
}

function normalizeFleschScore(score: number): number {
  // Target range: 50-70 (fairly easy to read)
  if (score >= 50 && score <= 70) return 100;
  if (score < 50) return Math.max(0, 50 + (score - 30) * 2.5);
  return Math.max(0, 100 - (score - 70) * 2);
}

function calculateScannability(bullets: string[]): number {
  let totalScore = 0;

  bullets.forEach(bullet => {
    let bulletScore = 0;

    // Starts with capitalized feature phrase
    if (/^[A-Z][A-Z\s-]+[:–-]/.test(bullet) || /^[A-Z][a-z]+\s[A-Z]/.test(bullet.substring(0, 30))) {
      bulletScore += 25;
    }

    // Appropriate length (150-300 chars optimal)
    if (bullet.length >= 150 && bullet.length <= 300) {
      bulletScore += 25;
    } else if (bullet.length >= 100 && bullet.length <= 400) {
      bulletScore += 15;
    }

    // Has benefit language
    if (/(help|support|provide|enable|allow|improve|enhance|make|keep)/i.test(bullet)) {
      bulletScore += 25;
    }

    // Single focus (no "and also" or multiple topics)
    if (!/(and also|additionally,|furthermore,|moreover,)/i.test(bullet)) {
      bulletScore += 25;
    }

    totalScore += bulletScore;
  });

  return bullets.length > 0 ? totalScore / bullets.length : 60;
}

function calculateTitleClarity(title: string): number {
  let score = 0;

  // Appropriate length (150-200 chars optimal for Amazon)
  if (title.length >= 150 && title.length <= 200) {
    score += 25;
  } else if (title.length >= 100 && title.length <= 250) {
    score += 15;
  }

  // No excessive keyword repetition
  const words = title.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  words.forEach(w => wordCounts.set(w, (wordCounts.get(w) || 0) + 1));
  const maxRepeat = Math.max(...wordCounts.values());
  if (maxRepeat <= 2) {
    score += 25;
  } else if (maxRepeat <= 3) {
    score += 15;
  }

  // Has key structural elements (brand, product type, quantity)
  if (/\d+\s*(count|pack|oz|ml|mg|g|lb|piece)/i.test(title)) {
    score += 25;
  }

  // Comma-separated structure (scannable)
  if ((title.match(/,/g) || []).length >= 2) {
    score += 25;
  }

  return Math.min(100, score);
}

// 4. Competitive Position (15%)
function calculateCompetitivePosition(data: PipelineOutput): DimensionResult {
  const flags: string[] = [];
  const weight = DIMENSION_WEIGHTS.competitive_position;

  const competitors = data.competitor_list_final ?? [];

  // If no competitor data, return default
  if (competitors.length === 0) {
    return {
      score: 70,
      weight,
      weighted: Math.round(70 * weight * 10) / 10,
      breakdown: {
        keyword_differentiation: 70,
        value_prop_uniqueness: 70,
      },
      flags: ['No competitor data available for comparison'],
    };
  }

  const keywordDiff = calculateKeywordDifferentiation(data, competitors);
  const valuePropUnique = calculateValuePropUniqueness(data, competitors);

  if (keywordDiff < 50) {
    flags.push('Keywords overlap heavily with competitors');
  }

  const score = 0.50 * keywordDiff + 0.50 * valuePropUnique;

  return {
    score: Math.round(score),
    weight,
    weighted: Math.round(score * weight * 10) / 10,
    breakdown: {
      keyword_differentiation: Math.round(keywordDiff),
      value_prop_uniqueness: Math.round(valuePropUnique),
    },
    flags,
  };
}

function calculateKeywordDifferentiation(
  data: PipelineOutput,
  competitors: NonNullable<PipelineOutput['competitor_list_final']>
): number {
  const ourKeywords = [
    ...getKeywords(data, 'primary'),
    ...getKeywords(data, 'secondary'),
  ];

  if (ourKeywords.length === 0) return 70;

  const competitorText = competitors
    .map(c => [c.title ?? '', ...(c.bullets ?? [])].join(' ').toLowerCase())
    .join(' ');

  let diffScore = 0;
  ourKeywords.forEach(kw => {
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const count = (competitorText.match(regex) || []).length;

    if (count === 0) diffScore += 1;
    else if (count <= 2) diffScore += 0.7;
    else if (count <= 5) diffScore += 0.4;
    else diffScore += 0.1;
  });

  return (diffScore / ourKeywords.length) * 100;
}

function calculateValuePropUniqueness(
  data: PipelineOutput,
  competitors: NonNullable<PipelineOutput['competitor_list_final']>
): number {
  const ourBullets = data.Content?.bullet_points || [];
  const competitorBullets = competitors.flatMap(c => c.bullets ?? []);

  if (competitorBullets.length === 0) return 75;

  let uniquenessScore = 0;
  ourBullets.forEach(bullet => {
    const similarities = competitorBullets.map(cb =>
      stringSimilarity.compareTwoStrings(bullet.toLowerCase(), cb.toLowerCase())
    );
    const maxSim = Math.max(...similarities, 0);

    if (maxSim < 0.4) uniquenessScore += 1;
    else if (maxSim < 0.6) uniquenessScore += 0.6;
    else if (maxSim < 0.8) uniquenessScore += 0.3;
    else uniquenessScore += 0;
  });

  return (uniquenessScore / ourBullets.length) * 100;
}

// 5. Customer Alignment (15%)
function calculateCustomerAlignment(data: PipelineOutput): DimensionResult {
  const flags: string[] = [];
  const weight = DIMENSION_WEIGHTS.customer_alignment;

  const themes = data.intent_themes_processed ?? [];

  // If no intent data, use default
  if (themes.length === 0) {
    return {
      score: 70,
      weight,
      weighted: Math.round(70 * weight * 10) / 10,
      breakdown: {
        intent_theme_coverage: 70,
        pain_point_addressing: 70,
      },
      flags: ['No customer intent data available'],
    };
  }

  const themeCoverage = calculateThemeCoverage(data, themes);
  const painPointAddressing = calculatePainPointAddressing(data, themes);

  if (painPointAddressing < 60) {
    flags.push('Customer pain points not adequately addressed');
  }

  const score = 0.50 * themeCoverage + 0.50 * painPointAddressing;

  return {
    score: Math.round(score),
    weight,
    weighted: Math.round(score * weight * 10) / 10,
    breakdown: {
      intent_theme_coverage: Math.round(themeCoverage),
      pain_point_addressing: Math.round(painPointAddressing),
    },
    flags,
  };
}

function calculateThemeCoverage(
  data: PipelineOutput,
  themes: NonNullable<PipelineOutput['intent_themes_processed']>
): number {
  const content = [data.Content?.title || '', ...(data.Content?.bullet_points || []), data.Content?.description ?? '']
    .join(' ')
    .toLowerCase();

  let covered = 0;
  themes.forEach(theme => {
    const themeWords = theme.theme.toLowerCase().split(/\s+/);
    const keywordMatches = theme.keywords?.some(kw => content.includes(kw.toLowerCase()));
    const themeMatch = themeWords.some(tw => tw.length > 3 && content.includes(tw));

    if (keywordMatches || themeMatch) covered++;
  });

  return (covered / themes.length) * 100;
}

function calculatePainPointAddressing(
  data: PipelineOutput,
  themes: NonNullable<PipelineOutput['intent_themes_processed']>
): number {
  const painPoints = themes.flatMap(t => t.pain_points ?? []);
  if (painPoints.length === 0) return 75;

  const bullets = (data.Content?.bullet_points || []).map(b => b.toLowerCase());

  let addressed = 0;
  painPoints.forEach(pp => {
    const ppLower = pp.toLowerCase();
    const ppWords = ppLower.split(/\s+/).filter(w => w.length > 3);

    // Check if any bullet addresses this pain point
    const isAddressed = bullets.some(bullet => {
      // Direct mention
      if (bullet.includes(ppLower)) return true;
      // Word overlap
      const matchingWords = ppWords.filter(w => bullet.includes(w));
      return matchingWords.length >= 2;
    });

    if (isAddressed) addressed++;
  });

  return (addressed / painPoints.length) * 100;
}

// 6. Compliance (10%)
function calculateCompliance(data: PipelineOutput): DimensionResult {
  const flags: string[] = [];
  const weight = DIMENSION_WEIGHTS.compliance;

  // Get banned terms from existing quality_report
  const bannedTermsFound = data.listing_creation?.quality_report?.banned_terms_found ?? 0;
  const bannedTermsScore = bannedTermsFound === 0 ? 100 :
    bannedTermsFound === 1 ? 80 :
    bannedTermsFound === 2 ? 60 :
    Math.max(0, 100 - bannedTermsFound * 25);

  if (bannedTermsFound > 0) {
    flags.push(`${bannedTermsFound} banned term(s) found in content`);
  }

  // Format rules check
  const formatScore = calculateFormatCompliance(data);

  const score = 0.50 * bannedTermsScore + 0.50 * formatScore;

  return {
    score: Math.round(score),
    weight,
    weighted: Math.round(score * weight * 10) / 10,
    breakdown: {
      banned_terms: Math.round(bannedTermsScore),
      format_rules: Math.round(formatScore),
    },
    flags,
  };
}

function calculateFormatCompliance(data: PipelineOutput): number {
  let score = 0;

  const title = data.Content?.title || '';
  const bullets = data.Content?.bullet_points || [];

  // Title length <= 200 chars
  if (title.length <= 200) score += 20;
  else if (title.length <= 250) score += 10;

  // Each bullet <= 500 chars
  const bulletLengthOk = bullets.every(b => b.length <= 500);
  if (bulletLengthOk) score += 20;

  // No HTML tags
  const allContent = [title, ...bullets].join(' ');
  if (!/<[^>]+>/.test(allContent)) score += 20;

  // No prohibited characters (unless in brand context)
  if (!/[®™©]/.test(allContent) || /brand|company|Inc\.|LLC/i.test(allContent)) {
    score += 20;
  }

  // No ALL CAPS words (except acronyms 2-4 chars)
  const capsWords = allContent.match(/\b[A-Z]{5,}\b/g) || [];
  if (capsWords.length === 0) score += 20;

  return score;
}

// Generate recommendations based on dimension scores
function generateRecommendations(dimensions: LQSResult['dimensions']): string[] {
  const recommendations: string[] = [];

  // Keyword Optimization
  if (dimensions.keyword_optimization.score < 80) {
    if (dimensions.keyword_optimization.breakdown.title_placement < 80) {
      recommendations.push('Add more primary keywords to the title for better search visibility');
    }
    if (dimensions.keyword_optimization.breakdown.tier_alignment < 80) {
      recommendations.push('Ensure primary keywords appear in title/top bullets, not just description');
    }
  }

  // USP Effectiveness
  if (dimensions.usp_effectiveness.score < 80) {
    if (dimensions.usp_effectiveness.breakdown.differentiation < 70) {
      recommendations.push('Rephrase USPs to differentiate from competitor messaging');
    }
    if (dimensions.usp_effectiveness.breakdown.proof_strength < 70) {
      recommendations.push('Add specific numbers, measurements, or proof points to strengthen claims');
    }
  }

  // Readability
  if (dimensions.readability.score < 80) {
    if (dimensions.readability.breakdown.flesch_score < 70) {
      recommendations.push('Simplify language - use shorter sentences and common words');
    }
    if (dimensions.readability.breakdown.scannability < 70) {
      recommendations.push('Start bullets with capitalized feature names for better scannability');
    }
  }

  // Competitive Position
  if (dimensions.competitive_position.score < 70) {
    recommendations.push('Find unique angles that competitors are not using');
  }

  // Customer Alignment
  if (dimensions.customer_alignment.score < 70) {
    recommendations.push('Address more customer pain points directly in bullet copy');
  }

  // Compliance
  if (dimensions.compliance.score < 90) {
    dimensions.compliance.flags.forEach(flag => {
      recommendations.push(`Fix compliance issue: ${flag}`);
    });
  }

  return recommendations.slice(0, 5); // Limit to top 5
}
