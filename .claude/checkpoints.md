# LQS Calculator Checkpoints

## LQS-003 - 2026-01-30T21:00:00Z

**Summary:** Production review + identified pain point issue

**Goal:** Review production scores, validate fixes, identify remaining issues

**Status:** In Progress

**Changes:**
1. Reviewed 25+ production ASINs with all fixes applied
2. Validated keyword optimization fixes working (75.9 avg, was ~54)
3. Identified critical issue: Pain Point Addressing averaging 17.1/100
4. Attempted version detection fix (129 → expected 71 unique ASINs)
5. Created comprehensive score review document

**Files modified:**
1. LQS_SCORE_REVIEW.md (NEW - production analysis)

**Commits:**
1. 9c14109 - Fix ASIN count: implement version detection

**Key findings:**

1. **Keyword Optimization fixes validated (75.9 avg)**
   - Coverage: 80-90% (was 17-34%) ✅
   - Tier Alignment: 90-98% (was 34%) ✅
   - Smart word-level matching working correctly
   - Strength-weighted coverage accurately reflects keyword usage

2. **Customer Alignment critical issue (30.7 avg)**
   - Intent Theme Coverage: 44.1/100 (fair)
   - Pain Point Addressing: 17.1/100 (critical!)
   - 60% of ASINs scoring below 30%
   - Root cause unknown: Data missing vs matching failing vs content quality

3. **Version detection showing unexpected results**
   - Logs show: "Total files: 129, Unique ASINs: 129, Latest versions: 129"
   - Expected: ~71 unique ASINs with multiple versions each
   - Actual: All 129 files have different ASINs (no duplicates detected)
   - Possible causes: Versioning not used consistently, ASIN extraction issue, or user expectation incorrect

4. **Overall performance**
   - Average LQS: 66.2/100 (Grade D)
   - No A or B grades (highest is C range 70-79)
   - MYE Eligible: 37/129 (29%)
   - Primary limiters: Customer Alignment (30.7), USP Effectiveness (62.3), Readability (67.3)

**Blockers:**
1. Need to investigate why pain point scores are so low (17.1 avg)
2. Need to verify version detection logic or user's expectation of 71 ASINs

**Next steps:**
1. Check source files for ASINs with 0% pain score - do they have USPs.pains data?
2. Debug version detection - verify S3 filenames and grouping logic
3. If pain point data exists but isn't matching, improve matching logic
4. If version detection is working correctly, update user expectation
5. Consider lowering pain point matching threshold if data exists but isn't matching

---

## LQS-002 - 2026-01-30T20:15:00Z

**Summary:** Fixed keyword matching + added sub-component visibility

**Goal:** Correct keyword matching logic (was too strict with exact phrase matching) and add visual sub-component breakdowns to table and stats overview

**Status:** Complete

**Changes:**
1. Fixed keyword matching to use word-level partial credit (not exact phrase only)
2. Added status dots (●/○) under each dimension score in table rows
3. Added aggregate dimension averages to stats overview
4. Added "Top Problem Areas" section showing weakest sub-components
5. Created stats-aggregation utility functions for calculating averages
6. Implemented 3-tier progressive disclosure per Opus recommendations
7. All changes deployed to production

**Files modified:**
1. src/lib/lqs-calculator.ts (keyword matching logic)
2. src/lib/stats-aggregation.ts (NEW - aggregate calculation utilities)
3. src/components/StatsOverview.tsx (dimension averages + problem areas)
4. src/components/ScoresTable.tsx (status dots per dimension)

**Commits:**
1. 0b524db - Add sub-component breakdowns to table and stats overview
2. 2b71801 - Fix keyword matching: use word-level partial credit

**Key decisions:**

1. **Implement word-level partial credit for keyword matching**
   - User validation revealed: Intended keywords ARE applied in content, but as separate words not exact phrases
   - Example: "knee pain" appears as "knee" and "pain" in different parts of content
   - Impact: Coverage went from 34% to 82% (accurately reflects keyword integration)
   - Scoring: Exact phrase (100%), all words present (90%), 75% words (70%), 50% words (50%)
   - Alternative rejected: Keep exact matching (produces false negatives)

