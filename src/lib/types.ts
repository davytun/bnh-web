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
  "Orin Asaju ati Akunleko",
  "Orin Akole (Doxology)",
  "Orin Owuro",
  "Orin Ale",
  "Orin Ope ati Iyin",
  "Orin Ikore",
  "Bibo Jesu",
  "Orin Ojo Ibi Kristi",
  "Orin Opin Odun",
  "Orin Odun Titun",
  "Orin Ijo Olorun",
  "Orin Lent Ironupiwada",
  "Orin Ose Ijiya Jesu",
  "Orin Ajinde Jesu",
  "Orin Igoke re orun ati oke-orun",
  "Orin Emi",
  "Orin oro Olorun",
  "Orin Adura",
  "Orin Ise Isin",
  "Orin Igbagbo",
  "Orin Isegun",
  "Orin Omode",
  "Orin Itore anu ati Ipese",
  "Orin Onje Ale Oluwa",
  "Orin Iribomi",
  "Orin Igbeyawo",
  "Orin Isinku",
  "Orin Kiko tabi Sisi Ile Olorun",
  "Orin Oniruru Igba",
] as const;

export const MAX_HYMN_NUMBER = 600;
export const MIN_HYMN_NUMBER = 1;

