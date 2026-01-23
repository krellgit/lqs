'use client';

import { LQSResult, Grade } from '@/lib/types';

interface ScoreCardProps {
  result: LQSResult;
}

const gradeColors: Record<Grade, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-500' },
  B: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500' },
  C: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500' },
  D: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500' },
  F: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-500' },
};

const gradeDescriptions: Record<Grade, string> = {
  A: 'Excellent - Ready for MYE testing',
  B: 'Good - Minor improvements recommended',
  C: 'Acceptable - Review flagged dimensions',
  D: 'Needs Work - Multiple dimensions need attention',
  F: 'Poor - Significant rewrite required',
};

export default function ScoreCard({ result }: ScoreCardProps) {
  const grade = result.grade as Grade;
  const colors = gradeColors[grade];

  return (
    <div className={`p-6 rounded-xl border-2 ${colors.border} ${colors.bg}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Listing Quality Score
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">ASIN: {result.asin}</p>
        </div>
        <div className="text-right">
          <div className={`text-5xl font-bold ${colors.text}`}>{result.lqs_total}</div>
          <div className={`text-2xl font-bold ${colors.text}`}>Grade: {grade}</div>
        </div>
      </div>

      <p className={`text-sm ${colors.text} mb-4`}>{gradeDescriptions[grade]}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(result.dimensions).map(([key, dim]) => (
          <div
            key={key}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {formatDimensionName(key)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {dim.score}
              </span>
              <span className="text-xs text-gray-400">
                ({(dim.weight * 100).toFixed(0)}%)
              </span>
            </div>
            {dim.flags.length > 0 && (
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  {dim.flags.length} flag{dim.flags.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDimensionName(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
