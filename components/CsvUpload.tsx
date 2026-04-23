"use client";

import { useRef, useState } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

interface UploadResult {
  success: boolean;
  ingested: number;
  skipped: number;
  skippedDetails?: string[];
  error?: string;
}

export default function CsvUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setResult({ success: false, ingested: 0, skipped: 0, error: "Only .csv files are accepted." });
      return;
    }
    setUploading(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload-csv", { method: "POST", body: form });
      const data: UploadResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, ingested: 0, skipped: 0, error: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">Upload Sales Data (CSV)</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Required columns: product_name, brand, period, units_sold, revenue
        </p>
      </div>
      <div className="p-4 space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors py-8 ${
            dragging ? "border-hp-blue bg-blue-50" : "border-gray-200 hover:border-hp-blue/50 hover:bg-gray-50"
          }`}
        >
          <Upload className={`w-5 h-5 ${dragging ? "text-hp-blue" : "text-gray-400"}`} />
          <p className="text-sm text-gray-500">
            {uploading ? "Uploading…" : "Drop CSV here or click to browse"}
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {result && (
          <div
            className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${
              result.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-600"
            }`}
          >
            {result.success ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>
              {result.error ? (
                <p>{result.error}</p>
              ) : (
                <>
                  <p className="font-medium">
                    {result.ingested} rows ingested{result.skipped > 0 && `, ${result.skipped} skipped`}
                  </p>
                  {(result.skippedDetails ?? []).length > 0 && (
                    <ul className="mt-1 text-xs opacity-70 list-disc list-inside">
                      {result.skippedDetails!.slice(0, 3).map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
