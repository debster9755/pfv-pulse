"use client";

import { ExportButton } from "../ui/ExportButton";

interface WeekSentiment {
  weekOf: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  netScore: number;
}

interface SentimentHeatmapProps {
  data: WeekSentiment[];
}

function getHeatColor(netScore: number): string {
  // -1 → deep red, 0 → neutral gray, +1 → deep green
  if (netScore >= 0.6) return "bg-green-600 text-white";
  if (netScore >= 0.3) return "bg-green-400 text-white";
  if (netScore >= 0.1) return "bg-green-200 text-green-900";
  if (netScore >= -0.1) return "bg-gray-200 text-gray-700";
  if (netScore >= -0.3) return "bg-red-200 text-red-900";
  if (netScore >= -0.6) return "bg-red-400 text-white";
  return "bg-red-600 text-white";
}

export function SentimentHeatmap({ data }: SentimentHeatmapProps) {
  const exportData = data as unknown as Record<string, unknown>[];

  const wowChanges = data.map((d, i) => ({
    ...d,
    wow: i > 0 ? d.netScore - data[i - 1].netScore : 0,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Review Sentiment Heat-Scale</h3>
          <p className="text-xs text-gray-500 mt-0.5">Week-on-Week review sentiment tracking</p>
        </div>
        <ExportButton data={exportData} filename="sentiment-wow.csv" />
      </div>

      {data.length === 0 ? (
        <div className="flex h-28 items-center justify-center text-sm text-gray-400">
          No review data yet.
        </div>
      ) : (
        <>
          {/* Heat cells */}
          <div className="flex flex-wrap gap-2 mb-4">
            {wowChanges.map((week, i) => (
              <div
                key={week.weekOf}
                className={`group relative flex flex-col items-center justify-center rounded-lg p-2 min-w-[64px] cursor-default transition-transform hover:scale-105 ${getHeatColor(week.netScore)}`}
                title={`${week.weekOf}\nPositive: ${week.positive}\nNegative: ${week.negative}\nNet: ${(week.netScore * 100).toFixed(0)}%`}
              >
                <span className="text-xs font-semibold">{week.weekOf.slice(5)}</span>
                <span className="text-lg font-bold">
                  {week.netScore >= 0 ? "+" : ""}{(week.netScore * 100).toFixed(0)}%
                </span>
                {i > 0 && (
                  <span className="text-xs opacity-80">
                    WoW: {week.wow >= 0 ? "+" : ""}{(week.wow * 100).toFixed(0)}%
                  </span>
                )}
                <span className="text-xs opacity-70">{week.total} reviews</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-red-600" />
              <span>Very Negative</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-gray-200" />
              <span>Neutral</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-600" />
              <span>Very Positive</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
