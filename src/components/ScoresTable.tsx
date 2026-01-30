'use client';

import { LQSResult, Grade } from '@/lib/types';
import ExpandedContent from './ExpandedContent';

interface ScoreEntry {
  asin: string;
  msku?: string;
  productName?: string;
  lqs: LQSResult;
  lastModified: string;
  fileName: string;
  content: {
    title: string;
    bullet_points: string[];
    description?: string;
    backend_keywords?: string[];
  };
}

interface ScoresTableProps {
  scores: ScoreEntry[];
  onSelect: (entry: ScoreEntry) => void;
  selectedAsin: string | null;
  expandedRows: Set<string>;
  onToggleExpand: (asin: string) => void;
}

const gradeColors: Record<Grade, string> = {
  A: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  C: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  D: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  F: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

// Component to show sub-score status dots
function SubScoreDots({ breakdown }: { breakdown: Record<string, number> }) {
  const values = Object.values(breakdown);
  return (
    <div className="flex items-center justify-center gap-0.5 mt-0.5">
      {values.map((score, idx) => (
        <div
          key={idx}
          className={`w-1.5 h-1.5 rounded-full ${
            score >= 70 ? 'bg-green-500 dark:bg-green-400' : 'bg-red-400 dark:bg-red-500'
          }`}
          style={{ opacity: score >= 70 ? 0.8 : 0.6 }}
          title={`${score}`}
        />
      ))}
    </div>
  );
}

export default function ScoresTable({ scores, onSelect, selectedAsin, expandedRows, onToggleExpand }: ScoresTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">

              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ASIN
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title Preview
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                LQS
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Grade
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Keyword Optimization">
                KW
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="USP Effectiveness">
                USP
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Readability">
                READ
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Competitive Position">
                COMP
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Customer Alignment">
                CUST
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Compliance">
                CMPL
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Flags
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {scores.map((entry) => {
              const isSelected = selectedAsin === entry.asin;
              const isExpanded = expandedRows.has(entry.asin);
              const dims = entry.lqs.dimensions;
              const totalFlags = Object.values(dims).reduce((sum, d) => sum + d.flags.length, 0);
              const titlePreview = entry.content.title.length > 60
                ? entry.content.title.substring(0, 60) + '...'
                : entry.content.title;

              return (
                <>
                  <tr
                    key={entry.asin}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExpand(entry.asin);
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <svg
                          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                    <td
                      onClick={() => onSelect(entry)}
                      className="px-4 py-3 whitespace-nowrap"
                    >
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.asin}
                      </span>
                    </td>
                    <td
                      onClick={() => onSelect(entry)}
                      className="px-4 py-3"
                    >
                      <div className="text-sm text-gray-900 dark:text-gray-100 max-w-md" title={entry.content.title}>
                        {titlePreview}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span title="Bullet points">📝 {entry.content.bullet_points.length}/5</span>
                        <span title="Description">{entry.content.description ? `📄 ${entry.content.description.length}ch` : '📄 None'}</span>
                        <span title="Keywords">🏷️ {entry.content.backend_keywords?.length || 0}/10</span>
                      </div>
                    </td>
                  <td
                    onClick={() => onSelect(entry)}
                    className="px-4 py-3 text-center"
                  >
                    <span className={`text-lg font-bold ${getScoreColor(entry.lqs.lqs_total)}`}>
                      {entry.lqs.lqs_total}
                    </span>
                  </td>
                  <td
                    onClick={() => onSelect(entry)}
                    className="px-4 py-3 text-center"
                  >
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold ${gradeColors[entry.lqs.grade as Grade]}`}>
                      {entry.lqs.grade}
                    </span>
                  </td>
                  <td
                    onClick={() => onSelect(entry)}
                    className="px-4 py-3 text-center"
                  >
                    <div>
                      <span className={`text-sm font-medium ${getScoreColor(dims.keyword_optimization.score)}`}>
                        {dims.keyword_optimization.score}
                      </span>
                      <SubScoreDots breakdown={dims.keyword_optimization.breakdown} />
                    </div>
                  </td>
                  <td
                    onClick={() => onSelect(entry)}
                    className="px-4 py-3 text-center"
                  >
                    <div>
                      <span className={`text-sm font-medium ${getScoreColor(dims.usp_effectiveness.score)}`}>
                        {dims.usp_effectiveness.score}
                      </span>
                      <SubScoreDots breakdown={dims.usp_effectiveness.breakdown} />
                    </div>
                  </td>
                  <td
                    onClick={() => onSelect(entry)}
                    className="px-4 py-3 text-center"
                  >
                    <div>
                      <span className={`text-sm font-medium ${getScoreColor(dims.readability.score)}`}>
                        {dims.readability.score}
                      </span>
                      <SubScoreDots breakdown={dims.readability.breakdown} />
                    </div>
                  </td>
                  <td
                    onClick={() => onSelect(entry)}
                    className="px-4 py-3 text-center"
                  >
                    <div>
                      <span className={`text-sm font-medium ${getScoreColor(dims.competitive_position.score)}`}>
                        {dims.competitive_position.score}
                      </span>
                      <SubScoreDots breakdown={dims.competitive_position.breakdown} />
                    </div>
                  </td>
                  <td
                    onClick={() => onSelect(entry)}
                    className="px-4 py-3 text-center"
                  >
                    <div>
                      <span className={`text-sm font-medium ${getScoreColor(dims.customer_alignment.score)}`}>
                        {dims.customer_alignment.score}
                      </span>
                      <SubScoreDots breakdown={dims.customer_alignment.breakdown} />
                    </div>
                  </td>
                  <td
                    onClick={() => onSelect(entry)}
                    className="px-4 py-3 text-center"
                  >
                    <div>
                      <span className={`text-sm font-medium ${getScoreColor(dims.compliance.score)}`}>
                        {dims.compliance.score}
                      </span>
                      <SubScoreDots breakdown={dims.compliance.breakdown} />
                    </div>
                  </td>
                  <td
                    onClick={() => onSelect(entry)}
                    className="px-4 py-3 text-center"
                  >
                    {totalFlags > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        {totalFlags}
                      </span>
                    ) : (
                      <span className="text-green-500">-</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <ExpandedContent
                    asin={entry.asin}
                    content={entry.content}
                    onViewFull={() => onSelect(entry)}
                    onCollapse={() => onToggleExpand(entry.asin)}
                  />
                )}
              </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
