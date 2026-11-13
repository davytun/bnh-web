import { NextRequest, NextResponse } from "next/server";
import { readHymns, writeHymns } from "@/lib/storage";
import { Hymn } from "@/lib/types";
import { normalizeHymn, validateHymn } from "@/lib/validation";

type BatchMode = "overwrite" | "skip_existing";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      hymns?: Partial<Hymn>[];
      mode?: BatchMode;
      allowEmptyVerses?: boolean;
    };

    if (!Array.isArray(body?.hymns) || body.hymns.length === 0) {
      return NextResponse.json(
        { error: "Provide a non-empty 'hymns' array." },
        { status: 400 }
      );
    }

    const mode: BatchMode = body.mode === "skip_existing" ? "skip_existing" : "overwrite";
    const allowEmptyVerses = Boolean(body.allowEmptyVerses);

    const normalizedIncoming = body.hymns.map((h) => normalizeHymn(h));

    // Check for duplicate numbers within the incoming batch
    const seenInBatch = new Set<number>();
    const itemErrors: { number: number; title: string; errors: string[] }[] = [];

    for (const h of normalizedIncoming) {
      const issues = validateHymn(h, { allowEmptyVerses });
      if (seenInBatch.has(h.number)) {
        issues.push({
          field: "number",
          message: `Duplicate hymn #${h.number} inside batch upload.`,
        });
      }
      seenInBatch.add(h.number);

      if (issues.length > 0) {
        itemErrors.push({
          number: h.number,
          title: h.title || "(Untitled)",
          errors: issues.map((i) => i.message),
        });
      }
    }

    if (itemErrors.length > 0) {
      return NextResponse.json(
        {
          error: `${itemErrors.length} hymn(s) failed validation.`,
          itemErrors,
        },
        { status: 422 }
      );
    }

    const { hymns: existing } = await readHymns();
    const map = new Map<number, Hymn>(existing.map((h) => [h.number, h]));

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const h of normalizedIncoming) {
      if (map.has(h.number)) {
        if (mode === "skip_existing") {
          skipped++;
          continue;
        }
        updated++;
      } else {
        added++;
      }
      map.set(h.number, h);
    }

    const { hymns, backend } = await writeHymns(Array.from(map.values()));

    return NextResponse.json({
      added,
      updated,
      skipped,
      hymns,
      backend,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Batch import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

