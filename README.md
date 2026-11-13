# BNH Hymnbook Studio

A modern full-stack Next.js (App Router, React 19, TypeScript, Tailwind CSS) application to type, parse, validate, manage, and export 600+ hymns into the mobile hymnbook JSON schema.

## Features

- **3 Input Methods**:
  1. **Direct Form Editor**: Number (1–600 with uniqueness check), Title, Category (presets + custom), optional Amen, Chorus + `chorusAfterEachVerse` toggle, dynamic Verses with exact `\n` line break preservation, and live JSON preview.
  2. **Raw Text Auto-Parser**: Paste raw lyrics from Word or Notepad (`BHB 1`, `Title:`, `Category:`, numbered verses, `Chorus:`, `Amin.`) — supports single or multiple hymns at once.
  3. **Batch File Upload**: Upload `.txt`, `.json`, or `.csv` files with per-hymn validation before importing.
- **Validation Engine**: Enforces unique hymn numbers (1–600), non-empty title & category, contiguous verses (1, 2, 3...), and at most 1 distinct chorus per hymn.
- **Cloud Persistence & API**:
  - Uses **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`) in production so everyone sees the live cloud database.
  - Automatically falls back to `.data/hymns.json` in local development.
  - `GET /api/hymns`: Returns the complete, numerically sorted, schema-validated `hymns.json` array.
  - One-click **Download hymns.json** button.

## Local Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push this repository to GitHub and import it into Vercel.
2. In your Vercel project dashboard, go to **Storage → Create Database → Blob** and connect it to your project. Vercel will automatically set `BLOB_READ_WRITE_TOKEN`.
3. Redeploy (or deploy) — all hymns will be persisted in Vercel Blob and served live via `GET /api/hymns`.
