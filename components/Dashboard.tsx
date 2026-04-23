"use client";

import { useState, useCallback } from "react";
import ModuleSettings from "./ModuleSettings";
import PriceHistoryChart from "./PriceHistoryChart";
import SalesChart from "./SalesChart";
import SentimentPanel from "./SentimentPanel";
import RecommendationCard from "./RecommendationCard";
import CsvUpload from "./CsvUpload";
import EmptyState from "./EmptyState";
import { RefreshCw } from "lucide-react";
import type {
  ModuleSettings as ModuleSettingsType,
  RecommendationData,
  SentimentData,
  CorrelationData,
} from "@/types";

const DEFAULT_MODULES: ModuleSettingsType = {
  reviews: true,
  sentiment: true,
  correlation: true,
};

interface DashboardProps {
  historyQuery: string;
  forceRecommendation: boolean;
}

interface RecommendationApiResponse {
  recommendation: RecommendationData;
}

interface SentimentApiResponse {
  sentiment: SentimentData;
}

interface CorrelationApiResponse {
  correlation: CorrelationData | null;
}

export default function Dashboard({ historyQuery, forceRecommendation }: DashboardProps) {
  const [modules, setModules] = useState<ModuleSettingsType>(DEFAULT_MODULES);
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationData | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [analysisRun, setAnalysisRun] = useState(false);

  const activeProduct = historyQuery || "HP Omen 16";

  const runAnalysis = useCallback(async () => {
    setRecLoading(true);
    setAnalysisRun(true);

    // Run all enabled fetches in parallel
    const tasks: Promise<void>[] = [];

    tasks.push(
      (async () => {
        try {
          const params = new URLSearchParams({
            product: activeProduct,
            reviews: String(modules.reviews),
            sentiment: String(modules.sentiment),
            correlation: String(modules.correlation),
          });
          const res = await fetch(`/api/modules/recommendation?${params.toString()}`);
          const data: RecommendationApiResponse = await res.json();
          setRecommendation(data.recommendation ?? null);
        } catch {
          setRecommendation(null);
        }
      })()
    );

    if (modules.sentiment) {
      tasks.push(
        (async () => {
          try {
            const res = await fetch(
              `/api/modules/sentiment?product=${encodeURIComponent(activeProduct)}`
            );
            const data: SentimentApiResponse = await res.json();
            setSentiment(data.sentiment ?? null);
          } catch {
            setSentiment(null);
          }
        })()
      );
    }

    if (modules.correlation) {
      tasks.push(
        (async () => {
          try {
            const res = await fetch(
              `/api/modules/correlation?product=${encodeURIComponent(activeProduct)}`
            );
            const data: CorrelationApiResponse = await res.json();
            setCorrelation(data.correlation ?? null);
          } catch {
            setCorrelation(null);
          }
        })()
      );
    }

    await Promise.allSettled(tasks);
    setRecLoading(false);
  }, [activeProduct, modules]);

  // Trigger when parent asks for recommendation refresh (e.g. from chat)
  const [prevForce, setPrevForce] = useState(false);
  if (forceRecommendation !== prevForce) {
    setPrevForce(forceRecommendation);
    if (forceRecommendation) runAnalysis();
  }

  return (
    <div className="space-y-4">
      {/* Module settings */}
      <ModuleSettings settings={modules} onChange={setModules} />

      {/* Run Analysis button — on-demand, not auto-firing on mount */}
      <button
        onClick={runAnalysis}
        disabled={recLoading}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-hp-blue/20 bg-hp-blue/5 hover:bg-hp-blue/10 disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-hp-blue transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${recLoading ? "animate-spin" : ""}`} />
        {recLoading ? "Running analysis…" : `Run Intelligence Analysis${historyQuery ? ` — ${historyQuery}` : ""}`}
      </button>

      {/* Recommendation card */}
      {analysisRun ? (
        <RecommendationCard recommendation={recommendation} loading={recLoading} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-800">Revenue-Boost Recommendation</h2>
          </div>
          <div className="p-4">
            <EmptyState
              reason="unavailable"
              label="Run Analysis to Generate Recommendation"
              className="min-h-[140px]"
            />
          </div>
        </div>
      )}

      {/* 30-day price history — only shown after chat triggers a query */}
      {historyQuery && <PriceHistoryChart query={historyQuery} />}

      {/* Sentiment heat-scale */}
      <SentimentPanel
        sentiment={analysisRun ? sentiment : null}
        enabled={modules.sentiment}
      />

      {/* Sales projection */}
      <SalesChart
        correlation={analysisRun ? correlation : null}
        enabled={modules.correlation}
      />

      {/* CSV upload */}
      <CsvUpload />
    </div>
  );
}
