import { Hymn, ParsedHymnResult, ValidationIssue } from "./types";
import { normalizeHymn, normalizeLyricsBlock, validateHymn } from "./validation";

const HYMN_HEADER_RE =
  /^(?:BHB\s*#?|HYMN\s*#?|ORIN\s*#?|NO\.?\s*|NUMBER\s*:\s*|#)(\d+)\s*$/i;
const BARE_NUMBER_RE = /^(\d{1,3})\s*$/;
const TITLE_LINE_RE = /^Title\s*:\s*(.+)$/i;
const CATEGORY_LINE_RE = /^Category\s*:\s*(.+)$/i;
const AMEN_META_RE = /^Amen\s*:\s*(.*)$/i;
const CHORUS_AFTER_META_RE = /^ChorusAfterEachVerse\s*:\s*(true|false|yes|no|1|0)\s*$/i;
const VERSE_START_RE = /^(?:Verse\s+)?(\d+)[.):]\s*(.*)$/i;
const CHORUS_START_RE = /^(?:Chorus|Refrain|Egbe)\s*:?\s*(.*)$/i;
const AMEN_STANDALONE_RE = /^(?:Amin|Amen)\.?\s*$/i;
const SEPARATOR_RE = /^[-=]{3,}\s*$/;

/**
 * Splits a multi-hymn raw text into individual hymn text blocks.
 */
export function splitRawHymnBlocks(rawText: string): string[] {
  const unified = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = unified.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let hasContent = false;

  const flush = () => {
    const joined = current.join("\n").trim();
    if (joined.length > 0) {
      blocks.push(joined);
    }
    current = [];
    hasContent = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (SEPARATOR_RE.test(trimmed)) {
      flush();
      continue;
    }

    // Start a new block if we encounter a new explicit hymn header (e.g. "BHB 2")
    // after we have already accumulated lines for a previous hymn.
    if (hasContent && HYMN_HEADER_RE.test(trimmed)) {
      flush();
    }

    if (trimmed.length > 0) {
      hasContent = true;
    }
    current.push(line);
  }

  flush();
  return blocks;
}

/**
 * Parses a single raw hymn text block into a Hymn + ValidationIssues.
 */
