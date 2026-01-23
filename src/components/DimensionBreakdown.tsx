'use client';

import { LQSResult } from '@/lib/types';

interface DimensionBreakdownProps {
  result: LQSResult;
}

const dimensionInfo: Record<string, { name: string; description: string }> = {
  keyword_optimization: {
    name: 'Keyword Optimization',
    description: 'Coverage + strategic placement of keywords in title and bullets',
  },
  usp_effectiveness: {
    name: 'USP Effectiveness',
    description: 'Coverage, differentiation from competitors, and proof strength',
  },
  readability: {
    name: 'Readability',
    description: 'Flesch score, scannability, and title clarity',
  },
  competitive_position: {
    name: 'Competitive Position',
    description: 'Keyword and value proposition uniqueness vs competitors',
  },
  customer_alignment: {
    name: 'Customer Alignment',
    description: 'Intent theme coverage and pain point addressing',
  },
  compliance: {
    name: 'Compliance',
    description: 'Banned terms and Amazon formatting rules',
  },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function DimensionBreakdown({ result }: DimensionBreakdownProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
        Detailed Breakdown
      </h3>

      {Object.entries(result.dimensions).map(([key, dim]) => {
        const info = dimensionInfo[key];
        return (
          <div
            key={key}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                  {info.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {info.description}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${getScoreColor(dim.score)}`}>
                  {dim.score}
                </span>
                <span className="text-sm text-gray-400 ml-1">/ 100</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-3">
              <div
                className={`h-full rounded-full transition-all ${getProgressColor(dim.score)}`}
                style={{ width: `${dim.score}%` }}
              />
            </div>

            {/* Sub-component breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {Object.entries(dim.breakdown).map(([subKey, value]) => (
                <div
                  key={subKey}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {subKey.replace(/_/g, ' ')}
                  </div>
                  <div className={`text-lg font-semibold ${getScoreColor(value)}`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Flags */}
            {dim.flags.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                  Issues Found:
                </div>
                <ul className="space-y-1">
                  {dim.flags.map((flag, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2"
                    >
                      <span className="text-amber-500 mt-0.5">!</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
