export interface Hymn {
  number: number;
  title: string;
  category: string;
  amen: string | null;
  chorusAfterEachVerse: boolean;
  chorus: string | null;
  verses: string[];
}

export type HymnCompletionStatus = "completed" | "missing_verses" | "draft";

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ParsedHymnResult {
  hymn: Hymn;
  issues: ValidationIssue[];
  rawSnippet?: string;
}

export const DEFAULT_CATEGORIES = [
  "Iyin ati Ope",
  "Adura",
  "Igbagbo ati Ireti",
  "Ajinde ati Isegun",
  "Ife Olorun",
  "Iwa Mimo",
  "Ojo Isinmi",
  "Ibukun",
  "Ijosin",
  "Idariji Ese",
  "Orin Owuro",
  "Orin Ale",
] as const;

export const MAX_HYMN_NUMBER = 600;
export const MIN_HYMN_NUMBER = 1;

