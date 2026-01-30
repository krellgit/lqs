import { syllable } from 'syllable';
import stringSimilarity from 'string-similarity';
import {
  PipelineOutput,
  LQSResult,
  DimensionResult,
  Grade,
  Competitor,
  USP,
  IntentTheme,
  DIMENSION_WEIGHTS,
  GRADE_THRESHOLDS,
} from './types';

// Main calculator function
export function calculateLQS(data: PipelineOutput): LQSResult {
  try {
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
  } catch (error) {
    console.error('LQS calculation error for ASIN', data.ASIN, ':', error);
    // Return a minimal result with error indication
    throw error;
  }
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

// Helper to get keywords by tier from actual S3 structure
function getKeywords(data: PipelineOutput, tier: 'primary' | 'secondary' | 'long_tail'): string[] {
  // Try Keywords.enriched (actual S3 structure)
  const enriched = data.Keywords?.enriched;
  if (enriched && enriched.length > 0) {
    const tierMap: Record<string, string> = {
      'primary': 'Primary',
      'secondary': 'Secondary',
      'long_tail': 'Long-tail',
    };

    const targetTier = tierMap[tier];
    return enriched
      .filter(k => k.priority_tier === targetTier)
      .map(k => getKeywordText(k).toLowerCase())
      .filter(k => k.length > 0);
  }

  // Fallback to legacy keyword_package structure
  const pkg = data.keyword_package;
  if (!pkg) return [];

  const flatKeywords = pkg[tier];
  if (flatKeywords && flatKeywords.length > 0) {
    return flatKeywords.map(k => getKeywordText(k).toLowerCase()).filter(k => k.length > 0);
  }

  const nestedKeywords = pkg.keyword_sets?.[tier];
  if (nestedKeywords && nestedKeywords.length > 0) {
    return nestedKeywords.map(k => getKeywordText(k).toLowerCase()).filter(k => k.length > 0);
  }

  return [];
}

// Helper to get competitors (handles actual S3 field names)
function getCompetitors(data: PipelineOutput): Competitor[] {
  return data['Competitors Final List'] || data.competitor_list_final || [];
}

// Helper to get approved USPs (handles actual S3 structure)
function getApprovedUSPs(data: PipelineOutput): USP[] {
  // Try actual S3 structure
  if (data.USPs) {
    return data.USPs.filter(u => u.approved === 1);
  }
  // Fallback to legacy
  return data.usp_approved_set || [];
}

// Helper to get USP text
function getUSPText(usp: USP): string {
  return usp.point || usp.usp_text || usp.text || '';
}

// Helper to get intended keywords using strength score thresholds
function getIntendedKeywords(data: PipelineOutput): any[] {
  const enriched = data.Keywords?.enriched || [];
  if (enriched.length === 0) return [];

  const intended: any[] = [];

  // All Primary keywords are always intended
  const primary = enriched.filter(k => k.priority_tier === 'Primary');
  intended.push(...primary);

  // If no Primary keywords, treat top Secondary as pseudo-Primary
  const allSecondary = enriched.filter(k => k.priority_tier === 'Secondary');
  if (primary.length === 0 && allSecondary.length > 0) {
    // Top 30% of Secondary become high-priority
    const sortedSecondary = allSecondary
      .sort((a, b) => (b.keyword_strength_score || 0) - (a.keyword_strength_score || 0));
    const pseudoPrimaryCount = Math.ceil(sortedSecondary.length * 0.3);
    intended.push(...sortedSecondary.slice(0, pseudoPrimaryCount));
  }

  // Secondary keywords with decent scores (>= 60)
  // Only add if not already included as pseudo-Primary
  const secondary = enriched.filter(k =>
    k.priority_tier === 'Secondary' &&
    (k.keyword_strength_score || 0) >= 60 &&
    !intended.includes(k)
  );
  // Take top 50% of qualifying Secondary keywords
  const sortedSecondary = secondary.sort((a, b) => (b.keyword_strength_score || 0) - (a.keyword_strength_score || 0));
  intended.push(...sortedSecondary.slice(0, Math.ceil(sortedSecondary.length * 0.5)));

  // Long-tail keywords with strong scores (>= 60)
  const longtail = enriched.filter(k =>
    k.priority_tier === 'Long-tail' &&
    (k.keyword_strength_score || 0) >= 60
  );
  // Take top 20% of Long-tail
  const sortedLongtail = longtail.sort((a, b) => (b.keyword_strength_score || 0) - (a.keyword_strength_score || 0));
  intended.push(...sortedLongtail.slice(0, Math.ceil(sortedLongtail.length * 0.2)));

  // If placement_plan exists, include those regardless of score
  const withPlacementPlan = enriched.filter(k =>
    k.placement_plan &&
    k.placement_plan.length > 0 &&
    !intended.includes(k)
  );
  intended.push(...withPlacementPlan);

  // Target range: 20-40 keywords (realistic for content capacity)
  const minTarget = 20;
  const maxTarget = 40;

  if (intended.length < minTarget && enriched.length > 0) {
    // Add more high-scoring keywords to reach minimum
    const remaining = enriched
      .filter(k => !intended.includes(k) && k.priority_tier !== 'Excluded')
      .sort((a, b) => (b.keyword_strength_score || 0) - (a.keyword_strength_score || 0));
    const needed = Math.min(minTarget - intended.length, remaining.length);
    intended.push(...remaining.slice(0, needed));
  } else if (intended.length > maxTarget) {
    // Trim to top keywords by score if we have too many
    intended.sort((a, b) => (b.keyword_strength_score || 0) - (a.keyword_strength_score || 0));
    intended.splice(maxTarget);
  }

  return intended;
}

// Helper to extract meaningful words from text (for concept matching)
function extractMeaningfulWords(text: string): string[] {
  // Common stopwords to exclude
  const stopwords = new Set([
    'the', 'that', 'this', 'with', 'from', 'about', 'being', 'would', 'could',
    'including', 'opportunity', 'providing', 'help', 'helps', 'make', 'makes',
    'when', 'where', 'which', 'while', 'your', 'their', 'those', 'these'
  ]);

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(w =>
      w.length > 3 &&  // Longer than 3 chars
      !stopwords.has(w) &&
      /^[a-z-]+$/.test(w)  // Only letters and hyphens
    );
}

// Helper to extract n-grams for phrase matching
function extractNGrams(text: string, n: number = 2): string[] {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const ngrams: string[] = [];

  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }

  return ngrams;
}

