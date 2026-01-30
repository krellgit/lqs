/**
 * Utility functions for calculating aggregate LQS statistics
 */

interface SubComponentBreakdown {
  [key: string]: number;
}

interface DimensionData {
  score: number;
  breakdown: SubComponentBreakdown;
}

interface LQSDimensions {
  [key: string]: DimensionData;
}

export interface ScoreEntry {
  lqs: {
    dimensions: LQSDimensions;
  };
}

export interface DimensionAverage {
  dimension: string;
  averageScore: number;
  sampleSize: number;
}

export interface SubComponentAverage {
  dimension: string;
  subComponent: string;
  averageScore: number;
  sampleSize: number;
}

export interface WeakestComponent extends SubComponentAverage {
  rank: number;
}

export interface StrongestComponent extends SubComponentAverage {
  rank: number;
}

/**
 * Calculates average score for each LQS dimension across all score entries
 */
export function calculateDimensionAverages(scores: ScoreEntry[]): DimensionAverage[] {
  if (!scores || scores.length === 0) {
    return [];
  }

  const dimensionMap = new Map<string, { sum: number; count: number }>();

  for (const entry of scores) {
    if (!entry?.lqs?.dimensions) {
      continue;
    }

    for (const [dimensionName, dimensionData] of Object.entries(entry.lqs.dimensions)) {
      if (typeof dimensionData?.score === 'number') {
        const current = dimensionMap.get(dimensionName) || { sum: 0, count: 0 };
        dimensionMap.set(dimensionName, {
          sum: current.sum + dimensionData.score,
          count: current.count + 1,
        });
      }
    }
  }

  const averages = Array.from(dimensionMap.entries()).map(([dimension, { sum, count }]) => ({
    dimension,
    averageScore: Number((sum / count).toFixed(1)),
    sampleSize: count,
  }));

  return averages.sort((a, b) => b.averageScore - a.averageScore);
}

/**
 * Calculates average score for each sub-component across all score entries
 */
export function calculateSubComponentAverages(scores: ScoreEntry[]): SubComponentAverage[] {
  if (!scores || scores.length === 0) {
    return [];
  }

  const subComponentMap = new Map<string, { sum: number; count: number; dimension: string }>();

  for (const entry of scores) {
    if (!entry?.lqs?.dimensions) {
      continue;
    }

    for (const [dimensionName, dimensionData] of Object.entries(entry.lqs.dimensions)) {
      if (!dimensionData?.breakdown) {
        continue;
      }

      for (const [subComponentName, score] of Object.entries(dimensionData.breakdown)) {
        if (typeof score === 'number') {
          const key = `${dimensionName}::${subComponentName}`;
          const current = subComponentMap.get(key) || { sum: 0, count: 0, dimension: dimensionName };
          subComponentMap.set(key, {
            sum: current.sum + score,
            count: current.count + 1,
            dimension: current.dimension,
          });
        }
      }
    }
  }

  const averages = Array.from(subComponentMap.entries()).map(([key, { sum, count, dimension }]) => {
    const subComponent = key.split('::')[1];
    return {
      dimension,
      subComponent,
      averageScore: Number((sum / count).toFixed(1)),
      sampleSize: count,
    };
  });

  return averages.sort((a, b) => b.averageScore - a.averageScore);
}

/**
 * Finds the 5 weakest sub-components by average score
 */
export function findWeakestComponents(scores: ScoreEntry[]): WeakestComponent[] {
  const subComponentAverages = calculateSubComponentAverages(scores);

  const sorted = [...subComponentAverages]
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 5);

  return sorted.map((component, index) => ({
    ...component,
    rank: index + 1,
  }));
}

/**
 * Finds the 5 strongest sub-components by average score
 */
export function findStrongestComponents(scores: ScoreEntry[]): StrongestComponent[] {
  const subComponentAverages = calculateSubComponentAverages(scores);

  const topFive = subComponentAverages.slice(0, 5);

  return topFive.map((component, index) => ({
    ...component,
    rank: index + 1,
  }));
}

/**
 * Get comprehensive statistics overview
 */
export function getLQSStatisticsOverview(scores: ScoreEntry[]) {
  if (!scores || scores.length === 0) {
    return {
      dimensionAverages: [],
      subComponentAverages: [],
      weakestComponents: [],
      strongestComponents: [],
      totalEntries: 0,
    };
  }

  return {
    dimensionAverages: calculateDimensionAverages(scores),
    subComponentAverages: calculateSubComponentAverages(scores),
    weakestComponents: findWeakestComponents(scores),
    strongestComponents: findStrongestComponents(scores),
    totalEntries: scores.length,
  };
}
