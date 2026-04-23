"use client";

import { AlertCircle, WifiOff, ToggleLeft } from "lucide-react";

interface EmptyStateProps {
  reason?: "unavailable" | "disabled" | "loading";
  label?: string;
  className?: string;
}

export default function EmptyState({
  reason = "unavailable",
  label,
  className = "",
}: EmptyStateProps) {
  const configs = {
    unavailable: {
      icon: <WifiOff className="w-5 h-5 text-hp-slate" />,
      title: label ?? "Data Unavailable",
      sub: "This data source is currently unreachable or returned no results.",
    },
    disabled: {
      icon: <ToggleLeft className="w-5 h-5 text-hp-slate" />,
      title: label ?? "Integration Disabled",
      sub: "Enable this module in Settings to activate this panel.",
    },
    loading: {
      icon: <AlertCircle className="w-5 h-5 text-hp-blue animate-pulse" />,
      title: label ?? "Loading…",
      sub: "Fetching data from live sources.",
    },
  };

  const { icon, title, sub } = configs[reason];

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10 px-6 text-center ${className}`}
    >
      {icon}
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-xs text-gray-400 max-w-xs">{sub}</p>
    </div>
  );
}