// Helper to check USP concept coverage with sliding threshold
function checkUSPCoverage(uspText: string, content: string): {
  covered: boolean;
  wordCoverage: number;
  phraseMatched: boolean;
  conceptWords: string[];
  matchedWords: string[];
} {
  const conceptWords = extractMeaningfulWords(uspText);
  const contentLower = content.toLowerCase();

  // Check word coverage
  const matchedWords = conceptWords.filter(w => contentLower.includes(w));
  const wordCoverage = conceptWords.length > 0
    ? matchedWords.length / conceptWords.length
    : 0;

  // Check phrase coverage (2-grams and 3-grams)
  const phrases2 = extractNGrams(uspText, 2);
  const phrases3 = extractNGrams(uspText, 3);
  const phraseMatched =
    phrases2.some(p => contentLower.includes(p)) ||
    phrases3.some(p => contentLower.includes(p));

  // Sliding threshold based on concept complexity
  let threshold: number;
  if (conceptWords.length <= 2) {
    threshold = 1.0;  // Must match all words for very short concepts
  } else if (conceptWords.length <= 4) {
    threshold = 0.6;  // 60% for short concepts
  } else {
    threshold = 0.5;  // 50% for longer concepts
  }

  // USP is covered if word coverage meets threshold AND at least one phrase matches
  // (phrase requirement prevents random word coincidence)
  // Exception: very short USPs (<=2 words) exempt from phrase requirement
  const covered = (wordCoverage >= threshold) &&
    (phraseMatched || conceptWords.length <= 2);

  return {
    covered,
    wordCoverage,
    phraseMatched,
    conceptWords,
    matchedWords
  };
}

