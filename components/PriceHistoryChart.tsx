"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { HistoryDataPoint } from "@/types";
import EmptyState from "./EmptyState";
import { exportToCsv } from "@/lib/utils";

interface PriceHistoryChartProps {
  query: string;
  asin?: string;
}

interface HistoryApiResponse {
  keepa: { history: HistoryDataPoint[] } | null;
  dbHistory: HistoryDataPoint[];
  hasData: boolean;
}

export default function PriceHistoryChart({ query, asin }: PriceHistoryChartProps) {
  const [data, setData] = useState<HistoryDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!query && !asin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (asin) params.set("asin", asin);

    fetch(`/api/history?${params.toString()}`)
      .then((r) => r.json())
      .then((res: HistoryApiResponse) => {
        const keepaPoints = res.keepa?.history ?? [];
        const dbPoints = res.dbHistory ?? [];
        const merged = [...keepaPoints, ...dbPoints].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setData(merged);
        setHasData(res.hasData || merged.length > 0);
      })
      .catch(() => setHasData(false))
      .finally(() => setLoading(false));
  }, [query, asin]);

  if (loading) return <EmptyState reason="loading" className="min-h-[220px]" />;
  if (!hasData || data.length === 0) {
    return <EmptyState reason="unavailable" label="No Price History" className="min-h-[220px]" />;
  }

  function handleExport() {
    exportToCsv(
      data.map((d) => ({ Date: d.date, Price: d.price, Retailer: d.retailer ?? "" })),
      "price-history"
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">30-Day Price History</h3>
        <button onClick={handleExport} className="text-xs text-hp-blue hover:underline font-medium">
          Export CSV
        </button>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#0047BB"
              strokeWidth={2}
              dot={false}
              name="Price (USD)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
