"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ExportButton } from "../ui/ExportButton";

interface SalesProjection {
  weekStartDate: string;
  actual: number;
  projected: number;
}

interface SalesProjectionChartProps {
  projections: SalesProjection[];
  r2?: number;
}

export function SalesProjectionChart({ projections, r2 }: SalesProjectionChartProps) {
  const exportData = projections as unknown as Record<string, unknown>[];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Week-on-Week Sales Projection</h3>
          {r2 !== undefined && (
            <p className="text-xs text-gray-500 mt-0.5">
              Regression R² = {r2.toFixed(3)} — {r2 > 0.7 ? "strong fit" : r2 > 0.4 ? "moderate fit" : "weak fit"}
            </p>
          )}
        </div>
        <ExportButton data={exportData} filename="sales-projections.csv" />
      </div>

      {projections.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-gray-400">
          Upload a sales CSV to generate projections.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={projections} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="weekStartDate" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="actual" name="Actual Units" fill="#3b82f6" opacity={0.7} radius={[3, 3, 0, 0]} />
            <Line
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
