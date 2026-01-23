'use client';

import { LQSResult } from '@/lib/types';

interface StatsOverviewProps {
  scores: Array<{ lqs: LQSResult }>;
}

export default function StatsOverview({ scores }: StatsOverviewProps) {
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

  const dimensionAvgs = {
    keyword_optimization: scores.reduce((sum, s) => sum + s.lqs.dimensions.keyword_optimization.score, 0) / totalAsins,
    usp_effectiveness: scores.reduce((sum, s) => sum + s.lqs.dimensions.usp_effectiveness.score, 0) / totalAsins,
    readability: scores.reduce((sum, s) => sum + s.lqs.dimensions.readability.score, 0) / totalAsins,
    competitive_position: scores.reduce((sum, s) => sum + s.lqs.dimensions.competitive_position.score, 0) / totalAsins,
    customer_alignment: scores.reduce((sum, s) => sum + s.lqs.dimensions.customer_alignment.score, 0) / totalAsins,
    compliance: scores.reduce((sum, s) => sum + s.lqs.dimensions.compliance.score, 0) / totalAsins,
  };

  const totalFlags = scores.reduce((sum, s) =>
    sum + Object.values(s.lqs.dimensions).reduce((flagSum, d) => flagSum + d.flags.length, 0), 0
  );

  const myeEligible = scores.filter(s => s.lqs.lqs_total >= 70).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Total ASINs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="text-sm text-gray-500 dark:text-gray-400">Total ASINs</div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalAsins}</div>
      </div>

      {/* Average LQS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="text-sm text-gray-500 dark:text-gray-400">Average LQS</div>
        <div className={`text-3xl font-bold ${
          avgLQS >= 80 ? 'text-green-600' : avgLQS >= 60 ? 'text-yellow-600' : 'text-red-600'
        }`}>
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
  );
}
