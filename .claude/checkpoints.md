# LQS Calculator Checkpoints

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
