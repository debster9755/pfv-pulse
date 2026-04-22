"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, XCircle, FileText } from "lucide-react";

interface UploadResult {
  success: boolean;
  inserted?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
}

export function CsvUploader() {
  const [result, setResult] = useState<UploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Upload failed." });
    } finally {
      setLoading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setResult({ success: false, error: "Only .csv files are accepted." });
      return;
    }
    uploadFile(file);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Import Sales CSV</h3>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Required columns: <code className="bg-gray-100 px-1 rounded">sku</code>,{" "}
        <code className="bg-gray-100 px-1 rounded">week_start_date</code>,{" "}
        <code className="bg-gray-100 px-1 rounded">units_sold</code>. Optional:{" "}
        <code className="bg-gray-100 px-1 rounded">retailer</code>,{" "}
        <code className="bg-gray-100 px-1 rounded">revenue</code>,{" "}
        <code className="bg-gray-100 px-1 rounded">avg_selling_price</code>.
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 transition-colors ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <Upload className={`h-8 w-8 mb-2 ${dragOver ? "text-blue-500" : "text-gray-400"}`} />
        <p className="text-sm font-medium text-gray-600">
          {loading ? "Uploading…" : "Drop CSV here or click to browse"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {result && (
        <div
          className={`mt-3 rounded-lg p-3 text-sm ${
            result.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            {result.success ? "Import successful" : "Import failed"}
          </div>
          {result.success && (
            <p className="mt-1 text-gray-600">
              Inserted {result.inserted} rows, skipped {result.skipped}.
            </p>
          )}
          {result.error && <p className="mt-1 text-red-700">{result.error}</p>}
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-red-700 space-y-0.5">
              {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
