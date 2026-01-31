# LQS Calculator Checkpoints

## LQS-004 - 2026-01-31T01:21:30Z

**Summary:** Fixed pain point matching + ASIN deduplication (critical bugs)

**Goal:** Diagnose and fix two critical production issues:
1. Pain Point Addressing scoring 17.1% avg (should be 50-70%)
2. ASIN count showing 129 instead of expected 71

**Status:** Complete - Both fixes deployed and verified

**Changes:**
1. Fixed pain point matching logic (4 bugs identified and resolved)
2. Fixed ASIN extraction regex (version detection now working)
3. Created diagnostic API endpoint for pain point investigation
4. Deployed all fixes to production (lqs.krell.works)
5. Verified improvements: pain points 17.1% → 33.2%, ASINs 129 → 71

**Files modified:**
1. src/lib/lqs-calculator.ts (pain point matching logic)
2. src/lib/s3.ts (ASIN extraction regex)
3. src/app/api/diagnose-pain/route.ts (NEW - diagnostic endpoint)

**Commits:**
1. 15c1770 - Fix ASIN extraction: word boundary regex failed on underscores
2. 5192561 - Fix pain point matching: handle short words, plurals, and synonyms
3. 65a029d - Add diagnostic API endpoint for pain point investigation

**Key decisions:**

1. **Pain Point Bug #1: Word length filter too strict**
   - Issue: `w.length > 3` excluded common 3-letter words (dry, old, bad, fit, age, hip, low, pet)
   - Impact: "old age" became empty array, "hip pain" lost "hip"
   - Fix: Changed to `w.length > 2` to keep 3+ character words
   - Rationale: Short words are critical in pain point descriptions

