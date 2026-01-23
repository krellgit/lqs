'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import ScoreCard from '@/components/ScoreCard';
import RadarChart from '@/components/RadarChart';
import DimensionBreakdown from '@/components/DimensionBreakdown';
import Recommendations from '@/components/Recommendations';
import { calculateLQS } from '@/lib/lqs-calculator';
import { PipelineOutput, LQSResult } from '@/lib/types';

export default function Home() {
  const [result, setResult] = useState<LQSResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleFileLoaded = (data: PipelineOutput) => {
    setIsCalculating(true);
    // Small delay for UX
    setTimeout(() => {
      const lqsResult = calculateLQS(data);
      setResult(lqsResult);
      setIsCalculating(false);
    }, 300);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                LQS Calculator
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Listing Quality Score - 6 Dimension Analysis
              </p>
            </div>
            {result && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Analyze Another
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!result ? (
          <div className="space-y-8">
            {/* Upload Section */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Upload Pipeline Output
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Drop your JSON output file to calculate the Listing Quality Score
              </p>
            </div>

            <FileUpload onFileLoaded={handleFileLoaded} />

            {isCalculating && (
              <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-300">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Calculating LQS...
              </div>
            )}

            {/* Info Section */}
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Keyword Optimization',
                  weight: '25%',
                  desc: 'Coverage and strategic placement of keywords',
                },
                {
                  title: 'USP Effectiveness',
                  weight: '20%',
                  desc: 'Coverage, differentiation, and proof strength',
                },
                {
                  title: 'Readability',
                  weight: '15%',
                  desc: 'Flesch score, scannability, title clarity',
                },
                {
                  title: 'Competitive Position',
                  weight: '15%',
                  desc: 'Uniqueness vs competitor listings',
                },
                {
                  title: 'Customer Alignment',
                  weight: '15%',
                  desc: 'Intent theme and pain point coverage',
                },
                {
                  title: 'Compliance',
                  weight: '10%',
                  desc: 'Banned terms and Amazon formatting',
                },
              ].map((dim) => (
                <div
                  key={dim.title}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-800 dark:text-gray-100">
                      {dim.title}
                    </h3>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {dim.weight}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {dim.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score Card */}
            <ScoreCard result={result} />

            {/* Two column layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Radar Chart */}
              <RadarChart result={result} />

              {/* Recommendations */}
              <Recommendations recommendations={result.recommendations} />
            </div>

            {/* Dimension Breakdown */}
            <DimensionBreakdown result={result} />

            {/* Timestamp */}
            <div className="text-center text-sm text-gray-400 dark:text-gray-500">
              Calculated at: {new Date(result.calculated_at).toLocaleString()}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-400 dark:text-gray-500">
        LQS Calculator - Part of the SaaS Listing Optimization Platform
      </footer>
    </div>
  );
}