2. **Use status dots (●/○) for sub-component visibility**
   - Rationale: Need to show 2-3 sub-scores per dimension without cluttering table
   - Green dots (●) for scores >= 70, red dots (○) for < 70
   - Visual pattern scanning: ●●● = all good, ○○○ = all bad, ●○● = mixed
   - Adds only ~8px row height (minimal impact)
   - Alternative rejected: Hover tooltips only (doesn't enable cross-row scanning)

3. **Add aggregate stats with expandable problem areas**
   - Shows dimension averages (6 scores) always visible
   - "Top Problem Areas" expandable (5 weakest sub-components)
   - Problem-first design surfaces systemic issues immediately
   - Example: "Keyword Coverage avg 34" → reveals this is a systemic issue, not individual ASIN problem
   - Alternative rejected: Show all 18 sub-components always (too overwhelming)

4. **Parallel agent approach (ralph-loop + swarm)**
   - Spawned 3 Opus agents simultaneously for comprehensive design analysis
   - Agent 1: Row breakdown design (3 options analyzed)
   - Agent 2: Stats overview design (3 options analyzed)
   - Agent 3: Utility functions (clean implementation)
   - Synthesized recommendations into hybrid approach
   - Alternative rejected: Sequential design (would take longer)

**Blockers:** None

**Next steps:**
1. Review actual production scores at lqs.krell.works
2. Validate that new coverage scores (70-90%) align with content quality
3. Check if sub-component dots reveal useful patterns
4. Identify systemic issues in "Top Problem Areas"
5. Consider adding hover tooltips for detailed sub-component info (future enhancement)

---

## LQS-001 - 2026-01-30T19:51:00Z

**Summary:** Fixed LQS logic + added content display UI

**Goal:** Fix fundamental LQS calculator flaws (keyword/USP scoring) and add listing content visibility to dashboard

**Status:** Complete

**Changes:**
1. Fixed keyword optimization scoring to use intended keywords (20-40) instead of all analyzed keywords (162)
2. Implemented strength-weighted coverage (rewards strategic high-value keyword usage)
3. Fixed USP effectiveness to use concept matching instead of exact phrase matching
4. Added 3-tier progressive disclosure UI for listing content display
5. Created expandable table rows with inline content preview
6. Added Content tab to detail panel with copy-to-clipboard functionality
7. Deployed both fixes and UI enhancements to production

**Files modified:**
1. src/lib/lqs-calculator.ts (major rewrite - +278 lines)
2. src/lib/types.ts (added placement_plan fields)
3. src/app/api/scores/route.ts (added content to response)
4. src/app/page.tsx (added tabs, expansion state)
5. src/components/ScoresTable.tsx (expandable rows, content preview)
6. src/components/ExpandedContent.tsx (NEW - inline preview component)
7. src/components/ContentTab.tsx (NEW - full content display)

**Commits:**
1. 610e814 - Fix LQS calculator: use intended keywords and concept matching
2. 9f1e585 - Add content display to LQS dashboard - API enhancement
3. a9f9a1d - Complete content display feature for LQS dashboard

**Key decisions:**

1. **Use intended keywords as denominator (not all keywords)**
   - Rationale: Pipeline provides 162 keywords as OPTIONS, but content only uses ~24-30 strategically
   - Impact: Keyword coverage went from artificially low 17% to accurate 34% weighted coverage
   - Alternative rejected: Keep scoring against all keywords (produces false negatives)

2. **Implement strength-weighted coverage**
   - Rationale: Using 8 high-scoring keywords (70+) is better than 8 low-scoring keywords (50)
   - Impact: Rewards strategic keyword selection, aligns with pipeline behavior
   - Alternative rejected: Simple count (doesn't reflect quality of keyword choices)

3. **Use concept matching for USPs (not exact phrases)**
   - Rationale: USP "point" field is strategic guidance ("Opportunity: Include..."), not copy-paste text
   - Impact: USP coverage went from 0% to 40% (detects paraphrasing)
   - Method: Extract meaningful words, check for 2-3 word phrase matches, sliding threshold (50-100%)
   - Alternative rejected: Exact phrase matching (produces false negatives)

4. **3-tier progressive disclosure for content display**
   - Rationale: Need to show 60 ASINs scannably while providing access to full content (~1500-4000 chars each)
   - Tier 1: Compact table with title preview + content indicators
   - Tier 2: Expandable inline preview (full title, truncated bullets)
   - Tier 3: Detail panel Content tab (full listing with copy buttons)
   - Alternative rejected: Show all content in table (destroys scannability), Modal-only (poor workflow)

5. **Adaptive keyword selection thresholds based on real data**
   - Analyzed actual keyword strength score distribution (Secondary: 60-70, Long-tail: 40-64)
   - Set thresholds: Secondary >= 60, Long-tail >= 60 (not the initial 70/80 which excluded 99% of keywords)
   - Applied percentile-based selection (top 30% pseudo-Primary, top 50% Secondary, top 20% Long-tail)
   - Target range: 20-40 keywords (realistic for content capacity)

**Blockers:** None

**Next steps:**
1. Review actual LQS scores on production dashboard (lqs.krell.works)
2. Validate that scores align with manual quality assessment
3. Monitor score distribution across all 61 ASINs
4. Consider future enhancements:
   - Placement adherence scoring (check if keywords are in correct sections)
   - Synonym expansion for better USP matching
   - Semantic similarity using embeddings for USP detection

---
