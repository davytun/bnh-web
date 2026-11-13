"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Code2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  DEFAULT_CATEGORIES,
  Hymn,
  MAX_HYMN_NUMBER,
  MIN_HYMN_NUMBER,
} from "@/lib/types";
import { normalizeHymn, validateHymn } from "@/lib/validation";

interface HymnEditorModalProps {
  isOpen: boolean;
  initialHymn: Hymn | null;
  suggestedNumber: number;
  existingNumbers: Set<number>;
  allCategories: string[];
  onClose: () => void;
  onSave: (hymn: Hymn, originalNumber: number | null, allowEmptyVerses: boolean) => Promise<void>;
}

export function HymnEditorModal({
  isOpen,
  initialHymn,
  suggestedNumber,
  existingNumbers,
  allCategories,
  onClose,
  onSave,
}: HymnEditorModalProps) {
  const isEditing = initialHymn !== null;
  const originalNumber = initialHymn?.number ?? null;

  const [numberInput, setNumberInput] = useState<string>(
    String(initialHymn?.number ?? suggestedNumber)
  );
  const [title, setTitle] = useState(initialHymn?.title ?? "");
  const [category, setCategory] = useState(
    initialHymn?.category ?? DEFAULT_CATEGORIES[0]
  );
  const [customCategoryMode, setCustomCategoryMode] = useState(false);
  const [amen, setAmen] = useState(initialHymn?.amen ?? "Amin.");
  const [chorus, setChorus] = useState(initialHymn?.chorus ?? "");
  const [chorusAfterEachVerse, setChorusAfterEachVerse] = useState(
    initialHymn?.chorusAfterEachVerse ?? false
  );
  const [verses, setVerses] = useState<string[]>(
    initialHymn && initialHymn.verses.length > 0 ? initialHymn.verses : [""]
  );
  const [showJson, setShowJson] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  const mergedCategories = useMemo(() => {
    const set = new Set<string>([...DEFAULT_CATEGORIES, ...allCategories]);
    if (category && !set.has(category)) {
      set.add(category);
    }
    return Array.from(set);
  }, [allCategories, category]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => titleRef.current?.focus(), 40);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const draftHymn = useMemo(() => {
    const num = Number.parseInt(numberInput, 10) || 0;
    return normalizeHymn({
      number: num,
      title,
      category,
      amen: amen.trim().length > 0 ? amen : null,
      chorusAfterEachVerse,
      chorus: chorus.trim().length > 0 ? chorus : null,
      verses,
    });
  }, [numberInput, title, category, amen, chorusAfterEachVerse, chorus, verses]);

  const issues = useMemo(
    () =>
      validateHymn(draftHymn, {
        existingNumbers,
        originalNumber,
        allowEmptyVerses: false,
      }),
    [draftHymn, existingNumbers, originalNumber]
  );

  const draftIssues = useMemo(
    () =>
      validateHymn(draftHymn, {
        existingNumbers,
        originalNumber,
        allowEmptyVerses: true,
      }),
    [draftHymn, existingNumbers, originalNumber]
  );

  const isNumberTaken =
    draftHymn.number >= MIN_HYMN_NUMBER &&
    draftHymn.number <= MAX_HYMN_NUMBER &&
    existingNumbers.has(draftHymn.number) &&
    draftHymn.number !== originalNumber;

  const handleSave = async (allowEmptyVerses = false) => {
    setSubmitAttempted(true);
    const activeIssues = allowEmptyVerses ? draftIssues : issues;
    if (activeIssues.length > 0) return;

    setSaving(true);
    try {
      const cleanedHymn: Hymn = allowEmptyVerses
        ? {
            ...draftHymn,
            verses: draftHymn.verses.filter((v) => v.trim().length > 0),
          }
        : draftHymn;
      await onSave(cleanedHymn, originalNumber, allowEmptyVerses);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!isOpen) return null;

  const addVerse = () => {
    setVerses((prev) => [...prev, ""]);
  };

  const removeVerse = (idx: number) => {
    setVerses((prev) => (prev.length <= 1 ? [""] : prev.filter((_, i) => i !== idx)));
  };

  const updateVerse = (idx: number, val: string) => {
    setVerses((prev) => prev.map((v, i) => (i === idx ? val : v)));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-6">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {isEditing ? `Edit Hymn #${initialHymn.number}` : "Add New Hymn"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Standard English keyboard typing. Line breaks are preserved exactly as typed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJson((s) => !s)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                showJson
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              {showJson ? "Hide JSON" : "JSON Preview"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className={`${showJson ? "lg:col-span-7" : "lg:col-span-12"} space-y-5`}>
            {/* Top metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Hymn Number (1–600)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={MIN_HYMN_NUMBER}
                    max={MAX_HYMN_NUMBER}
                    value={numberInput}
                    onChange={(e) => setNumberInput(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 ${
                      isNumberTaken
                        ? "border-rose-400 focus:ring-rose-500/30"
                        : "border-slate-300 dark:border-zinc-700 focus:ring-indigo-500/30"
                    }`}
                  />
                </div>
                {isNumberTaken ? (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                    #{draftHymn.number} is already used
                  </p>
                ) : draftHymn.number >= 1 && draftHymn.number <= 600 ? (
                  <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <Check className="h-3 w-3" /> Available
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-9">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Title
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  placeholder="e.g. Gbogbo Aye, E Gborin Soke"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            {/* Category & Amen */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomCategoryMode((m) => !m)}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {customCategoryMode ? "Choose from list" : "+ Custom category"}
                  </button>
                </div>
                {customCategoryMode ? (
                  <input
                    type="text"
                    placeholder="Enter custom category..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {mergedCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="sm:col-span-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Amen (optional)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAmen("Amin.")}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Amin.
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmen("")}
                      className="text-[11px] text-slate-500 hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Leave empty for null"
                  value={amen}
                  onChange={(e) => setAmen(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            {/* Chorus Section */}
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Chorus (Optional — max 1 per hymn)
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={chorusAfterEachVerse}
                    onChange={(e) => setChorusAfterEachVerse(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Repeat chorus after each verse (<code>chorusAfterEachVerse</code>)
                  </span>
                </label>
              </div>
              <textarea
                rows={3}
                placeholder="Leave blank if this hymn has no chorus..."
                value={chorus}
                onChange={(e) => setChorus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {/* Verses Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Verses ({verses.length})
                </h3>
                <button
                  type="button"
                  onClick={addVerse}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Verse
                </button>
              </div>

              <div className="space-y-3">
                {verses.map((verse, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-semibold text-slate-600 dark:text-zinc-400">
                        Verse {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVerse(idx)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        title="Remove verse"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      placeholder={`Enter lyrics for Verse ${idx + 1}...`}
                      value={verse}
                      onChange={(e) => updateVerse(idx, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Issues */}
            {submitAttempted && issues.length > 0 && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3.5 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4" />
                  Please fix the following before saving:
                </div>
                <ul className="list-disc pl-5 text-xs text-rose-700 dark:text-rose-300 space-y-0.5">
                  {issues.map((issue, idx) => (
                    <li key={idx}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Live JSON Preview */}
          {showJson && (
            <div className="lg:col-span-5 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-950 text-slate-100 overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-3.5 py-2.5 text-xs font-mono text-zinc-400">
                <span>Mobile Schema JSON</span>
                <span>7 keys</span>
              </div>
              <pre className="flex-1 overflow-auto p-3.5 text-xs font-mono leading-relaxed text-emerald-300">
                {JSON.stringify(draftHymn, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 px-5 py-3.5">
          <span className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:inline">
            Shortcut: <kbd className="rounded border px-1.5 py-0.5 font-mono text-[10px]">Ctrl+S</kbd> to save,{" "}
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to close
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || draftIssues.length > 0}
              onClick={() => void handleSave(true)}
              className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 transition"
              title="Save even if verses are not yet entered"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : isEditing ? "Update Hymn" : "Save Hymn"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

