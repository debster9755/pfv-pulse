"use client";

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
import { ExportButton } from "../ui/ExportButton";

interface PriceRecord {
  scrapedAt: string;
  retailer: string;
  price: number;
}

interface ChartDataPoint {
  date: string;
  [retailer: string]: string | number;
}

const RETAILER_COLORS: Record<string, string> = {
  "Amazon": "#f59e0b",
  "Best Buy": "#3b82f6",
  "Newegg": "#10b981",
  "HP Official": "#8b5cf6",
  "Walmart": "#ef4444",
};

function getColor(retailer: string, index: number): string {
  return RETAILER_COLORS[retailer] ?? `hsl(${(index * 60) % 360}, 65%, 50%)`;
}

function buildChartData(prices: PriceRecord[]): { data: ChartDataPoint[]; retailers: string[] } {
  const retailers = [...new Set(prices.map((p) => p.retailer))];
  const byDate: Record<string, ChartDataPoint> = {};

  for (const p of prices) {
    const date = p.scrapedAt.slice(0, 10);
    byDate[date] ??= { date };
    const current = byDate[date][p.retailer];
    // keep the lowest price per day per retailer
    if (current === undefined || (p.price < (current as number))) {
      byDate[date][p.retailer] = p.price;
    }
  }

  const data = Object.values(byDate).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  return { data, retailers };
}

interface PriceHistoryChartProps {
  prices: PriceRecord[];
  productName: string;
}

export function PriceHistoryChart({ prices, productName }: PriceHistoryChartProps) {
  const { data, retailers } = buildChartData(prices);

  const exportData = data.flatMap((row) =>
    retailers.map((r) => ({ date: row.date, retailer: r, price: row[r] ?? "" }))
  ) as Record<string, unknown>[];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">30-Day Price History</h3>
          <p className="text-xs text-gray-500 mt-0.5">{productName}</p>
        </div>
        <ExportButton data={exportData} filename={`price-history-${productName}.csv`} />
      </div>

      {data.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-gray-400">
          No price history yet — trigger a scrape to populate data.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.slice(5)} // MM-DD
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${v}`}
              domain={["auto", "auto"]}
            />
            <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, ""]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {retailers.map((r, i) => (
              <Line
                key={r}
                type="monotone"
                dataKey={r}
                stroke={getColor(r, i)}
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
