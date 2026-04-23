"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PriceChartRow } from "@/types";
import EmptyState from "./EmptyState";
import { exportToCsv } from "@/lib/utils";

interface PriceChartProps {
  data: PriceChartRow[];
  title?: string;
}

export default function PriceChart({ data, title = "Retail Pricing" }: PriceChartProps) {
  if (data.length === 0) {
    return <EmptyState reason="unavailable" label="No Pricing Data" className="min-h-[220px]" />;
  }

  function handleExport() {
    exportToCsv(
      data.map((r) => ({
        Product: r.name,
        "Regular Price": r.regularPrice ?? "",
        "Sale Price": r.salePrice ?? "",
        Retailer: r.retailer,
      })),
      "price-data"
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <button
          onClick={handleExport}
          className="text-xs text-hp-blue hover:underline font-medium"
        >
          Export CSV
        </button>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="regularPrice" name="Regular Price" fill="#0047BB" radius={[3, 3, 0, 0]} />
            <Bar dataKey="salePrice" name="Sale Price" fill="#38bdf8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
