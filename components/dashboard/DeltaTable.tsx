"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ExportButton } from "../ui/ExportButton";

interface DeltaRow {
  competitorId: string;
  competitorName: string;
  retailer: string;
  competitorPrice: number;
  targetPrice: number;
  delta: number;
  deltaPercent: number;
  verdict: "cheaper" | "parity" | "expensive";
}

interface DeltaTableProps {
  deltas: DeltaRow[];
  targetName: string;
}

const verdictConfig = {
  cheaper: {
    label: "Undercuts You",
    icon: TrendingDown,
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  parity: {
    label: "Parity",
    icon: Minus,
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
  },
  expensive: {
    label: "You Win",
    icon: TrendingUp,
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
};

export function DeltaTable({ deltas, targetName }: DeltaTableProps) {
  const exportData = deltas.map((d) => ({
    competitor: d.competitorName,
    retailer: d.retailer,
    competitor_price: d.competitorPrice,
    target_price: d.targetPrice,
    delta: d.delta,
    delta_percent: d.deltaPercent.toFixed(2),
    verdict: d.verdict,
  })) as Record<string, unknown>[];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">Competitive Delta Table</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Target: <span className="font-medium">{targetName}</span>
          </p>
        </div>
        <ExportButton data={exportData} filename={`deltas-${targetName}.csv`} />
      </div>

      {deltas.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-gray-400">
          No competitor data yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Competitor</th>
                <th className="px-5 py-3">Retailer</th>
                <th className="px-5 py-3 text-right">Their Price</th>
                <th className="px-5 py-3 text-right">Your Price</th>
                <th className="px-5 py-3 text-right">Delta</th>
                <th className="px-5 py-3 text-right">Delta %</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deltas.map((row, i) => {
                const cfg = verdictConfig[row.verdict];
                const Icon = cfg.icon;
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{row.competitorName}</td>
                    <td className="px-5 py-3 text-gray-500">{row.retailer}</td>
                    <td className="px-5 py-3 text-right font-mono">${row.competitorPrice.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono">${row.targetPrice.toFixed(2)}</td>
                    <td
                      className={`px-5 py-3 text-right font-mono font-semibold ${
                        row.delta < 0 ? "text-red-600" : row.delta > 0 ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      {row.delta > 0 ? "+" : ""}${row.delta.toFixed(2)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono ${
                        row.deltaPercent < 0 ? "text-red-600" : row.deltaPercent > 0 ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      {row.deltaPercent > 0 ? "+" : ""}{row.deltaPercent.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      >
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
