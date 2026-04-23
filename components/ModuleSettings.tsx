"use client";

import { Settings2 } from "lucide-react";
import type { ModuleSettings } from "@/types";

interface ModuleSettingsProps {
  settings: ModuleSettings;
  onChange: (settings: ModuleSettings) => void;
}

const MODULE_DEFINITIONS = [
  {
    key: "reviews" as const,
    label: "Ratings & Reviews",
    description: "Aggregate live reviews from rtings, PCMag, LaptopMag, Notebookcheck",
  },
  {
    key: "sentiment" as const,
    label: "Sentiment Analysis",
    description: "WoW positive/negative sentiment scoring from scraped reviews",
  },
  {
    key: "correlation" as const,
    label: "Sales Correlation",
    description: "Correlate sales CSV data with pricing deltas and sentiment",
  },
];

export default function ModuleSettings({ settings, onChange }: ModuleSettingsProps) {
  function toggle(key: keyof ModuleSettings) {
    onChange({ ...settings, [key]: !settings[key] });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Settings2 className="w-4 h-4 text-hp-blue" />
        <h2 className="text-sm font-semibold text-gray-800">Intelligence Modules</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {MODULE_DEFINITIONS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-hp-blue focus:ring-offset-1 ${
                settings[key] ? "bg-hp-blue" : "bg-gray-200"
              }`}
              role="switch"
              aria-checked={settings[key]}
              aria-label={`Toggle ${label}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  settings[key] ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
