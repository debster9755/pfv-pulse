"use client";

import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import Dashboard from "@/components/Dashboard";
import { BarChart2, ChevronRight } from "lucide-react";

export default function Home() {
  const [historyQuery, setHistoryQuery] = useState("");
  const [forceRecommendation, setForceRecommendation] = useState(false);

  function handleRecommendationRequest() {
    setForceRecommendation((prev) => !prev);
  }

  return (
    <div className="flex flex-col min-h-screen bg-hp-surface">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-6 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-hp-blue flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="font-bold text-gray-900 tracking-tight">PFV</span>
              <span className="text-gray-300">·</span>
              <span className="font-semibold text-hp-blue">Pulse</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-xs text-gray-400 font-medium">
              Competitive Pricing & Market Intelligence
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-[11px] text-gray-400 font-medium hidden sm:block">
              Project SpecDelta
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live data
            </div>
          </div>
        </div>
      </header>

      {/* Main content — two-column layout */}
      <main className="flex-1 mx-auto w-full max-w-screen-2xl px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-5 h-full">

          {/* LEFT: Chat interface */}
          <div className="flex flex-col" style={{ minHeight: "calc(100vh - 112px)" }}>
            <ChatInterface
              onHistoryQuery={setHistoryQuery}
              onRecommendationRequest={handleRecommendationRequest}
            />
          </div>

          {/* RIGHT: Intelligence dashboard */}
          <div className="overflow-y-auto">
            <Dashboard
              historyQuery={historyQuery}
              forceRecommendation={forceRecommendation}
            />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-3 px-6">
        <div className="mx-auto max-w-screen-2xl flex items-center justify-between text-[11px] text-gray-400">
          <span>PFV-Pulse · Project SpecDelta · © 2025</span>
          <span>Data: Best Buy API · SerpApi · Keepa · Playwright scrapers</span>
        </div>
      </footer>
    </div>
  );
}
