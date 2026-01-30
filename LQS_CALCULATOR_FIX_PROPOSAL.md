# LQS Calculator Fix Proposal

## Problem Summary

The current LQS calculator uses unrealistic denominators that make high scores mathematically impossible:

### Issue 1: Keyword Optimization (Dimension 1)
**Current behavior:**
- Measures coverage against ALL keywords (e.g., 162 keywords)
- Actual usage: Only 27/162 keywords appear in content (17%)
- LQS scores this as "low coverage" when it's actually CORRECT

**Root cause:**
- Pipeline provides 150-200 keywords as OPTIONS for content creation
- Content generation SELECTIVELY uses ~25-40 keywords based on priorities
- LQS incorrectly treats "options" as "requirements"

### Issue 2: USP Effectiveness (Dimension 2)
**Current behavior:**
- Tries to match exact USP "point" text in content
- Example: Looks for "Opportunity: Including reassurance about being gentle on the stomach..."
- This strategic recommendation text never appears verbatim in content

**Root cause:**
- USP "point" field is STRATEGIC GUIDANCE for content creators
- Content PARAPHRASES the concept using 15-70% of key words
- LQS incorrectly expects verbatim copy instead of concept integration

---

## Data Analysis Results

### Real Production ASIN: B000I09B3Y

**Keyword Inventory:**
- Total keywords: 162
- Primary: 0
- Secondary: 35
- Long-tail: 111
- Excluded: 16

**Actual Keyword Usage:**
- Used in title: 6/162 (4%)
- Used in bullets: 15/162 (9%)
- Used in description: 22/162 (14%)
- **Used ANYWHERE: 27/162 (17%)** ← Current LQS scores this as failing

**By Tier:**
- Secondary: 10/35 used (29%)
- Long-tail: 17/111 used (15%)

**USP Integration:**
- 10 approved USPs
- Concept matching: 15-70% of key words per USP
- USPs have placement_plan data
- NO exact phrase matches (as expected)

---

## Proposed Solutions

### Solution 1: Keyword Optimization Scoring

#### Option A: Use placement_plan as denominator (PREFERRED)
```typescript
function calculateKeywordOptimization(data: PipelineOutput): DimensionResult {
  const allKeywords = data.Keywords?.enriched || [];

  // Filter to keywords that were INTENDED for use
  const intendedKeywords = allKeywords.filter(kw =>
    kw.placement_plan && kw.placement_plan.length > 0
  );

  // If no placement_plan data, fall back to tier-based expectation
  const targetKeywords = intendedKeywords.length > 0
    ? intendedKeywords
    : [
        ...getKeywords(data, 'primary'),
        ...getKeywords(data, 'secondary').slice(0, 20), // Top 20 secondary
        ...getKeywords(data, 'long_tail').slice(0, 10)  // Top 10 long-tail
      ];

  // Calculate coverage against INTENDED keywords only
  const content = [
    data.Content?.title || '',
    ...(data.Content?.bullet_points || []),
    data.Content?.description ?? ''
  ].join(' ').toLowerCase();

  let usedCount = 0;
  targetKeywords.forEach(kw => {
    const kwText = getKeywordText(kw).toLowerCase();
    if (kwText && content.includes(kwText)) {
      usedCount++;
    }
  });

  const coverage = targetKeywords.length > 0
    ? (usedCount / targetKeywords.length) * 100
    : 70;

  // Rest of the function...
}
```

**Expected results:**
- With placement_plan: Score against intended keywords only
- Without placement_plan: Use tier-based subset (Primary + top 20 Secondary + top 10 Long-tail)
- Realistic coverage: 50-80% instead of 17%

#### Option B: Use tier percentages
```typescript
// Calculate expected usage by tier
const primary = getKeywords(data, 'primary');
const secondary = getKeywords(data, 'secondary');
const longtail = getKeywords(data, 'long_tail');

// Realistic expectations:
// - Primary: 80% should be used
// - Secondary: 40% should be used
// - Long-tail: 15% should be used

const primaryScore = calculateTierCoverage(primary, content, 0.80);
const secondaryScore = calculateTierCoverage(secondary, content, 0.40);
const longtailScore = calculateTierCoverage(longtail, content, 0.15);

const coverage = (primaryScore * 0.5) + (secondaryScore * 0.35) + (longtailScore * 0.15);
```

**Expected results:**
- More nuanced scoring based on tier importance
- Accounts for different usage expectations per tier
- Realistic targets: 80% primary, 40% secondary, 15% long-tail

### Solution 2: Title Placement Scoring

**Current issue:**
- No Primary keywords in many ASINs (0 primary)
- Defaults to 80 score

**Proposed fix:**
```typescript
// Calculate title placement
let titleKeywords: string[];

if (primaryKeywords.length > 0) {
  // Use Primary keywords if available
  titleKeywords = primaryKeywords;
} else {
  // Fall back to top-tier keywords by score
  const sortedKeywords = allKeywords
    .filter(kw => kw.keyword_strength_score > 70)
    .sort((a, b) => b.keyword_strength_score - a.keyword_strength_score)
    .slice(0, 5); // Top 5 high-scoring keywords

  titleKeywords = sortedKeywords.map(kw => getKeywordText(kw));
}

// Calculate how many appear in title
let inTitle = 0;
titleKeywords.forEach(kw => {
  if (title.toLowerCase().includes(kw.toLowerCase())) inTitle++;
});

// Realistic expectation: 3-5 keywords in title (not all)
const expectedInTitle = Math.min(titleKeywords.length, 5);
const titlePlacement = expectedInTitle > 0
  ? (inTitle / expectedInTitle) * 100
  : 75;
```

