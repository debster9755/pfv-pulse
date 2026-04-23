"use client";

import { TrendingDown, TrendingUp, Minus, AlertCircle, CheckCircle } from "lucide-react";

interface Reason {
  weight: "high" | "medium" | "low";
  text: string;
}

interface PricingRecommendation {
  action: "LOWER_PRICE" | "RAISE_PRICE" | "HOLD";
  shouldAct: boolean;
  currentPrice: number;
  suggestedPrice: number;
  changePercent: number;
  confidence: number;
  reasons: Reason[];
  generatedAt: string;
}

interface RecommendationCardProps {
  recommendation: PricingRecommendation;
}

const actionConfig = {
  LOWER_PRICE: {
    label: "Lower Price",
    icon: TrendingDown,
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-600",
    badgeBg: "bg-red-600",
  },
  RAISE_PRICE: {
    label: "Raise Price",
    icon: TrendingUp,
    bg: "bg-green-50",
    border: "border-green-200",
    iconColor: "text-green-600",
    badgeBg: "bg-green-600",
  },
  HOLD: {
    label: "Hold Price",
    icon: Minus,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-600",
  },
};

const weightConfig = {
  high: { dot: "bg-red-500", label: "High signal" },
  medium: { dot: "bg-yellow-500", label: "Medium signal" },
  low: { dot: "bg-gray-400", label: "Low signal" },
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const cfg = actionConfig[recommendation.action];
  const Icon = cfg.icon;
  const confidencePct = Math.round(recommendation.confidence * 100);

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-5 shadow-sm`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2.5 bg-white shadow-sm ${cfg.iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Pricing Recommendation
            </p>
            <h3 className="text-xl font-bold text-gray-900">{cfg.label}</h3>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-white ${cfg.badgeBg}`}
          >
            {recommendation.shouldAct ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {recommendation.shouldAct ? "Action Required" : "No Action Needed"}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Confidence: {confidencePct}%
          </p>
        </div>
      </div>

      {/* Price block */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Current Price</p>
          <p className="text-lg font-bold text-gray-900">
            ${recommendation.currentPrice.toFixed(2)}
          </p>
        </div>
        <div className={`rounded-lg bg-white border-2 ${cfg.border} p-3 text-center`}>
          <p className="text-xs text-gray-500">Suggested Price</p>
          <p className={`text-lg font-bold ${cfg.iconColor}`}>
            ${recommendation.suggestedPrice.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Change</p>
          <p
            className={`text-lg font-bold ${
              recommendation.changePercent < 0
                ? "text-red-600"
                : recommendation.changePercent > 0
                ? "text-green-600"
                : "text-gray-600"
            }`}
          >
            {recommendation.changePercent > 0 ? "+" : ""}
            {recommendation.changePercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Signal Confidence</span>
          <span>{confidencePct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cfg.badgeBg}`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      {/* Reasons */}
      {recommendation.reasons.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Top Reasons
          </p>
          {recommendation.reasons.map((reason, i) => {
            const wCfg = weightConfig[reason.weight];
            return (
              <div key={i} className="flex gap-2.5 rounded-lg bg-white border border-gray-100 p-3">
                <div className="mt-1.5 shrink-0">
                  <div className={`h-2 w-2 rounded-full ${wCfg.dot}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{wCfg.label}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{reason.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400 text-right">
        Generated {new Date(recommendation.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
