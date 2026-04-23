"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CorrelationData } from "@/types";
import EmptyState from "./EmptyState";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SalesChartProps {
  correlation: CorrelationData | null;
  enabled: boolean;
  sparkData?: { period: string; unitsSold: number }[];
}

export default function SalesChart({ correlation, enabled, sparkData = [] }: SalesChartProps) {
  if (!enabled) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">Projected Sales</h3>
        </div>
        <div className="p-4">
          <EmptyState reason="disabled" className="min-h-[160px]" />
        </div>
      </div>
    );
  }

  if (!correlation || sparkData.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">Projected Sales</h3>
        </div>
        <div className="p-4">
          <EmptyState reason="unavailable" label="Upload sales CSV to enable" className="min-h-[160px]" />
        </div>
      </div>
    );
  }

  const { priceTrendSlope, projectedNextWeekUnits, priceToSalesR2 } = correlation;
  const trendUp = (priceTrendSlope ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">WoW Sales Projection</h3>
        {projectedNextWeekUnits != null && (
          <span className="flex items-center gap-1 text-xs font-semibold text-hp-blue">
            {trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
            {projectedNextWeekUnits} units next week
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0047BB" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0047BB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Area
              type="monotone"
              dataKey="unitsSold"
              stroke="#0047BB"
              strokeWidth={2}
              fill="url(#salesGrad)"
              name="Units Sold"
            />
          </AreaChart>
        </ResponsiveContainer>
        {priceToSalesR2 != null && (
          <p className="text-xs text-gray-400">
            Price-to-sales R² = <span className="font-mono text-gray-600">{priceToSalesR2}</span>
            {" "}·{" "}
            {priceToSalesR2 > 0.6 ? "Strong correlation" : "Moderate correlation"}
          </p>
        )}
      </div>
    </div>
  );
}
