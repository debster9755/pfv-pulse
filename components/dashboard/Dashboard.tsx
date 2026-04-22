"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, RefreshCw, Activity } from "lucide-react";
import { ChatInterface } from "./ChatInterface";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { SalesProjectionChart } from "./SalesProjectionChart";
import { DeltaTable } from "./DeltaTable";
import { SentimentHeatmap } from "./SentimentHeatmap";
import { RecommendationCard } from "./RecommendationCard";
import { CsvUploader } from "./CsvUploader";

interface Product {
  id: string;
  name: string;
  brand: string;
  msrp: number;
  isTarget: boolean;
}

interface AnalyticsData {
  target: { id: string; name: string; msrp: number; currentPrice: number };
  deltas: object[];
  projections: object[];
  wowSentiment: object[];
  regression: { r2: number } | null;
  recommendation: object;
}

interface Price {
  scrapedAt: string;
  retailer: string;
  price: number;
}

export function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [scraping, setScraping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProducts = useCallback(async (q = "") => {
    const res = await fetch(`/api/products${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setProducts(data.products ?? []);
  }, []);

  const fetchAnalytics = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoadingAnalytics(true);
    try {
      const [analyticsRes, pricesRes] = await Promise.all([
        fetch(`/api/analytics?targetId=${id}`),
        fetch(`/api/prices?productId=${id}&days=30`),
      ]);
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      const pricesData = await pricesRes.json();
      setPrices(pricesData.prices ?? []);
    } finally {
      if (!silent) setLoadingAnalytics(false);
    }
  }, []);

  // Auto-poll every 6s after product selection to catch async enrichment
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let ticks = 0;
    pollRef.current = setInterval(() => {
      ticks++;
      fetchAnalytics(id, true);
      fetchProducts();
      if (ticks >= 10) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 6000);
  }, [fetchAnalytics, fetchProducts]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    if (selectedId) {
      fetchAnalytics(selectedId);
      startPolling(selectedId);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedId, fetchAnalytics, startPolling]);

  async function triggerScrape() {
    if (!selectedId || scraping) return;
    setScraping(true);
    await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedId, type: "full" }),
    });
    setTimeout(() => {
      fetchAnalytics(selectedId);
      setScraping(false);
    }, 5000);
  }

  const targetProduct = products.find((p) => p.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">PFV-Pulse</span>
            <span className="ml-1 text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 font-medium">
              SpecDelta
            </span>
          </div>

          {/* SKU Search */}
          <div className="flex flex-1 max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by SKU or product name…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchProducts(e.target.value);
              }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-2">
            {selectedId && (
              <button
                onClick={triggerScrape}
                disabled={scraping}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${scraping ? "animate-spin" : ""}`} />
                {scraping ? "Scraping…" : "Refresh Data"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Target product selector */}
        {products.filter((p) => p.isTarget).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {products.filter((p) => p.isTarget).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedId === p.id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Chat + CSV upload row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChatInterface
            onProductAdded={(id) => {
              setSelectedId(id);
              fetchProducts();
            }}
          />
          <CsvUploader />
        </div>

        {/* Analytics loading */}
        {loadingAnalytics && (
          <div className="flex h-40 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-sm">Loading analytics…</span>
            </div>
          </div>
        )}

        {analytics && !loadingAnalytics && (
          <>
            <RecommendationCard recommendation={analytics.recommendation as Parameters<typeof RecommendationCard>[0]["recommendation"]} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PriceHistoryChart
                prices={prices}
                productName={targetProduct?.name ?? ""}
              />
              <SalesProjectionChart
                projections={analytics.projections as Parameters<typeof SalesProjectionChart>[0]["projections"]}
                r2={analytics.regression?.r2}
              />
            </div>

            <DeltaTable
              deltas={analytics.deltas as Parameters<typeof DeltaTable>[0]["deltas"]}
              targetName={targetProduct?.name ?? ""}
            />

            <SentimentHeatmap
              data={analytics.wowSentiment as Parameters<typeof SentimentHeatmap>[0]["data"]}
            />
          </>
        )}

        {!selectedId && !loadingAnalytics && (
          <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-white text-gray-400">
            <Activity className="h-10 w-10" />
            <p className="text-sm font-medium text-center">
              Use the chat above to start tracking a product.<br />
              Try: <span className="font-semibold text-gray-600">&ldquo;Track HP Omen 16 against Lenovo Legion 5&rdquo;</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
