"use client";

import type { ComparisonRow } from "@/types";
import EmptyState from "./EmptyState";
import { exportToCsv } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ComparisonTableProps {
  data: ComparisonRow[];
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-gray-300 text-xs">—</span>;
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <TrendingUp className="w-3 h-3" />+{abs}%
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
        <TrendingDown className="w-3 h-3" />
        {abs}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
      <Minus className="w-3 h-3" />0%
    </span>
  );
}

export default function ComparisonTable({ data }: ComparisonTableProps) {
  if (data.length === 0) {
    return <EmptyState reason="unavailable" label="No Comparison Data" className="min-h-[180px]" />;
  }

  function handleExport() {
    exportToCsv(
      data.map((r) => ({
        Brand: r.brand,
        "Avg Price": r.average ?? "",
        Low: r.low ?? "",
        High: r.high ?? "",
        "Delta vs HP (%)": r.priceDeltaVsHp ?? "N/A",
      })),
      "price-comparison"
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">Price Comparison</h3>
        <button onClick={handleExport} className="text-xs text-hp-blue hover:underline font-medium">
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2 text-left font-medium">Brand</th>
              <th className="px-4 py-2 text-right font-medium">Avg</th>
              <th className="px-4 py-2 text-right font-medium">Low</th>
              <th className="px-4 py-2 text-right font-medium">High</th>
              <th className="px-4 py-2 text-right font-medium">vs HP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row) => {
              const isHp = /\bhp\b/i.test(row.brand);
              return (
                <tr key={row.brand} className={isHp ? "bg-blue-50/60" : "hover:bg-gray-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {row.brand}
                    {isHp && (
                      <span className="ml-2 text-[10px] bg-hp-blue text-white px-1.5 py-0.5 rounded font-semibold">
                        TARGET
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">
                    {row.average != null ? `$${row.average.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {row.low != null ? `$${row.low.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {row.high != null ? `$${row.high.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DeltaBadge delta={row.priceDeltaVsHp} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
