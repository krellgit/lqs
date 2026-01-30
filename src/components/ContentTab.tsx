'use client';

import { useState } from 'react';

interface ContentTabProps {
  asin: string;
  content: {
    title: string;
    bullet_points: string[];
    description?: string;
    backend_keywords?: string[];
  };
}

export default function ContentTab({ asin, content }: ContentTabProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const CopyButton = ({ text, section }: { text: string; section: string }) => (
    <button
      onClick={() => handleCopy(text, section)}
      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title="Copy to clipboard"
    >
      {copiedSection === section ? (
        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
              Title
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              content.title.length >= 150 && content.title.length <= 200
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {content.title.length}/200 chars
            </span>
          </div>
          <CopyButton text={content.title} section="title" />
        </div>
        <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
          {content.title}
        </div>
      </div>

      {/* Bullet Points Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
              Bullet Points
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              content.bullet_points.length === 5
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {content.bullet_points.length}/5
            </span>
          </div>
          <CopyButton
            text={content.bullet_points.join('\n\n')}
            section="bullets"
          />
        </div>
        <div className="space-y-3">
          {content.bullet_points.map((bullet, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                  {bullet}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {bullet.length} chars
                </div>
              </div>
            </div>
          ))}
          {content.bullet_points.length < 5 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded p-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Missing {5 - content.bullet_points.length} bullet point(s) - Incomplete listing
            </div>
          )}
        </div>
      </div>

      {/* Description Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
              Description
            </h3>
            {content.description && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {content.description.length} chars
              </span>
            )}
          </div>
          {content.description && (
            <CopyButton text={content.description} section="description" />
          )}
        </div>
        {content.description ? (
          <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
            {content.description}
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            No description provided
          </div>
        )}
      </div>

      {/* Backend Keywords Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
              Backend Keywords
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              (content.backend_keywords?.length || 0) >= 5
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {content.backend_keywords?.length || 0}/10
            </span>
          </div>
          {content.backend_keywords && content.backend_keywords.length > 0 && (
            <CopyButton
              text={content.backend_keywords.join(', ')}
              section="keywords"
            />
          )}
        </div>
        {content.backend_keywords && content.backend_keywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {content.backend_keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            No backend keywords provided
          </div>
        )}
      </div>

      {/* Copy All Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => {
            const allContent = `TITLE:\n${content.title}\n\nBULLET POINTS:\n${content.bullet_points.map((b, i) => `${i + 1}. ${b}`).join('\n\n')}\n\nDESCRIPTION:\n${content.description || 'N/A'}\n\nBACKEND KEYWORDS:\n${content.backend_keywords?.join(', ') || 'N/A'}`;
            handleCopy(allContent, 'all');
          }}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all flex items-center gap-2 shadow-md"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copiedSection === 'all' ? 'Copied!' : 'Copy All Content'}
        </button>
      </div>
    </div>
  );
}
