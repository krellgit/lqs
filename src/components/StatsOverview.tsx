'use client';

import { useState } from 'react';
import { LQSResult } from '@/lib/types';
import { calculateDimensionAverages, findWeakestComponents } from '@/lib/stats-aggregation';

interface StatsOverviewProps {
  scores: Array<{ lqs: LQSResult }>;
}

export default function StatsOverview({ scores }: StatsOverviewProps) {
  const [showDimensionBreakdown, setShowDimensionBreakdown] = useState(false);

  if (scores.length === 0) {
    return null;
  }

  // Calculate aggregate stats
  const totalAsins = scores.length;
  const avgLQS = scores.reduce((sum, s) => sum + s.lqs.lqs_total, 0) / totalAsins;

  const gradeDistribution = {
    A: scores.filter(s => s.lqs.grade === 'A').length,
    B: scores.filter(s => s.lqs.grade === 'B').length,
    C: scores.filter(s => s.lqs.grade === 'C').length,
    D: scores.filter(s => s.lqs.grade === 'D').length,
    F: scores.filter(s => s.lqs.grade === 'F').length,
  };

  const totalFlags = scores.reduce((sum, s) =>
    sum + Object.values(s.lqs.dimensions).reduce((flagSum, d) => flagSum + d.flags.length, 0), 0
  );

  const myeEligible = scores.filter(s => s.lqs.lqs_total >= 70).length;

  // Calculate dimension averages using utility function
  const dimensionAverages = calculateDimensionAverages(scores);
  const weakestComponents = findWeakestComponents(scores);

  const dimensionNames: Record<string, string> = {
    keyword_optimization: 'Keyword Opt',
    usp_effectiveness: 'USP Effect',
    readability: 'Readability',
    competitive_position: 'Comp Position',
    customer_alignment: 'Cust Align',
    compliance: 'Compliance',
  };

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getBarColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  return (
    <div className="space-y-4">
      {/* Primary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Total ASINs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total ASINs</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalAsins}</div>
        </div>

        {/* Average LQS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">Average LQS</div>
          <div className={`text-3xl font-bold ${getScoreColor(avgLQS)}`}>
            {avgLQS.toFixed(1)}
          </div>
        </div>

        {/* MYE Eligible */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">MYE Eligible</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {myeEligible}
            <span className="text-sm font-normal text-gray-400 ml-1">/ {totalAsins}</span>
          </div>
        </div>

        {/* Total Flags */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Flags</div>
          <div className={`text-3xl font-bold ${totalFlags > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {totalFlags}
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm col-span-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Grade Distribution</div>
          <div className="flex items-center gap-2">
            {Object.entries(gradeDistribution).map(([grade, count]) => (
              <div key={grade} className="flex items-center gap-1">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  grade === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  grade === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  grade === 'C' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  grade === 'D' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {grade}
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension Averages */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
            Dimension Averages
          </h3>
          <button
            onClick={() => setShowDimensionBreakdown(!showDimensionBreakdown)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {showDimensionBreakdown ? '▲ Hide Sub-Components' : '▼ Show Sub-Components'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {dimensionAverages.map(({ dimension, averageScore }) => (
            <div key={dimension} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {dimensionNames[dimension] || dimension}
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                {averageScore.toFixed(0)}
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                <div
                  className={`h-full rounded-full ${getBarColor(averageScore)}`}
                  style={{ width: `${averageScore}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Sub-component breakdown (expandable) */}
        {showDimensionBreakdown && weakestComponents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">
              Top Problem Areas (Lowest Scoring Sub-Components)
            </h4>
            <div className="space-y-2">
              {weakestComponents.map(({ rank, dimension, subComponent, averageScore }) => (
                <div key={`${dimension}-${subComponent}`} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-4">
                    {rank}.
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {dimensionNames[dimension]} → {subComponent.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-sm font-semibold ${getScoreColor(averageScore)}`}>
                        {averageScore.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div
                        className={`h-full rounded-full ${getBarColor(averageScore)}`}
                        style={{ width: `${averageScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
