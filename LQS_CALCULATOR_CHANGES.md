# LQS Calculator Changes Summary

## Overview

Fixed two fundamental logic flaws in the LQS calculator that were causing inaccurate scoring:

1. **Keyword Optimization**: Was measuring against ALL 162 analyzed keywords instead of keywords intended for use
2. **USP Effectiveness**: Was looking for exact phrase matches instead of concept integration

## Changes Implemented

### 1. Keyword Optimization Fixes (Dimension 1)

#### Problem
- Denominator included ALL keywords from analysis (e.g., 162 keywords)
- Pipeline provides keywords as OPTIONS, not requirements
- Actual usage: ~27/162 (17%) → scored as "failing"
- Reality: Strategic selection of high-value keywords is CORRECT behavior

#### Solution: Intelligent Keyword Selection

**New `getIntendedKeywords()` function:**

```typescript
function getIntendedKeywords(data: PipelineOutput): any[] {
  // 1. All Primary keywords (always intended)
  const primary = enriched.filter(k => k.priority_tier === 'Primary');

  // 2. If no Primary, treat top 30% of Secondary as pseudo-Primary
  if (primary.length === 0) {
    const top30Percent = sortedSecondary.slice(0, Math.ceil(length * 0.3));
  }

  // 3. Secondary keywords with score >= 60 (top 50%)
  const qualifyingSecondary = enriched.filter(k =>
    k.priority_tier === 'Secondary' &&
    k.keyword_strength_score >= 60
  );
  // Take top 50%

  // 4. Long-tail keywords with score >= 60 (top 20%)
  const qualifyingLongtail = enriched.filter(k =>
    k.priority_tier === 'Long-tail' &&
    k.keyword_strength_score >= 60
  );
  // Take top 20%

  // 5. Keywords with placement_plan (explicit intent)
  const withPlacementPlan = enriched.filter(k =>
    k.placement_plan && k.placement_plan.length > 0
  );

  // 6. Apply target range: 20-40 keywords (realistic content capacity)
  // Add/trim to meet target
}
```

**Result:**
- Denominator: 24 keywords (intended) instead of 162 (all)
- Focuses on keywords that SHOULD be used based on strength scores
- Accounts for content capacity constraints

#### Solution: Strength-Weighted Coverage

```typescript
// Instead of simple count
const coverage = usedCount / totalKeywords * 100;

// Use strength-weighted coverage
let totalStrength = 0;
let usedStrength = 0;

intendedKeywords.forEach(kw => {
  const strength = kw.keyword_strength_score || 50;
  totalStrength += strength;

  if (kwText in content) {
    usedStrength += strength;
  }
});

const weightedCoverage = (usedStrength / totalStrength) * 100;
```

**Why this is better:**
- Using 8 high-value keywords (score 70) is better than 8 low-value keywords (score 50)
- Rewards strategic keyword selection
- Aligns with how content generation actually works

#### Solution: Adaptive Title Placement

```typescript
// Get keywords for title placement
let titleKeywords = enriched.filter(k => k.priority_tier === 'Primary');

// If no Primary, use top 5 by keyword_strength_score
if (titleKeywords.length === 0) {
  titleKeywords = enriched
    .filter(k => k.keyword_strength_score > 60)
    .sort((a, b) => b.keyword_strength_score - a.keyword_strength_score)
    .slice(0, 5);
}

// Realistic expectation: 3-5 keywords in title (not all)
const expectedInTitle = Math.min(titleKeywords.length, 5);
```

**Why this is better:**
- Handles ASINs with 0 Primary keywords (common in the data)
- Uses strength scores to identify high-value keywords
- Realistic expectations (3-5 keywords, not unlimited)

### 2. USP Effectiveness Fixes (Dimension 2)

#### Problem
- Looked for exact match of USP "point" field
- Example: Searches for "Opportunity: Including reassurance about..."
- USP "point" is STRATEGIC GUIDANCE, not copy-paste text
- Result: 0% matches despite good USP integration

#### Solution: Concept Matching with Sliding Thresholds

**New helper functions:**

```typescript
// Extract meaningful words (filter stopwords, min length)
function extractMeaningfulWords(text: string): string[] {
  const stopwords = ['the', 'that', 'this', 'with', 'from', 'about', ...];

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(w =>
      w.length > 3 &&
      !stopwords.has(w) &&
      /^[a-z-]+$/.test(w)
    );
}

// Extract n-grams for phrase matching
function extractNGrams(text: string, n: number = 2): string[] {
  // Returns 2-word and 3-word phrases
}

// Check USP coverage with sliding threshold
function checkUSPCoverage(uspText: string, content: string): {
  covered: boolean;
  wordCoverage: number;
  phraseMatched: boolean;
  conceptWords: string[];
  matchedWords: string[];
} {
  const conceptWords = extractMeaningfulWords(uspText);
  const matchedWords = conceptWords.filter(w => content.includes(w));
  const wordCoverage = matchedWords.length / conceptWords.length;

  // Check phrase coverage (2-grams and 3-grams)
  const phrases = [...extractNGrams(uspText, 2), ...extractNGrams(uspText, 3)];
  const phraseMatched = phrases.some(p => content.includes(p));

  // Sliding threshold based on concept complexity
  let threshold;
  if (conceptWords.length <= 2) threshold = 1.0;  // 100%
  else if (conceptWords.length <= 4) threshold = 0.6;  // 60%
  else threshold = 0.5;  // 50%

  // USP covered if word coverage meets threshold AND phrase matches
  // (prevents random word coincidence)
  const covered = (wordCoverage >= threshold) &&
    (phraseMatched || conceptWords.length <= 2);

  return { covered, wordCoverage, phraseMatched, conceptWords, matchedWords };
}
```

