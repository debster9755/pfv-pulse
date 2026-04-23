"use client";

import type { RecommendationData } from "@/types";
import EmptyState from "./EmptyState";
import { CheckCircle, XCircle, PauseCircle, AlertTriangle, Zap } from "lucide-react";

interface RecommendationCardProps {
  recommendation: RecommendationData | null;
  loading?: boolean;
}

const ACTION_CONFIG = {
  YES: {
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    label: "Adjust Price",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  NO: {
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    label: "Hold Pricing",
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
  },
  HOLD: {
    icon: <PauseCircle className="w-5 h-5 text-amber-500" />,
    label: "Monitor",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
  },
};

const CONFIDENCE_COLORS = {
  HIGH: "text-emerald-600 bg-emerald-100",
  MEDIUM: "text-amber-600 bg-amber-100",
  LOW: "text-red-500 bg-red-100",
};

export default function RecommendationCard({ recommendation, loading }: RecommendationCardProps) {
  if (loading) return <EmptyState reason="loading" className="min-h-[200px]" />;
  if (!recommendation) {
    return <EmptyState reason="unavailable" label="No Recommendation Available" className="min-h-[200px]" />;
  }

  const { action, suggestedPrice, currentPrice, confidence, reasons, dataQualityNote } = recommendation;
  const cfg = ACTION_CONFIG[action];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Zap className="w-4 h-4 text-hp-blue" />
        <h2 className="text-sm font-semibold text-gray-800">Revenue-Boost Recommendation</h2>
        <span
          className={`ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${CONFIDENCE_COLORS[confidence]}`}
        >
          {confidence} confidence
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${cfg.bg}`}>
          <div className="flex items-center gap-2">
            {cfg.icon}
            <div>
              <p className={`text-sm font-bold ${cfg.text}`}>Action: {action}</p>
              <p className={`text-xs ${cfg.text} opacity-80`}>{cfg.label}</p>
            </div>
          </div>
          {suggestedPrice != null && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Suggested Price</p>
              <p className={`text-lg font-bold ${cfg.text}`}>${suggestedPrice.toFixed(2)}</p>
              {currentPrice != null && currentPrice !== suggestedPrice && (
                <p className="text-[10px] text-gray-400">
                  Current: ${currentPrice.toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Top Reasons
          </p>
          {reasons.map((reason, i) => (
            <div key={i} className="flex gap-2 text-sm text-gray-700">
              <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-hp-blue text-white text-[10px] flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <p className="leading-snug">{reason}</p>
            </div>
          ))}
        </div>

        {dataQualityNote && (
          <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{dataQualityNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
