"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Cloud,
  Download,
  Edit3,
  ExternalLink,
  FileUp,
  Grid3X3,
  HardDrive,
  List,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { StorageBackend } from "@/lib/storage";
import {
  DEFAULT_CATEGORIES,
  Hymn,
  HymnCompletionStatus,
  MAX_HYMN_NUMBER,
} from "@/lib/types";
import { getHymnStatus, sortHymns } from "@/lib/validation";
import { BatchUploadModal } from "./BatchUploadModal";
import { HymnEditorModal } from "./HymnEditorModal";
import { HymnPreviewModal } from "./HymnPreviewModal";
import { RawParserModal } from "./RawParserModal";
import { useToast } from "./ToastProvider";

interface HymnDashboardProps {
  initialHymns: Hymn[];
  initialBackend: StorageBackend;
}

const STATUS_LABELS: Record<HymnCompletionStatus, string> = {
  completed: "Completed",
  missing_verses: "Missing Verses",
  draft: "Draft",
};

export function HymnDashboard({
  initialHymns,
  initialBackend,
}: HymnDashboardProps) {
  const { toast } = useToast();
  const [hymns, setHymns] = useState<Hymn[]>(() => sortHymns(initialHymns));
  const [backend, setBackend] = useState<StorageBackend>(initialBackend);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | HymnCompletionStatus>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [darkMode, setDarkMode] = useState(false);

  // Modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingHymn, setEditingHymn] = useState<Hymn | null>(null);
  const [rawParserOpen, setRawParserOpen] = useState(false);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [previewHymn, setPreviewHymn] = useState<Hymn | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Theme initialization
  useEffect(() => {
    const saved = localStorage.getItem("bnh-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", isDark);
    const id = requestAnimationFrame(() => setDarkMode(isDark));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("bnh-theme", next ? "dark" : "light");
  };

  // Keyboard shortcut: `/` focuses search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if (!isTyping && e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const existingNumbers = useMemo(
    () => new Set(hymns.map((h) => h.number)),
    [hymns]
  );

  const nextAvailableNumber = useMemo(() => {
    for (let i = 1; i <= MAX_HYMN_NUMBER; i++) {
      if (!existingNumbers.has(i)) return i;
    }
    return 1;
  }, [existingNumbers]);

  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    hymns.forEach((h) => {
      if (h.category.trim()) set.add(h.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [hymns]);

  const stats = useMemo(() => {
    let completed = 0;
    let missingVerses = 0;
    let draft = 0;
    for (const h of hymns) {
      const st = getHymnStatus(h);
      if (st === "completed") completed++;
      else if (st === "missing_verses") missingVerses++;
      else draft++;
    }
    return {
      total: hymns.length,
      completed,
      missingVerses,
      draft,
      percent: Math.min(100, Math.round((hymns.length / MAX_HYMN_NUMBER) * 100)),
    };
  }, [hymns]);

  const filteredHymns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hymns.filter((h) => {
      if (categoryFilter !== "all" && h.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "all" && getHymnStatus(h) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        String(h.number).includes(q) ||
        h.title.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q)
      );
    });
  }, [hymns, search, categoryFilter, statusFilter]);

  const handleSaveHymn = async (
    hymn: Hymn,
    originalNumber: number | null,
    allowEmptyVerses: boolean
  ) => {
    const res = await fetch("/api/hymns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hymn, originalNumber, allowEmptyVerses }),
    });
    const data = (await res.json()) as {
      error?: string;
      hymns?: Hymn[];
      backend?: StorageBackend;
    };
    if (!res.ok) {
      toast({
        title: "Save failed",
        description: data.error ?? "Could not save hymn.",
        variant: "error",
      });
      throw new Error(data.error ?? "Save failed");
    }
    if (data.hymns) setHymns(sortHymns(data.hymns));
    if (data.backend) setBackend(data.backend);
    toast({
      title: `Hymn #${hymn.number} saved`,
      description: hymn.title,
      variant: "success",
    });
  };

  const handleBatchImport = async (
    batch: Hymn[],
    mode: "overwrite" | "skip_existing"
  ) => {
    const res = await fetch("/api/hymns/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hymns: batch, mode }),
    });
    const data = (await res.json()) as {
      error?: string;
      added?: number;
      updated?: number;
      skipped?: number;
      hymns?: Hymn[];
      backend?: StorageBackend;
    };
    if (!res.ok) {
      toast({
        title: "Batch import failed",
        description: data.error ?? "Validation failed.",
        variant: "error",
      });
      throw new Error(data.error ?? "Batch import failed");
    }
    if (data.hymns) setHymns(sortHymns(data.hymns));
    if (data.backend) setBackend(data.backend);
    toast({
      title: "Batch import complete",
      description: `Added ${data.added ?? 0}, updated ${data.updated ?? 0}, skipped ${data.skipped ?? 0}.`,
      variant: "success",
    });
  };

  const handleDeleteHymn = async (number: number) => {
    const confirmed = window.confirm(
      `Delete Hymn #${number}? This will update the live cloud database.`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/hymns?number=${number}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as {
      error?: string;
      hymns?: Hymn[];
      backend?: StorageBackend;
    };
    if (!res.ok) {
      toast({
        title: "Delete failed",
        description: data.error ?? "Could not delete hymn.",
        variant: "error",
      });
      return;
    }
    if (data.hymns) setHymns(sortHymns(data.hymns));
    if (data.backend) setBackend(data.backend);
    toast({
      title: `Hymn #${number} deleted`,
      variant: "info",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
                  BNH Hymnbook Studio
                </h1>
                <span
                  className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    backend === "vercel-blob"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60"
                      : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                  }`}
                  title={
                    backend === "vercel-blob"
                      ? "Connected to Vercel Blob cloud storage"
                      : "Local .data/hymns.json storage (connect BLOB_READ_WRITE_TOKEN for Vercel Cloud)"
                  }
                >
                  {backend === "vercel-blob" ? (
                    <>
                      <Cloud className="h-3 w-3" /> Vercel Cloud
                    </>
                  ) : (
                    <>
                      <HardDrive className="h-3 w-3" /> Local Dev
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                600-Hymn Mobile JSON Manager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-200 dark:border-zinc-800 p-2 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
              aria-label="Toggle dark mode"
              title="Toggle light/dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <a
              href="/api/hymns"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GET /api/hymns
            </a>

            <a
              href="/api/hymns?download=1"
              download="hymns.json"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-200 transition shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span> hymns.json
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Progress & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Progress Card */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Collection Progress
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono tracking-tight">
                    {stats.total} / {MAX_HYMN_NUMBER}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    hymns added ({stats.percent}%)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2.5 py-1">
                  {stats.completed} Completed
                </span>
                <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2.5 py-1">
                  {stats.missingVerses} Missing Verses
                </span>
                <span className="rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-2.5 py-1">
                  {stats.draft} Draft
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
          </div>

          {/* Input Modes Card */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs flex flex-col justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Add Hymns
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditingHymn(null);
                  setEditorOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Add Hymn
              </button>
              <button
                type="button"
                onClick={() => setRawParserOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Raw Parser
              </button>
              <button
                type="button"
                onClick={() => setBatchUploadOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 py-2.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <FileUp className="h-4 w-4 text-emerald-500" />
                Batch File
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by number, title, or category (press /)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1">
              {(["all", "completed", "missing_verses", "draft"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    statusFilter === st
                      ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {st === "all" ? "All" : STATUS_LABELS[st]}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-lg p-1.5 transition ${
                  viewMode === "table"
                    ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg p-1.5 transition ${
                  viewMode === "grid"
                    ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hymn List */}
        {filteredHymns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-12 text-center space-y-3">
            <BookOpen className="h-10 w-10 mx-auto text-slate-300 dark:text-zinc-700" />
            <h3 className="text-sm font-semibold">
              {hymns.length === 0
                ? "No hymns in the database yet"
                : "No hymns match your search or filter"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
              {hymns.length === 0
                ? "Start by adding a hymn with the form, pasting raw text from Word/Notepad into the Auto-Parser, or uploading a .txt/.json/.csv batch file."
                : "Try clearing your search query or switching the category/status filter."}
            </p>
            {hymns.length === 0 && (
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingHymn(null);
                    setEditorOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Hymn #1
                </button>
                <button
                  type="button"
                  onClick={() => setRawParserOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Try Raw Parser
                </button>
              </div>
            )}
          </div>
        ) : viewMode === "table" ? (
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    <th className="py-3 pl-5 pr-3 w-20">#</th>
                    <th className="py-3 px-3">Title</th>
                    <th className="py-3 px-3 hidden sm:table-cell">Category</th>
                    <th className="py-3 px-3 w-24 text-center">Verses</th>
                    <th className="py-3 px-3 hidden md:table-cell w-28 text-center">
                      Chorus
                    </th>
                    <th className="py-3 px-3 w-32">Status</th>
                    <th className="py-3 pl-3 pr-5 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-sm">
                  {filteredHymns.map((h) => {
                    const status = getHymnStatus(h);
                    return (
                      <tr
                        key={h.number}
                        onClick={() => setPreviewHymn(h)}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 pl-5 pr-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {h.number}
                        </td>
                        <td className="py-3 px-3 font-medium">
                          <div className="truncate max-w-[220px] sm:max-w-xs md:max-w-md">
                            {h.title}
                          </div>
                          <div className="text-[11px] text-slate-500 sm:hidden">
                            {h.category}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-zinc-400 hidden sm:table-cell">
                          {h.category}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs">
                          {h.verses.length}
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-slate-500 hidden md:table-cell">
                          {h.chorus
                            ? h.chorusAfterEachVerse
                              ? "Repeat"
                              : "Once"
                            : "—"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              status === "completed"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : status === "missing_verses"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                        </td>
                        <td
                          className="py-3 pl-3 pr-5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHymn(h);
                                setEditorOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                              title="Edit hymn"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteHymn(h.number)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                              title="Delete hymn"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredHymns.map((h) => {
              const status = getHymnStatus(h);
              return (
                <div
                  key={h.number}
                  onClick={() => setPreviewHymn(h)}
                  className="cursor-pointer rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-indigo-300 dark:hover:border-indigo-800 transition flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        BHB {h.number}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          status === "completed"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : status === "missing_verses"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                    <h3 className="mt-2 font-semibold text-sm line-clamp-1">
                      {h.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {h.category}
                    </p>
                  </div>

                  <div
                    className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-2.5 text-xs text-slate-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="font-mono">
                      {h.verses.length} verse{h.verses.length === 1 ? "" : "s"}
                      {h.chorus ? " • Chorus" : ""}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHymn(h);
                          setEditorOpen(true);
                        }}
                        className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteHymn(h.number)}
                        className="rounded-md p-1 hover:bg-rose-50 text-rose-500 dark:hover:bg-rose-950/40"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      {editorOpen && (
        <HymnEditorModal
          key={editingHymn ? `edit-${editingHymn.number}` : `new-${nextAvailableNumber}`}
          isOpen={editorOpen}
          initialHymn={editingHymn}
          suggestedNumber={nextAvailableNumber}
          existingNumbers={existingNumbers}
          allCategories={allCategories}
          onClose={() => setEditorOpen(false)}
          onSave={handleSaveHymn}
        />
      )}

      <RawParserModal
        isOpen={rawParserOpen}
        existingNumbers={existingNumbers}
        onClose={() => setRawParserOpen(false)}
        onEditParsed={(hymn) => {
          setEditingHymn(hymn);
          setEditorOpen(true);
        }}
        onImportBatch={handleBatchImport}
      />

      <BatchUploadModal
        isOpen={batchUploadOpen}
        existingNumbers={existingNumbers}
        onClose={() => setBatchUploadOpen(false)}
        onImportBatch={handleBatchImport}
      />

      <HymnPreviewModal
        hymn={previewHymn}
        onClose={() => setPreviewHymn(null)}
        onEdit={(hymn) => {
          setEditingHymn(hymn);
          setEditorOpen(true);
        }}
        onDelete={(num) => void handleDeleteHymn(num)}
      />
    </div>
  );
}