**Expected results:**
- Uses keyword strength scores when no Primary tier
- Realistic expectation: 3-5 keywords, not all keywords
- Accounts for title length constraints

### Solution 3: USP Effectiveness Scoring

**Current issue:**
- Looks for exact match of "point" field
- Strategic guidance text never appears in content

**Proposed fix:**
```typescript
function calculateUSPEffectiveness(data: PipelineOutput): DimensionResult {
  const approvedUSPs = getApprovedUSPs(data);
  const content = [
    data.Content?.title || '',
    ...(data.Content?.bullet_points || [])
  ].join(' ').toLowerCase();

  // Calculate coverage using CONCEPT matching
  let conceptMatches = 0;

  approvedUSPs.forEach(usp => {
    const uspText = getUSPText(usp).toLowerCase();

    // Extract meaningful words (filter out common words, >4 chars)
    const meaningfulWords = uspText
      .split(/\s+/)
      .filter(w =>
        w.length > 4 &&
        !/^(the|that|this|with|from|about|being|would|could|including|opportunity|providing)$/.test(w)
      );

    if (meaningfulWords.length === 0) return;

    // Check how many concept words appear in content
    const matchedWords = meaningfulWords.filter(w => content.includes(w));
    const matchRate = matchedWords.length / meaningfulWords.length;

    // Consider it "covered" if >50% of concept words appear
    if (matchRate >= 0.5) {
      conceptMatches++;
    }
  });

  const coverage = approvedUSPs.length > 0
    ? (conceptMatches / approvedUSPs.length) * 100
    : 70;

  // Alternative: Use placement_plan data
  // Check if USP was addressed in planned section
  let placementMatches = 0;
  approvedUSPs.forEach(usp => {
    if (!usp.placement_plan || usp.placement_plan.length === 0) return;

    const plannedSections = usp.placement_plan;
    const hasMatch = plannedSections.some(section => {
      if (section.includes('bullet')) {
        // Check if concept appears in bullets
        return data.Content?.bullet_points?.some(b =>
          checkConceptMatch(usp, b)
        );
      }
      if (section.includes('title')) {
        return checkConceptMatch(usp, data.Content?.title || '');
      }
      return false;
    });

    if (hasMatch) placementMatches++;
  });

  // Use whichever method gives more accurate results
  const finalCoverage = Math.max(
    coverage,
    (placementMatches / approvedUSPs.length) * 100
  );

  // Rest of function...
}

function checkConceptMatch(usp: USP, text: string): boolean {
  const uspText = getUSPText(usp).toLowerCase();
  const textLower = text.toLowerCase();

  // Extract meaningful words from USP
  const words = uspText
    .split(/\s+/)
    .filter(w => w.length > 4 && !/^(the|that|this|with|from)$/.test(w));

  const matched = words.filter(w => textLower.includes(w));

  // Require 50%+ word overlap
  return words.length > 0 && (matched.length / words.length) >= 0.5;
}
```

**Expected results:**
- Concept matching: Check if USP ideas appear (not exact phrases)
- Use placement_plan when available
- Realistic coverage: 50-80% instead of 0-20%

---

## Implementation Priority

### Phase 1: Critical Fixes (Blocks accurate scoring)
1. ✅ Fix keyword coverage denominator (use intended keywords or tier-based subset)
2. ✅ Fix USP coverage to use concept matching instead of exact phrases

### Phase 2: Refinements (Improves accuracy)
3. Fix title placement to handle missing Primary tier
4. Add tier alignment fixes to use realistic expectations

### Phase 3: Validation
5. Test against sample ASINs
6. Document expected score ranges
7. Adjust grade thresholds if needed (A/B/C/D cutoffs)

---

## Expected Score Impact

### Before Fix (Current)
- Keyword Optimization: ~40/100 (due to 17% coverage)
- USP Effectiveness: ~30/100 (due to 0% exact matches)
- **Overall LQS: ~55-65/100** (Grade D)

### After Fix (Expected)
- Keyword Optimization: ~70-80/100 (60-80% of intended keywords)
- USP Effectiveness: ~70-85/100 (50-80% concept coverage)
- **Overall LQS: ~70-80/100** (Grade C-B)

### Validation Needed
- Run against 10-20 sample ASINs
- Check if scores align with manual quality assessment
- Adjust thresholds if scores are universally too high/low

---

## Alternative: Add "Generation Alignment" Dimension

Instead of fixing existing dimensions, add a new one:

**Dimension 7: Generation Alignment (15%)**
- Measures how well content follows the pipeline's strategic recommendations
- Uses placement_plan data to check adherence
- Checks if intended keywords were used
- Checks if USP concepts were integrated

This preserves existing LQS logic while adding pipeline-specific scoring.

**Pros:**
- Doesn't break existing LQS interpretations
- Adds new insight specific to SLO pipeline

**Cons:**
- Dimensions 1 & 2 still show artificially low scores
- More complex scoring system

---

## Recommendation

**Implement Phase 1 fixes immediately:**
1. Update keyword coverage to use intended keywords (placement_plan or tier-based)
2. Update USP coverage to use concept matching

**These two fixes will:**
- Align LQS with actual generation process
- Produce realistic scores (70-80 instead of 55-65)
- Maintain the 6-dimension framework
- Require minimal code changes

**Then validate and iterate:**
- Test against production data
- Adjust thresholds if needed
- Document new scoring methodology
