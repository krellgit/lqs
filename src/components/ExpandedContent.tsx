'use client';

interface ExpandedContentProps {
  asin: string;
  content: {
    title: string;
    bullet_points: string[];
    description?: string;
    backend_keywords?: string[];
  };
  onViewFull: () => void;
  onCollapse: () => void;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export default function ExpandedContent({
  asin,
  content,
  onViewFull,
  onCollapse
}: ExpandedContentProps) {
  const bulletCount = content.bullet_points.length;
  const descLength = content.description?.length || 0;
  const keywordCount = content.backend_keywords?.length || 0;

  return (
    <tr className="bg-gray-50 dark:bg-gray-900/50">
      <td colSpan={11} className="px-4 py-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Content Preview - {asin}
            </h3>
            <button
              onClick={onCollapse}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Collapse
            </button>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Title
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {content.title.length}/200 chars
              </span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
              {content.title}
            </div>
          </div>

          {/* Bullets */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Bullet Points
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {bulletCount}/5
              </span>
            </div>
            <div className="space-y-1">
              {content.bullet_points.slice(0, 5).map((bullet, idx) => (
                <div
                  key={idx}
                  className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700"
                >
                  <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">
                    {idx + 1}.
                  </span>
                  {truncateText(bullet, 150)}
                </div>
              ))}
              {bulletCount < 5 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Missing {5 - bulletCount} bullet point(s)
                </div>
              )}
            </div>
          </div>

          {/* Content Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Description: {descLength > 0 ? `${descLength} chars` : 'None'}
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Keywords: {keywordCount}/10
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onViewFull}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Full Content & Analysis
            </button>
            <button
              onClick={onCollapse}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              Collapse
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
