import {
  Hymn,
  HymnCompletionStatus,
  MAX_HYMN_NUMBER,
  MIN_HYMN_NUMBER,
  ValidationIssue,
} from "./types";

/**
 * Normalizes line endings to `\n` and trims leading/trailing blank lines
 * while strictly preserving internal line breaks.
 */
export function normalizeLyricsBlock(text: string): string {
  const unified = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = unified.split("\n").map((line) => line.replace(/[ \t]+$/g, ""));

  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  return lines.join("\n");
}

/**
 * Returns a clean Hymn object conforming strictly to the mobile hymnbook JSON schema.
 */
export function normalizeHymn(input: Partial<Hymn>): Hymn {
  const number =
    typeof input.number === "number" && Number.isFinite(input.number)
      ? Math.trunc(input.number)
      : Number.parseInt(String(input.number ?? ""), 10) || 0;

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";

  let amen: string | null = null;
  if (typeof input.amen === "string") {
    const trimmed = input.amen.trim();
    if (
      trimmed.length > 0 &&
      trimmed.toLowerCase() !== "null" &&
      trimmed.toLowerCase() !== "none"
    ) {
      amen = trimmed;
    }
  }

  const rawChorus = typeof input.chorus === "string" ? normalizeLyricsBlock(input.chorus) : "";
  const chorus = rawChorus.length > 0 ? rawChorus : null;

  const chorusAfterEachVerse = Boolean(input.chorusAfterEachVerse) && chorus !== null;

  const verses = Array.isArray(input.verses)
    ? input.verses.map((v) => (typeof v === "string" ? normalizeLyricsBlock(v) : ""))
    : [];

  return {
    number,
    title,
    category,
    amen,
    chorusAfterEachVerse,
    chorus,
    verses,
  };
}

export interface ValidateHymnOptions {
  existingNumbers?: Set<number>;
  originalNumber?: number | null;
  allowEmptyVerses?: boolean;
}

export function validateHymn(
  hymn: Hymn,
  options: ValidateHymnOptions = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { existingNumbers, originalNumber = null, allowEmptyVerses = false } = options;

  if (
    !Number.isInteger(hymn.number) ||
    hymn.number < MIN_HYMN_NUMBER ||
    hymn.number > MAX_HYMN_NUMBER
  ) {
    issues.push({
      field: "number",
      message: `Hymn number must be an integer between ${MIN_HYMN_NUMBER} and ${MAX_HYMN_NUMBER}.`,
    });
  } else if (
    existingNumbers &&
    existingNumbers.has(hymn.number) &&
    hymn.number !== originalNumber
  ) {
    issues.push({
      field: "number",
      message: `Hymn #${hymn.number} already exists. Each hymn number must be unique.`,
    });
  }

  if (!hymn.title || hymn.title.trim().length === 0) {
    issues.push({
      field: "title",
      message: "Hymn title is required.",
    });
  }

  if (!hymn.category || hymn.category.trim().length === 0) {
    issues.push({
      field: "category",
      message: "Hymn category is required.",
    });
  }

  if (!allowEmptyVerses && hymn.verses.length === 0) {
    issues.push({
      field: "verses",
      message: "At least one verse is required.",
    });
  }

  hymn.verses.forEach((verse, idx) => {
    if (!verse || verse.trim().length === 0) {
      issues.push({
        field: `verses.${idx}`,
        message: `Verse ${idx + 1} cannot be empty (verses must be contiguous 1..${hymn.verses.length}).`,
      });
    }
  });

  if (hymn.chorusAfterEachVerse && (!hymn.chorus || hymn.chorus.trim().length === 0)) {
    issues.push({
      field: "chorus",
      message: "Chorus text is required when 'Repeat chorus after each verse' is enabled.",
    });
  }

  return issues;
}

export function getHymnStatus(hymn: Hymn): HymnCompletionStatus {
  const hasValidNumber =
    Number.isInteger(hymn.number) &&
    hymn.number >= MIN_HYMN_NUMBER &&
    hymn.number <= MAX_HYMN_NUMBER;
  const hasTitle = hymn.title.trim().length > 0;
  const hasCategory = hymn.category.trim().length > 0;
  const hasVerses = hymn.verses.length > 0 && hymn.verses.every((v) => v.trim().length > 0);

  if (!hasValidNumber || !hasTitle || !hasCategory) {
    return "draft";
  }
  if (!hasVerses) {
    return "missing_verses";
  }
  return "completed";
}

export function sortHymns(hymns: Hymn[]): Hymn[] {
  return [...hymns].sort((a, b) => a.number - b.number);
}

export function toExportJson(hymns: Hymn[]): Hymn[] {
  return sortHymns(hymns).map((h) => normalizeHymn(h));
}

