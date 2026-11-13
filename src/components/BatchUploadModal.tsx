"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { parseBatchFile } from "@/lib/parser";
import { Hymn, ParsedHymnResult } from "@/lib/types";

interface BatchUploadModalProps {
  isOpen: boolean;
  existingNumbers: Set<number>;
  onClose: () => void;
  onImportBatch: (
    hymns: Hymn[],
    mode: "overwrite" | "skip_existing"
  ) => Promise<void>;
}

export function BatchUploadModal({
  isOpen,
  existingNumbers,
  onClose,
  onImportBatch,
}: BatchUploadModalProps) {
  const [filename, setFilename] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedHymnResult[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<"overwrite" | "skip_existing">("overwrite");
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validHymns = useMemo(
    () => parsed.filter((p) => p.issues.length === 0).map((p) => p.hymn),
    [parsed]
  );

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setFilename(file.name);
    setParseError(null);
    try {
      const content = await file.text();
      const results = parseBatchFile(file.name, content);
      if (results.length === 0) {
        setParseError("No hymns could be detected in this file.");
      }
      setParsed(results);
    } catch (err) {
      setParsed([]);
      setParseError(err instanceof Error ? err.message : "Failed to parse file.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleImport = async () => {
    if (validHymns.length === 0) return;
    setImporting(true);
    try {
      await onImportBatch(validHymns, mode);
      setFilename("");
      setParsed([]);
      onClose();
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-6">
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Batch File Upload
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Upload <code className="font-mono">.txt</code>,{" "}
              <code className="font-mono">.json</code>, or{" "}
              <code className="font-mono">.csv</code> files containing one or many hymns.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
              dragging
                ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30"
                : "border-slate-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-950/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processFile(file);
              }}
            />
            <Upload className="h-8 w-8 mx-auto text-slate-400 dark:text-zinc-500 mb-2" />
            <p className="text-sm font-medium">
              {filename ? (
                <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <FileText className="h-4 w-4" />
                  {filename}
                </span>
              ) : (
                "Click to choose a file or drag and drop"
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Supports <code>.txt</code> (BHB raw format), <code>.json</code> (mobile schema array), and <code>.csv</code> (columns: number, title, category, amen, chorusAfterEachVerse, chorus, verses).
            </p>
          </div>

          {parseError && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          {parsed.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">
                  Parsed {parsed.length} hymn(s)
                </span>
                <span className="text-slate-500 dark:text-zinc-400">
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {validHymns.length}
                  </strong>{" "}
                  ready •{" "}
                  <strong className="text-rose-600 dark:text-rose-400">
                    {parsed.length - validHymns.length}
                  </strong>{" "}
                  invalid
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 divide-y divide-slate-200 dark:divide-zinc-800">
                {parsed.map((item, idx) => {
                  const hasErrors = item.issues.length > 0;
                  const exists = existingNumbers.has(item.hymn.number);
                  return (
                    <div key={idx} className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {hasErrors ? (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span className="font-mono font-bold">
                            #{item.hymn.number || "?"}
                          </span>
                          <span className="font-medium truncate">
                            {item.hymn.title || "(Missing Title)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500">
                          <span>{item.hymn.verses.length}v</span>
                          {exists && (
                            <span className="rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5">
                              Exists
                            </span>
                          )}
                        </div>
                      </div>
                      {hasErrors && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 pl-5">
                          {item.issues.map((i) => i.message).join(" • ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 px-5 py-3.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 dark:text-zinc-400">Duplicates:</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "overwrite" | "skip_existing")}
              className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs"
            >
              <option value="overwrite">Overwrite existing</option>
              <option value="skip_existing">Skip existing</option>
            </select>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importing || validHymns.length === 0}
              onClick={() => void handleImport()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow-sm"
            >
              <Upload className="h-3.5 w-3.5" />
              {importing
                ? "Uploading..."
                : `Upload ${validHymns.length} Valid Hymn${validHymns.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

