"use client";

import React, { useState } from "react";
import { Check, Code2, Copy, Edit3, Eye, Trash2, X } from "lucide-react";
import { Hymn } from "@/lib/types";
import { normalizeHymn } from "@/lib/validation";

interface HymnPreviewModalProps {
  hymn: Hymn | null;
  onClose: () => void;
  onEdit: (hymn: Hymn) => void;
  onDelete: (number: number) => void;
}

export function HymnPreviewModal({
  hymn,
  onClose,
  onEdit,
  onDelete,
}: HymnPreviewModalProps) {
  const [tab, setTab] = useState<"lyrics" | "json">("lyrics");
  const [copied, setCopied] = useState(false);

  if (!hymn) return null;

  const cleanJson = JSON.stringify(normalizeHymn(hymn), null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cleanJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-6">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                BHB {hymn.number}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                {hymn.category}
              </span>
              {hymn.amen ? (
                <span className="font-mono text-[11px] rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 text-slate-600 dark:text-zinc-400">
                  Ending: {hymn.amen}
                </span>
              ) : (
                <span className="text-[11px] italic text-slate-400">
                  (No ending)
                </span>
              )}
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight truncate">
              {hymn.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 px-5 py-2 bg-slate-50/70 dark:bg-zinc-950/50">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab("lyrics")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === "lyrics"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Reader View
            </button>
            <button
              type="button"
              onClick={() => setTab("json")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === "json"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              JSON Schema
            </button>
          </div>

          {tab === "json" && (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium hover:bg-white dark:hover:bg-zinc-800"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy JSON
                </>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "lyrics" ? (
            <div className="space-y-5 text-sm leading-relaxed">
              {hymn.verses.length === 0 ? (
                <p className="text-xs italic text-slate-500">
                  No verses added yet.
                </p>
              ) : (
                hymn.verses.map((verse, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex gap-3">
                      <span className="font-mono text-xs font-bold text-slate-400 dark:text-zinc-500 pt-0.5 w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <p className="whitespace-pre-line">{verse}</p>
                    </div>
                    {hymn.chorus &&
                      (hymn.chorusAfterEachVerse || idx === 0) && (
                        <div className="ml-8 rounded-xl border-l-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/25 px-4 py-3">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                            Chorus
                          </span>
                          <p className="whitespace-pre-line italic text-slate-700 dark:text-zinc-300">
                            {hymn.chorus}
                          </p>
                        </div>
                      )}
                  </div>
                ))
              )}

              {hymn.amen && (
                <p className="pl-8 font-semibold italic text-slate-600 dark:text-zinc-400">
                  {hymn.amen}
                </p>
              )}
            </div>
          ) : (
            <pre className="rounded-xl bg-slate-950 p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              {cleanJson}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 px-5 py-3.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(hymn.number);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-zinc-700 px-3.5 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(hymn);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Hymn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