export function parseSingleRawHymn(blockText: string): ParsedHymnResult {
  const lines = blockText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const issues: ValidationIssue[] = [];

  let number = 0;
  let title = "";
  let category = "";
  let amen: string | null = null;
  let explicitChorusAfterEach: boolean | null = null;

  const verses: { num: number; lines: string[] }[] = [];
  const choruses: string[] = [];

  type Section =
    | { type: "header" }
    | { type: "verse"; index: number }
    | { type: "chorus"; lines: string[] };

  let section: Section = { type: "header" };
  let chorusAppearedBetweenVerses = false;

  const flushChorus = () => {
    if (section.type === "chorus") {
      const normalized = normalizeLyricsBlock(section.lines.join("\n"));
      if (normalized.length > 0) {
        choruses.push(normalized);
      }
      section = { type: "header" };
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check hymn number header
    if (number === 0 && section.type === "header") {
      const headerMatch = trimmed.match(HYMN_HEADER_RE);
      if (headerMatch) {
        number = Number.parseInt(headerMatch[1], 10);
        continue;
      }
      const bareMatch = trimmed.match(BARE_NUMBER_RE);
      if (bareMatch) {
        number = Number.parseInt(bareMatch[1], 10);
        continue;
      }
    }

    // Metadata lines (only in header or before verses/chorus)
    if (section.type === "header") {
      const titleMatch = trimmed.match(TITLE_LINE_RE);
      if (titleMatch) {
        title = titleMatch[1].trim();
        continue;
      }
      const catMatch = trimmed.match(CATEGORY_LINE_RE);
      if (catMatch) {
        category = catMatch[1].trim();
        continue;
      }
      const amenMetaMatch = trimmed.match(AMEN_META_RE);
      if (amenMetaMatch) {
        const val = amenMetaMatch[1].trim();
        amen = val.length > 0 ? val : null;
        continue;
      }
      const chorusAfterMatch = trimmed.match(CHORUS_AFTER_META_RE);
      if (chorusAfterMatch) {
        const v = chorusAfterMatch[1].toLowerCase();
        explicitChorusAfterEach = v === "true" || v === "yes" || v === "1";
        continue;
      }
    }

    // Chorus start
    const chorusMatch = trimmed.match(CHORUS_START_RE);
    if (chorusMatch) {
      flushChorus();
      if (verses.length > 0) {
        chorusAppearedBetweenVerses = true;
      }
      const inlineText = chorusMatch[1]?.trim() ?? "";
      section = {
        type: "chorus",
        lines: inlineText.length > 0 ? [inlineText] : [],
      };
      continue;
    }

    // Verse start
    const verseMatch = trimmed.match(VERSE_START_RE);
    if (verseMatch) {
      flushChorus();
      const verseNum = Number.parseInt(verseMatch[1], 10);
      const inlineText = verseMatch[2] ?? "";
      verses.push({
        num: verseNum,
        lines: inlineText.trim().length > 0 ? [inlineText.replace(/[ \t]+$/g, "")] : [],
      });
      section = { type: "verse", index: verses.length - 1 };
      continue;
    }

    // Standalone Amen at the end (or after verses/chorus)
    if (AMEN_STANDALONE_RE.test(trimmed) && (verses.length > 0 || choruses.length > 0)) {
      // Only treat as Amen if remaining non-empty lines are empty
      const hasMoreContent = lines.slice(i + 1).some((l) => l.trim().length > 0);
      if (!hasMoreContent) {
        flushChorus();
        amen = trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
        break;
      }
    }

    // Fallback title if in header and not empty and we already have a number (or before verses)
    if (section.type === "header") {
      if (trimmed.length > 0 && !title) {
        title = trimmed;
      }
      continue;
    }

    if (section.type === "verse") {
      verses[section.index].lines.push(rawLine.replace(/[ \t]+$/g, ""));
    } else if (section.type === "chorus") {
      section.lines.push(rawLine.replace(/[ \t]+$/g, ""));
    }
  }

  flushChorus();

  // Check contiguous verse numbers (1, 2, 3...)
  for (let idx = 0; idx < verses.length; idx++) {
    const expected = idx + 1;
    if (verses[idx].num !== expected) {
      issues.push({
        field: "verses",
        message: `Skipped or out-of-order verse number: expected Verse ${expected}, found ${verses[idx].num}.`,
      });
      break;
    }
  }

  // Enforce at most 1 distinct chorus per hymn
  const uniqueChoruses = Array.from(new Set(choruses));
  if (uniqueChoruses.length > 1) {
    issues.push({
      field: "chorus",
      message: `Found ${uniqueChoruses.length} distinct choruses. At most 1 distinct chorus is allowed per hymn.`,
    });
  }

  const chorusText = uniqueChoruses[0] ?? null;
  const chorusAfterEachVerse =
    explicitChorusAfterEach !== null
      ? explicitChorusAfterEach
      : chorusText !== null && (choruses.length > 1 || chorusAppearedBetweenVerses);

  const hymn = normalizeHymn({
    number,
    title,
    category,
    amen,
    chorusAfterEachVerse,
    chorus: chorusText,
    verses: verses.map((v) => v.lines.join("\n")),
  });

  const schemaIssues = validateHymn(hymn);
  return {
    hymn,
    issues: [...issues, ...schemaIssues],
    rawSnippet: blockText.slice(0, 140),
  };
}

export function parseRawHymnsText(rawText: string): ParsedHymnResult[] {
  const blocks = splitRawHymnBlocks(rawText);
  return blocks.map(parseSingleRawHymn);
}

/**
 * Minimal RFC-4180 CSV parser supporting quoted multiline fields.
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

export function parseCsvHymns(csvText: string): ParsedHymnResult[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const results: ParsedHymnResult[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (name: string) => {
      const idx = headers.indexOf(name.toLowerCase());
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };

    const number = Number.parseInt(get("number"), 10) || 0;
    const title = get("title");
    const category = get("category");
    const amenRaw = get("amen");
    const chorusRaw = get("chorus");
    const chorusAfterRaw = get("chorusaftereachverse").toLowerCase();
    const chorusAfterEachVerse =
      chorusAfterRaw === "true" || chorusAfterRaw === "yes" || chorusAfterRaw === "1";

    let verses: string[] = [];
    const versesCell = get("verses");
    if (versesCell.length > 0) {
      if (versesCell.startsWith("[")) {
        try {
          const parsed = JSON.parse(versesCell);
          if (Array.isArray(parsed)) {
            verses = parsed.map((v) => String(v));
          }
        } catch {
          verses = versesCell.split(/\s*\|\|\s*/);
        }
      } else if (versesCell.includes("||")) {
        verses = versesCell.split(/\s*\|\|\s*/);
      } else if (versesCell.includes("---")) {
        verses = versesCell.split(/\s*---\s*/);
      } else {
        verses = [versesCell];
      }
    } else {
      // Support verse1, verse2, verse3... columns
      for (let vIdx = 1; vIdx <= 20; vIdx++) {
        const vVal = get(`verse${vIdx}`) || get(`verse_${vIdx}`);
        if (vVal.length > 0) {
          verses.push(vVal);
        }
      }
    }

    const hymn = normalizeHymn({
      number,
      title,
      category,
      amen: amenRaw || null,
      chorusAfterEachVerse,
      chorus: chorusRaw || null,
      verses,
    });

    results.push({
      hymn,
      issues: validateHymn(hymn),
      rawSnippet: `Row ${r + 1}: #${number} ${title}`,
    });
  }

  return results;
}

export function parseJsonHymns(jsonText: string): ParsedHymnResult[] {
  const parsed = JSON.parse(jsonText) as unknown;
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { hymns?: unknown[] }).hymns)
      ? (parsed as { hymns: unknown[] }).hymns
      : null;

  if (!arr) {
    throw new Error("JSON file must contain an array of hymn objects.");
  }

  return arr.map((item, idx) => {
    const obj = (item && typeof item === "object" ? item : {}) as Partial<Hymn>;
    const hymn = normalizeHymn(obj);
    return {
      hymn,
      issues: validateHymn(hymn),
      rawSnippet: `Item ${idx + 1}: #${hymn.number} ${hymn.title}`,
    };
  });
}

export function parseBatchFile(filename: string, content: string): ParsedHymnResult[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) {
    return parseJsonHymns(content);
  }
  if (lower.endsWith(".csv")) {
    return parseCsvHymns(content);
  }
  return parseRawHymnsText(content);
}

