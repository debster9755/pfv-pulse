"use client";

import { useState, useEffect, useCallback } from "react";
import ModuleSettings from "./ModuleSettings";
import PriceHistoryChart from "./PriceHistoryChart";
import SalesChart from "./SalesChart";
import SentimentPanel from "./SentimentPanel";
import RecommendationCard from "./RecommendationCard";
import CsvUpload from "./CsvUpload";
import type { ModuleSettings as ModuleSettingsType, RecommendationData, SentimentData, CorrelationData } from "@/types";

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

  const activeProduct = historyQuery || "HP Omen 16";

  const fetchRecommendation = useCallback(async () => {
    setRecLoading(true);
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
    } finally {
      setRecLoading(false);
    }
  }, [activeProduct, modules]);

  const fetchSentiment = useCallback(async () => {
    if (!modules.sentiment) { setSentiment(null); return; }
    try {
      const res = await fetch(`/api/modules/sentiment?product=${encodeURIComponent(activeProduct)}`);
      const data: SentimentApiResponse = await res.json();
      setSentiment(data.sentiment ?? null);
    } catch {
      setSentiment(null);
    }
  }, [activeProduct, modules.sentiment]);

  const fetchCorrelation = useCallback(async () => {
    if (!modules.correlation) { setCorrelation(null); return; }
    try {
      const res = await fetch(`/api/modules/correlation?product=${encodeURIComponent(activeProduct)}`);
      const data: CorrelationApiResponse = await res.json();
      setCorrelation(data.correlation ?? null);
    } catch {
      setCorrelation(null);
    }
  }, [activeProduct, modules.correlation]);

  useEffect(() => {
    fetchRecommendation();
    fetchSentiment();
    fetchCorrelation();
  }, [fetchRecommendation, fetchSentiment, fetchCorrelation]);

  useEffect(() => {
    if (forceRecommendation) fetchRecommendation();
  }, [forceRecommendation, fetchRecommendation]);

  return (
    <div className="space-y-4">
      {/* Module settings */}
      <ModuleSettings settings={modules} onChange={setModules} />

      {/* Recommendation card — always visible */}
      <RecommendationCard recommendation={recommendation} loading={recLoading} />

      {/* 30-day price history */}
      {historyQuery && <PriceHistoryChart query={historyQuery} />}

      {/* Sentiment heat-scale */}
      <SentimentPanel sentiment={sentiment} enabled={modules.sentiment} />

      {/* Sales projection */}
      <SalesChart correlation={correlation} enabled={modules.correlation} />

      {/* CSV upload */}
      <CsvUpload />
    </div>
  );
}
