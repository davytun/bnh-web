"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { parseRawHymnsText } from "@/lib/parser";
import { Hymn } from "@/lib/types";

const EXAMPLE_RAW_TEXT = `BHB 1
Title: Gbogbo Aye, E Gborin Soke
Category: Iyin ati Ope

1. Gbogbo aye, e gborin soke,
E fi ayo yin Oluwa;
E fi iberu sin Olorun,
E wa siwaju Re pelu orin.

2. E mo pe Oluwa nikan l'Olorun,
Oun l'O da wa laisi tiwa;
Awa ni eniyan Re tooto,
Ati aguntan papa oko Re.

Amin.

---

BHB 2
Title: Ope Fun Oluwa, E Korin Idunnu
Category: Iyin ati Ope

1. Ope fun Oluwa, e korin idunnu,
Nitori aanu Re duro lailai;
E gbe ohun yin soke niwaju Re,
Ki e si yin oruko mimo Re.

Chorus:
E fi iyin fun Baba wa,
E gbe Jesu Kristi ga,
E yin Emi Mimo Olutunu,
Olorun kan lailai.

2. Nigba iponju O gbo igbe wa,
O si mu wa jade ninu okunkun.`;

interface RawParserModalProps {
  isOpen: boolean;
  existingNumbers: Set<number>;
  onClose: () => void;
  onEditParsed: (hymn: Hymn) => void;
  onImportBatch: (
    hymns: Hymn[],
    mode: "overwrite" | "skip_existing"
  ) => Promise<void>;
}

export function RawParserModal({
  isOpen,
  existingNumbers,
  onClose,
  onEditParsed,
  onImportBatch,
}: RawParserModalProps) {
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState<"overwrite" | "skip_existing">("overwrite");
  const [chorusOverrides, setChorusOverrides] = useState<Record<number, boolean>>({});
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(() => {
    if (!rawText.trim()) return [];
    return parseRawHymnsText(rawText).map((item, idx) => {
      const override = chorusOverrides[idx];
      if (override !== undefined && item.hymn.chorus !== null) {
        return {
          ...item,
          hymn: { ...item.hymn, chorusAfterEachVerse: override },
        };
      }
      return item;
    });
  }, [rawText, chorusOverrides]);

  const validHymns = useMemo(
    () => parsed.filter((p) => p.issues.length === 0).map((p) => p.hymn),
    [parsed]
  );

  if (!isOpen) return null;

  const handleImport = async () => {
    if (validHymns.length === 0) return;
    setImporting(true);
    try {
      await onImportBatch(validHymns, mode);
      setRawText("");
      setChorusOverrides({});
      onClose();
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-6">
      <div className="flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Raw Text Auto-Parser
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Paste raw hymn text from Word or Notepad. Separate multiple hymns with{" "}
              <code className="font-mono">---</code> or <code className="font-mono">BHB &lt;num&gt;</code>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRawText(EXAMPLE_RAW_TEXT);
                setChorusOverrides({});
              }}
              className="rounded-lg border border-slate-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              Load Example
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Raw Input */}
          <div className="lg:col-span-6 flex flex-col space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Paste Raw Lyrics Here
            </label>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setChorusOverrides({});
              }}
              placeholder={`BHB 1\nTitle: Gbogbo Aye, E Gborin Soke\nCategory: Iyin ati Ope\n\n1. Gbogbo aye, e gborin soke,\nE fi ayo yin Oluwa;\n...\n\nChorus:\nE fi iyin fun Baba wa...\n\nAmin.`}
              className="flex-1 min-h-[340px] w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-950 p-3.5 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Right: Live Parsed Preview */}
          <div className="lg:col-span-6 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                Detected Hymns ({parsed.length})
              </span>
              {parsed.length > 0 && (
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {validHymns.length}
                  </strong>{" "}
                  valid /{" "}
                  <strong className="text-rose-600 dark:text-rose-400">
                    {parsed.length - validHymns.length}
                  </strong>{" "}
                  with issues
                </span>
              )}
            </div>

            {parsed.length === 0 ? (
              <div className="flex-1 min-h-[340px] rounded-xl border border-dashed border-slate-300 dark:border-zinc-800 flex items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-zinc-400">
                Paste raw hymn text on the left to automatically extract number, title,
                category, verses, chorus, and Amen.
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[420px] pr-1">
                {parsed.map((item, idx) => {
                  const hasErrors = item.issues.length > 0;
                  const alreadyExists = existingNumbers.has(item.hymn.number);
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        hasErrors
                          ? "border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20"
                          : "border-slate-200 bg-slate-50/60 dark:border-zinc-800 dark:bg-zinc-950/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {hasErrors ? (
                            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-800">
                            #{item.hymn.number || "?"}
                          </span>
                          <span className="text-sm font-semibold truncate">
                            {item.hymn.title || "(Missing Title)"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditParsed(item.hymn);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-zinc-700 px-2 py-1 text-[11px] font-medium hover:bg-white dark:hover:bg-zinc-800 shrink-0"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit in Form
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                        <span>
                          Category: <strong>{item.hymn.category || "Missing"}</strong>
                        </span>
                        <span>•</span>
                        <span>{item.hymn.verses.length} verse(s)</span>
                        <span>•</span>
                        <span>Chorus: {item.hymn.chorus ? "Yes" : "None"}</span>
                        <span>•</span>
                        <span>Amen: {item.hymn.amen ?? "null"}</span>
                        {alreadyExists && (
                          <span className="rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 font-medium">
                            Exists in DB
                          </span>
                        )}
                      </div>

                      {item.hymn.chorus && (
                        <label className="inline-flex items-center gap-2 text-[11px] text-slate-700 dark:text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.hymn.chorusAfterEachVerse}
                            onChange={(e) =>
                              setChorusOverrides((prev) => ({
                                ...prev,
                                [idx]: e.target.checked,
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                          />
                          Repeat chorus after each verse
                        </label>
                      )}

                      {hasErrors && (
                        <ul className="list-disc pl-5 text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5">
                          {item.issues.map((iss, iIdx) => (
                            <li key={iIdx}>{iss.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 px-5 py-3.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 dark:text-zinc-400">If number exists:</span>
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
                ? "Importing..."
                : `Import ${validHymns.length} Valid Hymn${validHymns.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

