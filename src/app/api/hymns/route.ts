import { NextRequest, NextResponse } from "next/server";
import { readHymns, writeHymns } from "@/lib/storage";
import { Hymn } from "@/lib/types";
import { normalizeHymn, validateHymn } from "@/lib/validation";

/**
 * GET /api/hymns
 * Returns the complete, numerically sorted, and schema-validated hymns.json array.
 * Pass ?download=1 to trigger a file download.
 */
export async function GET(req: NextRequest) {
  try {
    const { hymns, backend } = await readHymns();
    const isDownload = req.nextUrl.searchParams.get("download") === "1";

    const headers: Record<string, string> = {
      "X-Storage-Backend": backend,
      "Cache-Control": "no-store",
    };

    if (isDownload) {
      headers["Content-Disposition"] = 'attachment; filename="hymns.json"';
    }

    return new NextResponse(JSON.stringify(hymns, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...headers,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load hymns.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/hymns
 * Creates or updates a single hymn.
 * Body: { hymn: Partial<Hymn>, originalNumber?: number | null, allowEmptyVerses?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      hymn?: Partial<Hymn>;
      originalNumber?: number | null;
      allowEmptyVerses?: boolean;
    };

    if (!body?.hymn) {
      return NextResponse.json({ error: "Missing 'hymn' payload." }, { status: 400 });
    }

    const normalized = normalizeHymn(body.hymn);
    const { hymns: existing } = await readHymns();
    const existingNumbers = new Set(existing.map((h) => h.number));

    const issues = validateHymn(normalized, {
      existingNumbers,
      originalNumber: body.originalNumber ?? null,
      allowEmptyVerses: Boolean(body.allowEmptyVerses),
    });

    if (issues.length > 0) {
      return NextResponse.json(
        { error: issues[0].message, issues },
        { status: 422 }
      );
    }

    const filtered = existing.filter(
      (h) => h.number !== normalized.number && h.number !== body.originalNumber
    );
    const updatedList = [...filtered, normalized];
    const { hymns, backend } = await writeHymns(updatedList);

    return NextResponse.json({
      hymn: normalized,
      hymns,
      backend,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save hymn.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/hymns?number=1
 * Deletes a hymn by its number.
 */
export async function DELETE(req: NextRequest) {
  try {
    const numParam = req.nextUrl.searchParams.get("number");
    const number = Number.parseInt(numParam ?? "", 10);
    if (!Number.isInteger(number) || number < 1 || number > 600) {
      return NextResponse.json({ error: "Invalid hymn number." }, { status: 400 });
    }

    const { hymns: existing } = await readHymns();
    const next = existing.filter((h) => h.number !== number);
    if (next.length === existing.length) {
      return NextResponse.json({ error: `Hymn #${number} not found.` }, { status: 404 });
    }

    const { hymns, backend } = await writeHymns(next);
    return NextResponse.json({ deleted: number, hymns, backend });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete hymn.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

