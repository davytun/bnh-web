import { Suspense } from "react";
import { connection } from "next/server";
import { HymnDashboard } from "@/components/HymnDashboard";
import { readHymns } from "@/lib/storage";

async function HymnsLoader() {
  await connection();
  let hymns = [] as Awaited<ReturnType<typeof readHymns>>["hymns"];
  let backend = "local-file" as Awaited<ReturnType<typeof readHymns>>["backend"];

  try {
    const res = await readHymns();
    hymns = res.hymns;
    backend = res.backend;
  } catch {
    // Graceful fallback if cloud storage hasn't been initialized yet
  }

  return <HymnDashboard initialHymns={hymns} initialBackend={backend} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 dark:text-zinc-400">
          Loading BNH Hymnbook Studio...
        </div>
      }
    >
      <HymnsLoader />
    </Suspense>
  );
}
