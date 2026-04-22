"use client";

import { Download } from "lucide-react";
import Papa from "papaparse";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename?: string;
  label?: string;
}

export function ExportButton({ data, filename = "export.csv", label = "Export CSV" }: ExportButtonProps) {
  function handleExport() {
    if (!data.length) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
