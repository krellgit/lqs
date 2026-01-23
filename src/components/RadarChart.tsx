'use client';

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { LQSResult } from '@/lib/types';

interface RadarChartProps {
  result: LQSResult;
}

const dimensionLabels: Record<string, string> = {
  keyword_optimization: 'Keywords',
  usp_effectiveness: 'USPs',
  readability: 'Readability',
  competitive_position: 'Competition',
  customer_alignment: 'Customer',
  compliance: 'Compliance',
};

export default function RadarChart({ result }: RadarChartProps) {
  const data = Object.entries(result.dimensions).map(([key, dim]) => ({
    dimension: dimensionLabels[key] || key,
    score: dim.score,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-[350px] bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 text-center">
        Dimension Scores
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            formatter={(value) => [`${value}`, 'Score']}
          />
          <Radar
            name="LQS"
            dataKey="score"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.4}
            strokeWidth={2}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