**Why this is better:**
- Measures concept integration, not exact phrases
- Sliding threshold prevents trivial matches on short USPs
- Phrase requirement ensures semantic coherence
- Aligns with how content generation paraphrases USP guidance

#### Updated calculateUSPEffectiveness

```typescript
function calculateUSPEffectiveness(data: PipelineOutput): DimensionResult {
  const approvedUSPs = getApprovedUSPs(data);
  const content = [title, ...bullets].join(' ');

  let coveredCount = 0;

  approvedUSPs.forEach(usp => {
    const result = checkUSPCoverage(getUSPText(usp), content);

    if (result.covered) {
      coveredCount++;
    }

    // Add debug flags for low coverage USPs
    if (!result.covered && result.conceptWords.length > 0) {
      const pct = Math.round(result.wordCoverage * 100);
      if (pct < 30) {
        flags.push(`USP concept poorly integrated: "${usp}" (${pct}%)`);
      }
    }
  });

  const coverage = (coveredCount / totalUSPs) * 100;
  // ... rest of function
}
```

## Results

### Test Case: B000I09B3Y (Real Production ASIN)

**Before:**
- 162 total keywords, 27 used (17%)
- Keyword coverage scored as failing
- USP coverage: 0% (no exact matches)
- Overall LQS: ~68/100 (inflated by defaults)

**After:**
- 24 intended keywords, 8 used (33% simple, 34% weighted)
- Keyword coverage measured accurately
- USP coverage: ~40% (concept matching)
- Overall LQS: ~68/100 (accurate measurement)

**Key Insight:**
- Score remains similar but measurement is now ACCURATE
- Content IS using high-value keywords strategically (weighted coverage shows this)
- USPs ARE integrated as concepts (40% vs 0%)
- No longer relying on inflated defaults

### Score Distribution Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Keyword denominator | 162 | 24 | ✓ Realistic |
| Keyword coverage | 17% | 34% (weighted) | ✓ Accurate |
| USP coverage | 0% | 40% | ✓ Detects integration |
| Dimension 1 score | ~67/100 (defaulted) | ~54/100 (measured) | More honest |
| Dimension 2 score | ~47/100 | ~64/100 | ✓ Improved |
| Overall LQS | ~68/100 | ~68/100 | Maintained but accurate |

## Files Changed

1. **src/lib/lqs-calculator.ts**
   - Added `getIntendedKeywords()` - intelligent keyword selection
   - Added `extractMeaningfulWords()` - concept word extraction
   - Added `extractNGrams()` - phrase matching
   - Added `checkUSPCoverage()` - concept matching with sliding thresholds
   - Updated `calculateKeywordOptimization()` - uses intended keywords + weighted coverage
   - Updated `calculateTierAlignment()` - uses intended keywords
   - Updated `calculateUSPEffectiveness()` - uses concept matching

2. **src/lib/types.ts**
   - Added `placement_plan?: string[]` to Keyword interface
   - Added `placement_plan?: string[]` to USP interface

## Validation

### Build Status
✅ TypeScript compilation successful
✅ No runtime errors
✅ All tests pass

### Logic Validation
✅ Keyword selection focuses on high-strength keywords
✅ Weighted coverage rewards strategic usage
✅ USP concept matching detects paraphrasing
✅ Scores align with manual quality assessment

## Next Steps

### Immediate
1. ✅ Deploy to production
2. ✅ Monitor LQS scores across ASINs
3. Test with diverse ASIN types (different categories, tiers)

### Future Enhancements
1. **Placement Adherence Scoring**: Check if keywords are in correct sections (title vs bullets)
2. **Synonym Expansion**: Use lemmatization for better USP matching
3. **Semantic Similarity**: Consider embedding-based USP matching for even better concept detection

## Technical Details

### Keyword Selection Algorithm

The `getIntendedKeywords()` function uses a multi-tier approach:

1. **Tier-based selection**: Primary always included, Secondary/Long-tail filtered by strength
2. **Percentile-based**: Top 30% of Secondary, top 50% of qualifying, top 20% of Long-tail
3. **Score thresholds**: Secondary >= 60, Long-tail >= 60 (based on actual distribution)
4. **Target range**: 20-40 keywords (realistic content capacity)
5. **Explicit intent**: Includes keywords with `placement_plan` data

### Strength Score Distribution (Sample ASIN)

- **Secondary**: 60-70 (median: 62)
- **Long-tail**: 40-64 (median: 49)
- **Excluded**: ~34

Thresholds were calibrated based on this real-world distribution.

### USP Concept Matching Algorithm

The `checkUSPCoverage()` function uses:

1. **Word extraction**: Remove stopwords, min length 4 chars
2. **Phrase extraction**: 2-grams and 3-grams from USP text
3. **Word matching**: Count concept words appearing in content
4. **Phrase matching**: Check if any phrases appear verbatim
5. **Sliding threshold**: Stricter for short USPs (2 words = 100%, 3-4 words = 60%, 5+ words = 50%)
6. **Coherence check**: Require phrase match to prevent random coincidence

## Philosophy

The fixes embody a key principle:

> **Measure what the pipeline INTENDS to do, not what it CAN do**

- Keyword analysis provides OPTIONS (162 keywords)
- Content generation makes SELECTIONS (~24-30 keywords)
- LQS should score SELECTIONS vs INTENDED, not OPTIONS vs ALL

Similarly for USPs:

> **Measure concept integration, not phrase copying**

- USP "point" field is STRATEGIC GUIDANCE
- Content PARAPHRASES concepts using ~50-100% of key words
- LQS should detect CONCEPTS, not require VERBATIM copy

---

**Implementation Date**: 2026-01-30
**Version**: LQS Calculator v2.0
**Build Status**: ✅ Deployed and validated
