# LQS Dashboard

6-dimension Listing Quality Score calculator for Amazon listings.

**Live Site:** https://lqs.krell.works

## Features

1. **6-Dimension Scoring Framework**
   1.1. Keyword Optimization (25%) - Coverage + strategic placement
   1.2. USP Effectiveness (20%) - Coverage + differentiation + proof strength
   1.3. Readability (15%) - Flesch score + scannability + title clarity
   1.4. Competitive Position (15%) - Uniqueness vs competitors
   1.5. Customer Alignment (15%) - Intent theme + pain point coverage
   1.6. Compliance (10%) - Banned terms + Amazon formatting

2. **S3 Integration**
   - Connects to `acglogs/listings/` S3 bucket
   - Automatically processes all pipeline output JSON files
   - Real-time score calculation for all ASINs

3. **Tabular Visualization**
   - Score table with all 6 dimensions
   - Stats overview (total, average, grade distribution, MYE eligible count)
   - Detail panel with radar chart, recommendations, dimension breakdown
   - Click any row to see full analysis

## Tech Stack

1. Next.js 14 (App Router)
2. TypeScript
3. Tailwind CSS
4. Recharts (radar visualization)
5. AWS SDK (S3 client)
6. Vercel (hosting)

## Current Production Stats

1. 61 listings analyzed
2. Average LQS: 68.1/100
3. Grade Distribution: 14 C, 47 D
4. MYE Eligible (>=70): 14/61 (23%)
5. Score Range: 64.2 to 72.2

## Environment Variables (Vercel)

Required for S3 connection:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `S3_PREFIX`

## Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Related Projects

1. **SLO** - Main SaaS Listing Optimization platform
2. **SLOVD** - SLO Verification Dashboard (pipeline verification)

---

Built for the SaaS Listing Optimization Platform