// 1. Keyword Optimization (25%)
function calculateKeywordOptimization(data: PipelineOutput): DimensionResult {
  const flags: string[] = [];
  const weight = DIMENSION_WEIGHTS.keyword_optimization;

  // Get intended keywords using strength score thresholds
  const intendedKeywords = getIntendedKeywords(data);

  // Build content string
  const content = [
    data.Content?.title || '',
    ...(data.Content?.bullet_points || []),
    data.Content?.description ?? ''
  ].join(' ').toLowerCase();

  // Calculate strength-weighted coverage with smart matching
  // Using high-value keywords scores better than using low-value ones
  let totalStrength = 0;
  let usedStrength = 0;
  let usedCount = 0;

  intendedKeywords.forEach(kw => {
    const kwText = getKeywordText(kw).toLowerCase();
    const strength = kw.keyword_strength_score || 50;
    totalStrength += strength;

    if (!kwText) return;

    // Check for exact phrase match (100% credit)
    const exactMatch = content.includes(kwText);

    if (exactMatch) {
      usedCount++;
      usedStrength += strength;
    } else {
      // Check for word-level match (partial credit)
      const kwWords = kwText.split(/\s+/).filter(w => w.length > 3);

      if (kwWords.length > 0) {
        const matchedWords = kwWords.filter(w => content.includes(w));
        const matchRate = matchedWords.length / kwWords.length;

        // Give partial credit based on word match rate
        // 100% of words → 0.9 credit
        // 75% of words → 0.7 credit
        // 50% of words → 0.5 credit
        // <50% of words → 0 credit
        let credit = 0;
        if (matchRate >= 1.0) credit = 0.9;
        else if (matchRate >= 0.75) credit = 0.7;
        else if (matchRate >= 0.5) credit = 0.5;

        if (credit > 0) {
          usedCount += credit;
          usedStrength += strength * credit;
        }
      }
    }
  });

  // Weighted coverage: rewards using high-value keywords
  const weightedCoverage = totalStrength > 0
    ? (usedStrength / totalStrength) * 100
    : 70;

  // Simple coverage for flags
  const simpleCoverage = intendedKeywords.length > 0
    ? (usedCount / intendedKeywords.length) * 100
    : 70;

  // Use weighted coverage for scoring (more accurate)
  const coverage = weightedCoverage;

  if (simpleCoverage < 50) {
    flags.push(`Low keyword coverage: ${usedCount}/${intendedKeywords.length} intended keywords used (${Math.round(simpleCoverage)}%)`);
  }

  // Calculate title placement
  const title = data.Content?.title?.toLowerCase() || '';
  const enriched = data.Keywords?.enriched || [];

  // Get high-value keywords for title (Primary or top-scoring keywords)
  let titleKeywords = enriched.filter(k => k.priority_tier === 'Primary');

  // If no Primary keywords, use top 5 by keyword_strength_score
  if (titleKeywords.length === 0) {
    titleKeywords = enriched
      .filter(k => k.keyword_strength_score && k.keyword_strength_score > 60)
      .sort((a, b) => (b.keyword_strength_score || 0) - (a.keyword_strength_score || 0))
      .slice(0, 5);
  }

  let titleInCount = 0;
  titleKeywords.forEach(kw => {
    const kwText = getKeywordText(kw).toLowerCase();
    if (kwText && title.includes(kwText)) {
      titleInCount++;
    }
  });

  // Realistic expectation: 3-5 keywords in title (not all)
  const expectedInTitle = Math.min(titleKeywords.length, 5);
  const titlePlacement = expectedInTitle > 0
    ? (titleInCount / expectedInTitle) * 100
    : 75;

  if (titlePlacement < 60 && titleKeywords.length > 0) {
    flags.push(`Only ${titleInCount}/${expectedInTitle} high-value keywords in title`);
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

  // Use the SAME intended keywords as coverage (not a different selection!)
  const intendedKeywords = getIntendedKeywords(data);
  if (intendedKeywords.length === 0) return 80;

  // Separate into tiers for placement scoring
  const enriched = data.Keywords?.enriched || [];
  const primary = enriched.filter(k => k.priority_tier === 'Primary');
  const allSecondary = enriched.filter(k => k.priority_tier === 'Secondary');

  // Identify pseudo-Primary (if no real Primary exists)
  let pseudoPrimaryCount = 0;
  if (primary.length === 0 && allSecondary.length > 0) {
    pseudoPrimaryCount = Math.ceil(allSecondary.length * 0.3);
  }

  let score = 0;
  let maxScore = 0;

  intendedKeywords.forEach((kw, index) => {
    const kwText = getKeywordText(kw).toLowerCase();
    if (!kwText) return;

    // Determine if this is high-priority (Primary or pseudo-Primary)
    const isHighPriority = kw.priority_tier === 'Primary' ||
      (primary.length === 0 && kw.priority_tier === 'Secondary' && index < pseudoPrimaryCount);

    // Helper: Check if keyword appears in section (word-level matching)
    const appearsByWords = (section: string) => {
      const kwWords = kwText.split(/\s+/).filter(w => w.length > 3);
      if (kwWords.length === 0) return section.includes(kwText); // Fallback to exact

      const matchedWords = kwWords.filter(w => section.includes(w));
      return matchedWords.length / kwWords.length >= 0.5; // 50%+ words present
    };

    maxScore += 1;

    if (isHighPriority) {
      // High-priority keywords: should be in title or top bullets
      if (appearsByWords(title)) {
        score += 1.0; // Perfect placement
      } else if (bullets.slice(0, 2).some(b => appearsByWords(b))) {
        score += 0.75; // Good placement
      } else if (bullets.some(b => appearsByWords(b))) {
        score += 0.5; // Acceptable placement
      } else if (appearsByWords(description)) {
        score += 0.25; // Poor placement
      }
      // else: 0 points (missing)
    } else {
      // Regular Secondary/Long-tail keywords: should be in bullets or description
      if (bullets.some(b => appearsByWords(b))) {
        score += 1.0; // Perfect placement
      } else if (appearsByWords(description)) {
        score += 0.75; // Good placement
      } else if (appearsByWords(title)) {
        score += 0.5; // Not ideal (wasting title space) but present
      }
      // else: 0 points (missing)
    }
  });

  return maxScore > 0 ? (score / maxScore) * 100 : 80;
}

// 2. USP Effectiveness (20%)
function calculateUSPEffectiveness(data: PipelineOutput): DimensionResult {
  const flags: string[] = [];
  const weight = DIMENSION_WEIGHTS.usp_effectiveness;

  const approvedUSPs = getApprovedUSPs(data);
  const totalUSPs = approvedUSPs.length;

  // Calculate coverage using concept matching (not exact phrase matching)
  const content = [
    data.Content?.title || '',
    ...(data.Content?.bullet_points || [])
  ].join(' ');

  let coveredCount = 0;
  let totalWordCoverage = 0;

  approvedUSPs.forEach(usp => {
    const uspText = getUSPText(usp);
    if (!uspText) return;

    const result = checkUSPCoverage(uspText, content);

    if (result.covered) {
      coveredCount++;
    }

    totalWordCoverage += result.wordCoverage;

    // Add debug flags for low coverage USPs
    if (!result.covered && result.conceptWords.length > 0) {
      const coveragePct = Math.round(result.wordCoverage * 100);
      if (coveragePct < 30) {
        flags.push(`USP concept poorly integrated: "${uspText.substring(0, 50)}..." (${coveragePct}% concept overlap)`);
      }
    }
  });

  const coverage = totalUSPs > 0 ? (coveredCount / totalUSPs) * 100 : 70;

  if (coverage < 60 && totalUSPs > 0) {
    flags.push(`Low USP integration: ${coveredCount}/${totalUSPs} USP concepts adequately covered`);
  }

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
  const competitors = getCompetitors(data);

  if (competitors.length === 0) return 75; // Default if no competitor data

  const competitorBullets = competitors.flatMap(c => c.bullet_points || c.bullets || []);
  if (competitorBullets.length === 0) return 75;

  let totalDiff = 0;
  bullets.forEach(bullet => {
    if (!bullet) return;

    const similarities = competitorBullets
      .filter(cb => cb && typeof cb === 'string')
      .map(cb => stringSimilarity.compareTwoStrings(bullet.toLowerCase(), cb.toLowerCase()));
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
    if (!bullet || typeof bullet !== 'string') return;

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
  if (!title) return 60; // Default score if no title

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

  const competitors = getCompetitors(data);

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
  competitors: Competitor[]
): number {
  const ourKeywords = [
    ...getKeywords(data, 'primary'),
    ...getKeywords(data, 'secondary'),
  ];

  if (ourKeywords.length === 0) return 70;

  const competitorText = competitors
    .map(c => [c.title ?? '', ...(c.bullet_points || c.bullets || [])].join(' ').toLowerCase())
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
  competitors: Competitor[]
): number {
  const ourBullets = data.Content?.bullet_points || [];
  const competitorBullets = competitors.flatMap(c => c.bullet_points || c.bullets || []);

  if (competitorBullets.length === 0) return 75;

  let uniquenessScore = 0;
  ourBullets.forEach(bullet => {
    if (!bullet) return;

    const similarities = competitorBullets
      .filter(cb => cb && typeof cb === 'string')
      .map(cb => stringSimilarity.compareTwoStrings(bullet.toLowerCase(), cb.toLowerCase()));
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
    // Handle actual S3 structure (theme.name) and legacy (theme.theme)
    const themeName = theme.name || theme.theme;
    if (!themeName) return;

    const themeWords = themeName.toLowerCase().split(/\s+/);

    // Check features, pains, desires for keyword matches
    // Features might be objects with 'feature' key, or strings
    const features = (theme.features || []).map((f: any) =>
      typeof f === 'string' ? f : (typeof f === 'object' && f !== null && f.feature) ? f.feature : ''
    );
    const allKeywords = [
      ...features,
      ...(theme.pains || []),
      ...(theme.desires || []),
      ...(theme.keywords || []),
    ];

    const keywordMatches = allKeywords.some(kw => kw && typeof kw === 'string' && content.includes(kw.toLowerCase()));
    const themeMatch = themeWords.some(tw => tw.length > 3 && content.includes(tw));

    if (keywordMatches || themeMatch) covered++;
  });

  return themes.length > 0 ? (covered / themes.length) * 100 : 70;
}

function calculatePainPointAddressing(
  data: PipelineOutput,
  themes: NonNullable<PipelineOutput['intent_themes_processed']>
): number {
  // Collect pain points from BOTH intent themes AND approved USPs
  const themePainPoints = themes.flatMap(t => [...(t.pains || []), ...(t.pain_points || [])]);

  // Also get pain points from approved USPs (richer data source)
  const approvedUSPs = getApprovedUSPs(data);
  const uspPainPoints = approvedUSPs.flatMap(u => u.pains || []);

  // Combine and deduplicate
  const allPainPoints = [...new Set([...themePainPoints, ...uspPainPoints])];

  if (allPainPoints.length === 0) return 75;

  const bullets = (data.Content?.bullet_points || []).map(b => b.toLowerCase());
  const description = data.Content?.description?.toLowerCase() || '';

  let addressed = 0;
  allPainPoints.forEach(pp => {
    if (!pp || typeof pp !== 'string') return;

    const ppLower = pp.toLowerCase();
    const ppWords = ppLower.split(/\s+/).filter(w => w.length > 3);

    // Check if any bullet or description addresses this pain point
    const isAddressed = [...bullets, description].some(section => {
      // Direct mention (exact phrase)
      if (section.includes(ppLower)) return true;

      // Word overlap (require 50%+ of words, minimum 2 words)
      if (ppWords.length >= 2) {
        const matchingWords = ppWords.filter(w => section.includes(w));
        return matchingWords.length >= Math.max(2, Math.ceil(ppWords.length * 0.5));
      }

      // Single-word pain points (rare) - require exact match
      return ppWords.length === 1 && section.includes(ppWords[0]);
    });

    if (isAddressed) addressed++;
  });

  return (addressed / allPainPoints.length) * 100;
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
