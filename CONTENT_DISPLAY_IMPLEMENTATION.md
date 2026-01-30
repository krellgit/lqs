# Content Display Implementation Plan

## Phase 1: API Enhancement ✅ (Ready to implement)

### Update `/api/scores/route.ts`
Add `content` field to `LQSScoreEntry`:
```typescript
export interface LQSScoreEntry {
  asin: string;
  msku?: string;
  productName?: string;
  lqs: LQSResult;
  lastModified: string;
  fileName: string;
  content: {  // NEW
    title: string;
    bullet_points: string[];
    description?: string;
    backend_keywords?: string[];
  };
}
```

Extract content from `PipelineOutput.Content` when building scores.

## Phase 2: Table Enhancement (Tier 1 + Tier 2)

### A. Add Content Preview to Table Rows
Update `ScoresTable.tsx` to show:
- Title preview (first 60 chars) in a new column
- Content indicators (bullet count, description length, keyword count) as small icons
- Expandable row state

### B. Implement Expandable Rows
Create `ExpandedContent.tsx` component:
- Show full title
- Show 5 bullet points (truncated to 100 chars each)
- Show content stats (desc length, keyword count)
- Button: "View Full Content" → opens detail panel

## Phase 3: Detail Panel Enhancement (Tier 3)

### Add Tabbed Interface
Update detail panel to have tabs:
- **Analysis** (existing: radar, recommendations, dimensions)
- **Content** (new: full listing content with formatting)

### Create `ContentTab.tsx`
Display sections:
1. **Title** (full, with char count, edit button)
2. **Bullet Points** (all 5, formatted, with individual scores if available)
3. **Description** (full, with char count, collapsible if long)
4. **Backend Keywords** (as chips, with count)

Each section shows:
- Content formatted nicely
- Character count / completeness indicators
- Relevant recommendations from LQS
- Copy button for easy editing

## Implementation Order

1. ✅ Update API to include content (10 min)
2. ✅ Add expansion state to page.tsx (5 min)
3. ✅ Update ScoresTable with content preview column (15 min)
4. ✅ Create ExpandedContent component (20 min)
5. ✅ Add Content tab to detail panel (25 min)
6. ✅ Test and refine (15 min)

**Total estimated time: ~90 minutes**

## Files to Create/Modify

**Modified:**
- `/src/app/api/scores/route.ts` - Add content to response
- `/src/app/page.tsx` - Add expansion state
- `/src/components/ScoresTable.tsx` - Add preview column & expansion

**New:**
- `/src/components/ExpandedContent.tsx` - Inline content preview
- `/src/components/ContentTab.tsx` - Full content display for detail panel

## Key Design Principles

1. **Progressive Disclosure**: Content hidden by default, revealed on demand
2. **Scannability**: Compact rows by default, clear indicators of content presence
3. **Context**: Always show scores alongside content for reference
4. **Efficiency**: Avoid repeating data, use smart truncation
5. **Actionability**: Copy buttons, clear formatting for editing

---

**Status**: Ready to implement
**Est. Completion**: 90 minutes
**Risk**: Low (additive changes, no breaking modifications)
