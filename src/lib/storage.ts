import { promises as fs } from "node:fs";
import path from "node:path";
import { list, put } from "@vercel/blob";
import { Hymn } from "./types";
import { toExportJson } from "./validation";

const BLOB_PATHNAME = "hymns.json";
const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
const LOCAL_DATA_FILE = path.join(LOCAL_DATA_DIR, "hymns.json");

export type StorageBackend = "vercel-blob" | "local-file";

export function getStorageBackend(): StorageBackend {
  return process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local-file";
}

async function readFromVercelBlob(): Promise<Hymn[]> {
  const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 10 });
  const exact = blobs.find((b) => b.pathname === BLOB_PATHNAME) ?? blobs[0];
  if (!exact) {
    return [];
  }

  const res = await fetch(exact.url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch hymns from Vercel Blob (${res.status}).`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    return [];
  }
  return toExportJson(data as Hymn[]);
}

async function writeToVercelBlob(hymns: Hymn[]): Promise<void> {
  const clean = toExportJson(hymns);
  await put(BLOB_PATHNAME, JSON.stringify(clean, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readFromLocalFile(): Promise<Hymn[]> {
  try {
    const raw = await fs.readFile(LOCAL_DATA_FILE, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return toExportJson(data as Hymn[]);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

async function writeToLocalFile(hymns: Hymn[]): Promise<void> {
  const clean = toExportJson(hymns);
  try {
    await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
    await fs.writeFile(LOCAL_DATA_FILE, JSON.stringify(clean, null, 2), "utf-8");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "EROFS" || code === "EACCES") {
      throw new Error(
        "Read-only filesystem detected. Connect Vercel Blob (BLOB_READ_WRITE_TOKEN) in your Vercel project Storage settings to persist hymns in the cloud."
      );
    }
    throw err;
  }
}

export async function readHymns(): Promise<{ hymns: Hymn[]; backend: StorageBackend }> {
  const backend = getStorageBackend();
  const hymns =
    backend === "vercel-blob" ? await readFromVercelBlob() : await readFromLocalFile();
  return { hymns, backend };
}

export async function writeHymns(hymns: Hymn[]): Promise<{ hymns: Hymn[]; backend: StorageBackend }> {
  const backend = getStorageBackend();
  const clean = toExportJson(hymns);
  if (backend === "vercel-blob") {
    await writeToVercelBlob(clean);
  } else {
    await writeToLocalFile(clean);
  }
  return { hymns: clean, backend };
}

