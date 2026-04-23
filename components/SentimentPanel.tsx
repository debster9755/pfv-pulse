"use client";

import type { SentimentData } from "@/types";
import EmptyState from "./EmptyState";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SentimentPanelProps {
  sentiment: SentimentData | null;
  enabled: boolean;
}

function HeatBar({ positive, negative, neutral }: { positive: number; negative: number; neutral: number }) {
  const total = positive + negative + neutral || 1;
  return (
    <div className="flex h-3 w-full rounded-full overflow-hidden gap-px">
      <div
        className="bg-emerald-400 transition-all duration-500"
        style={{ width: `${(positive / total) * 100}%` }}
        title={`Positive: ${positive}`}
      />
      <div
        className="bg-gray-200 transition-all duration-500"
        style={{ width: `${(neutral / total) * 100}%` }}
        title={`Neutral: ${neutral}`}
      />
      <div
        className="bg-red-400 transition-all duration-500"
        style={{ width: `${(negative / total) * 100}%` }}
        title={`Negative: ${negative}`}
      />
    </div>
  );
}

export default function SentimentPanel({ sentiment, enabled }: SentimentPanelProps) {
  if (!enabled) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">Review Sentiment</h3>
        </div>
        <div className="p-4">
          <EmptyState reason="disabled" className="min-h-[120px]" />
        </div>
      </div>
    );
  }

  if (!sentiment) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">Review Sentiment</h3>
        </div>
        <div className="p-4">
          <EmptyState reason="unavailable" className="min-h-[120px]" />
        </div>
      </div>
    );
  }

  const { positive, negative, neutral, total, score, label, weekOverWeekDelta } = sentiment;

  const labelConfig = {
    positive: { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    negative: { color: "text-red-500", bg: "bg-red-50 border-red-200" },
    neutral: { color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">Review Sentiment (WoW)</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${labelConfig[label].bg}`}>
          <span className={`text-sm font-semibold capitalize ${labelConfig[label].color}`}>
            {label}
          </span>
          <span className={`text-xs font-mono ${labelConfig[label].color}`}>
            Score: {score.toFixed(2)}
          </span>
        </div>
        <HeatBar positive={positive} negative={negative} neutral={neutral} />
        <div className="flex justify-between text-xs text-gray-500">
          <span className="text-emerald-600 font-medium">+{positive} positive</span>
          <span>{neutral} neutral</span>
          <span className="text-red-500 font-medium">-{negative} negative</span>
        </div>
        <p className="text-xs text-gray-400">Based on {total} reviews</p>
        {weekOverWeekDelta !== null && (
          <div className="flex items-center gap-1.5 text-xs">
            {weekOverWeekDelta > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : weekOverWeekDelta < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span className="text-gray-500">
              WoW delta: {weekOverWeekDelta > 0 ? "+" : ""}
              {(weekOverWeekDelta * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
