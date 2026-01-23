'use client';

import { useState, useEffect, useCallback } from 'react';
import ScoresTable from '@/components/ScoresTable';
import StatsOverview from '@/components/StatsOverview';
import ScoreCard from '@/components/ScoreCard';
import RadarChart from '@/components/RadarChart';
import DimensionBreakdown from '@/components/DimensionBreakdown';
import Recommendations from '@/components/Recommendations';
import { LQSResult } from '@/lib/types';

interface ScoreEntry {
  asin: string;
  msku?: string;
  productName?: string;
  lqs: LQSResult;
  lastModified: string;
  fileName: string;
}

interface ScoresResponse {
  configured: boolean;
  scores?: ScoreEntry[];
  errors?: Array<{ asin: string; error: string }>;
  meta?: {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    timestamp: string;
    source: string;
    bucket?: string;
    prefix?: string;
  };
  error?: string;
}

type LoadingState = 'loading' | 'loaded' | 'error' | 'not_configured';

export default function Home() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ScoreEntry | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [meta, setMeta] = useState<ScoresResponse['meta'] | null>(null);

  const fetchScores = useCallback(async () => {
    setLoadingState('loading');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scores');
      const data: ScoresResponse = await res.json();

      if (!data.configured) {
        setLoadingState('not_configured');
        setErrorMessage(data.error || 'S3 not configured');
        return;
      }

      if (data.error) {
        setLoadingState('error');
        setErrorMessage(data.error);
        return;
      }

      setScores(data.scores || []);
      setMeta(data.meta || null);
      setLastUpdated(data.meta?.timestamp || new Date().toISOString());
      setLoadingState('loaded');
    } catch (err) {
      setLoadingState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch scores');
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, []);

  const handleSelect = (entry: ScoreEntry) => {
    setSelectedEntry(entry);
    // Scroll to detail section
    setTimeout(() => {
      document.getElementById('detail-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCloseDetail = () => {
    setSelectedEntry(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-4 border-blue-500 sticky top-0 z-10 shadow-xl">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  LQS Dashboard
                </h1>
                <p className="text-sm text-slate-300">
                  {loadingState === 'loaded' && scores.length > 0
                    ? `${scores.length} listings • 6-dimension quality analysis`
                    : loadingState === 'loading'
                    ? 'Loading quality scores...'
                    : 'Listing Quality Score Calculator'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {loadingState === 'loaded' && (
                <button
                  onClick={() => { setSelectedEntry(null); fetchScores(); }}
                  className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-medium shadow-md flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
              {meta && (
                <div className="text-xs text-slate-400 hidden md:block">
                  Source: {meta.bucket}/{meta.prefix}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1800px] mx-auto w-full px-6 py-6">
        {/* Not Configured State */}
        {loadingState === 'not_configured' && (
          <div className="max-w-2xl mx-auto py-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                S3 Not Configured
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Set the following environment variables in Vercel:
              </p>
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-left font-mono text-sm text-gray-700 dark:text-gray-300">
                <div>AWS_ACCESS_KEY_ID</div>
                <div>AWS_SECRET_ACCESS_KEY</div>
                <div>AWS_REGION</div>
                <div>S3_BUCKET</div>
                <div>S3_PREFIX</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingState === 'loading' && (
          <div className="max-w-2xl mx-auto py-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading LQS scores from S3...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {loadingState === 'error' && errorMessage && (
          <div className="max-w-2xl mx-auto py-12">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-300 mb-2">
                Error Loading Scores
              </h2>
              <p className="text-red-600 dark:text-red-400 mb-4">{errorMessage}</p>
              <button
                onClick={fetchScores}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loaded State */}
        {loadingState === 'loaded' && (
          <div className="space-y-6">
            {/* Stats Overview - Top */}
            <StatsOverview scores={scores} />

            {/* Scores Table - Full Width */}
            <div>
              <ScoresTable
                scores={scores}
                onSelect={handleSelect}
                selectedAsin={selectedEntry?.asin || null}
              />
            </div>

            {/* Detail View - Below Table */}
            {selectedEntry && (
              <div id="detail-section" className="space-y-4 pt-4 border-t-4 border-blue-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Detailed Analysis: {selectedEntry.asin}
                  </h2>
                  <button
                    onClick={handleCloseDetail}
                    className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>

                {/* Two column layout for detail */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    <ScoreCard result={selectedEntry.lqs} />
                    <RadarChart result={selectedEntry.lqs} />
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    <Recommendations recommendations={selectedEntry.lqs.recommendations} />
                    <DimensionBreakdown result={selectedEntry.lqs} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {loadingState === 'loaded' && scores.length === 0 && (
          <div className="max-w-2xl mx-auto py-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Reports Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                No JSON reports found in the configured S3 location.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t-4 border-blue-500 mt-auto">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>LQS Dashboard - Listing Quality Score Calculator</span>
            {lastUpdated && (
              <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