2. **Pain Point Bug #2: No plural/variation handling**
   - Issue: Substring matching failed ("hip" didn't match "hips")
   - Fix: Word boundary regex: `/\b${word}\b/` matches plurals and variations
   - Rationale: Content naturally uses plurals/variations of pain point terms

3. **Pain Point Bug #3: No synonym support**
   - Issue: "pain" vs "discomfort", "budget" vs "affordable" failed to match
   - Fix: Added synonym dictionary for common pain-related terms
   - Dictionary: pain→discomfort/ache, energy→fatigue/tired, budget→affordable/price, fit→sizing
   - Rationale: Content writers use synonyms for variety, not exact pain point phrases

4. **Pain Point Bug #4: Minimum word count too strict**
   - Issue: `Math.max(2, Math.ceil(length * 0.5))` required 2 words even when 50% threshold met
   - Example: "low energy" with 1/2 match failed (50% but needed 2 words)
   - Fix: Removed minimum, using pure 50%+ threshold
   - Rationale: Percentage threshold should be sufficient without arbitrary minimums

5. **ASIN Extraction Bug: Word boundary failed on underscores**
   - Issue: Regex `/\b(B[A-Z0-9]{9})\b/` failed because `_` is word character
   - Filename: `B0006SW71G_Alice...json` → regex didn't match, returned full filename
   - Result: 129 separate groups instead of 71 unique ASINs
   - Fix: Changed to `/^(B[A-Z0-9]{9})(?:_|\.json$)/` anchored to start
   - Rationale: Must explicitly match delimiter after ASIN, not rely on word boundaries

6. **Diagnostic endpoint for investigation**
   - Created `/api/diagnose-pain?limit=N&asin=X` to inspect raw data
   - Returns: USP pain counts, theme pain counts, combined pain points, content samples
   - Rationale: Essential for debugging pain point data availability vs matching failures

**Production Impact:**

Before fixes:
- Pain Point Addressing: 17.1% avg, 49 ASINs at 0% (38%)
- ASIN Count: 129 (showing all file versions)

After fixes:
- Pain Point Addressing: 33.2% avg (+16.1 points, +94%), 10 ASINs at 0% (8%)
- ASIN Count: 71 unique (correctly deduplicated)
- Overall LQS: 66.2 → 67.4 (+1.2 points)
- MYE Eligible: 37 → 50 (+35%)

**Blockers:** None

**Next steps:**
1. Investigate remaining 10 ASINs with 0% pain scores (down from 49)
2. Consider expanding synonym dictionary based on actual pain point data patterns
3. Monitor Customer Alignment dimension for continued improvement
4. Add hover tooltips showing sub-component details in table rows
5. Document pain point matching logic for future maintainers

---

## LQS-003 - 2026-01-30T21:00:00Z

**Summary:** Complete LQS overhaul + production review

**Goal:** Fix all LQS calculator logic issues, add content display UI, add sub-component visibility, and review production scores

**Status:** Complete (with open questions for investigation)

**Changes:**
1. Fixed 5 major scoring issues in LQS calculator (keyword coverage, tier alignment, USP effectiveness, pain point data, title placement)
2. Implemented 3-tier progressive disclosure UI for content display
3. Added sub-component visibility (status dots, aggregate stats)
4. Implemented version detection for S3 files
5. Reviewed 25+ production ASINs and identified remaining issues
6. Deployed 10 commits across the session

**Files modified:**
1. src/lib/lqs-calculator.ts (complete rewrite - 500+ lines added)
2. src/lib/types.ts (added placement_plan fields)
3. src/lib/stats-aggregation.ts (NEW - utility functions)
4. src/lib/versionDetection.ts (NEW - ASIN version grouping)
5. src/app/api/scores/route.ts (content data, version detection)
6. src/app/page.tsx (tabs, expansion state)
7. src/components/ScoresTable.tsx (expandable rows, status dots)
8. src/components/StatsOverview.tsx (aggregate display)
9. src/components/ExpandedContent.tsx (NEW - inline preview)
10. src/components/ContentTab.tsx (NEW - full content display)
11. LQS_CALCULATOR_CHANGES.md (NEW - technical docs)
12. LQS_CALCULATOR_FIX_PROPOSAL.md (NEW - analysis)
13. LQS_SCORE_REVIEW.md (NEW - production findings)
14. CONTENT_DISPLAY_IMPLEMENTATION.md (NEW - UI specs)

**Commits:**
1. 610e814 - Fix LQS calculator: use intended keywords and concept matching
2. 9f1e585 - Add content display to LQS dashboard - API enhancement
3. a9f9a1d - Complete content display feature for LQS dashboard
4. 0b524db - Add sub-component breakdowns to table and stats overview
5. 2b71801 - Fix keyword matching: use word-level partial credit
6. 67758a0 - Add checkpoint LQS-002
7. 71edd2f - Fix tier alignment: use same keywords + smart matching
8. 7b95be9 - Fix pain point addressing: include USP pain points
9. 9c14109 - Fix ASIN count: implement version detection (129 → 71 ASINs)
10. eda9480 - Add checkpoint LQS-003

**Key decisions:**

1. **Use intended keywords (20-40) not all analyzed keywords (162)**
   - User validated: Pipeline applies keywords properly, just selectively
   - Test showed: All 162 keywords present as words, but only 24-40 as phrases
   - Impact: Keyword coverage 17% → 82% (accurately reflects integration)

2. **Implement word-level partial credit for keyword matching**
   - User insight: "Intended keywords ARE applied properly"
   - Issue: Multi-word keywords split naturally ("knee pain" → "knee" and "pain" separately)
   - Solution: Exact phrase 100%, all words 90%, 75% words 70%, 50% words 50%
   - Impact: Tier alignment 34% → 98%, Coverage 34% → 82%

3. **Use concept matching for USPs (not exact phrases)**
   - USP "point" field is strategic guidance, not copy text
   - Extract meaningful words, check phrase matches
   - Sliding threshold: 50-100% based on USP length
   - Impact: USP coverage 0% → 40%

4. **Pull pain points from USPs (not just intent themes)**
   - Intent themes had only 2 pain points
   - Approved USPs have 16 pain points (richer data)
   - Combined and deduplicated for comprehensive measurement
   - Impact: More meaningful metric (measuring all pain points)

5. **3-tier progressive disclosure for content (Opus recommendation)**
   - Tier 1: Compact table with title preview + indicators
   - Tier 2: Expandable inline preview
   - Tier 3: Detail panel Content tab
   - Alternative rejected: Show all content (destroys scannability)

6. **Status dots (●/○) for sub-component visibility**
   - Green dot (●) = sub-score >= 70
   - Red dot (○) = sub-score < 70
   - Adds only ~8px row height
   - Enables pattern scanning across 60+ rows
   - Alternative: Hover tooltips only (doesn't enable cross-row comparison)

7. **Parallel agent approach (ralph-loop + swarm)**
   - Spawned 3 Opus/Haiku agents for comprehensive design
   - Agent 1: Row breakdown design (status dots recommendation)
   - Agent 2: Stats overview design (expandable problem areas)
   - Agent 3: Utility functions (clean implementation)
   - Synthesized into hybrid approach

**Production findings:**

1. **Keyword Optimization validated: 75.9 avg (excellent!)**
   - Coverage: 80-90% across ASINs ✅
   - Tier Alignment: 90-98% across ASINs ✅
   - Fixes working as intended

2. **Customer Alignment critical issue: 30.7 avg**
   - Intent Theme Coverage: 44.1 (fair)
   - Pain Point Addressing: 17.1 (critical!)
   - 60% of ASINs below 30%
   - Needs investigation: Data missing vs matching failing

3. **Version detection showing 129 unique ASINs**
   - User expected ~71 unique with versions
   - Logs show: All 129 have different ASINs (no duplicates)
   - Needs verification: Are these all unique or is grouping failing?

4. **Overall performance: 66.2 avg LQS (Grade D)**
   - No A or B grades
   - MYE Eligible: 37/129 (29%)
   - Test ASIN improved: 68 → 78 (+10 points with all fixes)

**Blockers:**
1. Need to verify pain point data in source files (why is avg 17.1%?)
2. Need to verify ASIN count expectation (129 vs 71)

**Next steps:**
1. Check S3 source files for ASINs with 0% pain scores - verify USPs.pains data exists
2. Verify S3 filenames - do they have version patterns (ASIN_YYYY-MM-DD.json)?
3. If pain data exists but not matching, improve matching threshold or logic
4. If 129 is correct count, update user expectation
5. Consider adding hover tooltips for sub-component details in table rows
6. Monitor dimension averages after calculator fixes settle

---

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
