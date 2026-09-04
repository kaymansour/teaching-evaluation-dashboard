// app/overview/page.tsx
//
// The institutional overview, at /overview
//
// Runs on the server. Reads both data files from disk and hands them
// to the interactive part below.

import { promises as fs } from "fs";
import path from "path";

import type { OverviewData, QuestionTracking } from "@/types/metrics";

import { OverviewReport } from "@/components/dashboard/overview-report";

async function readJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(process.cwd(), "public", "data", fileName);
  const text = await fs.readFile(filePath, "utf-8");
  return JSON.parse(text) as T;
}

export default async function OverviewPage() {
  const data = await readJson<OverviewData>("overview.json");
  const tracking = await readJson<QuestionTracking>("question-tracking.json");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Institutional overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Teaching evaluation results across the whole college, mapped to the
          UK Professional Standards Framework. The minimum acceptable score is{" "}
          {data.target}%.
        </p>
      </header>

      <OverviewReport data={data} tracking={tracking} />
    </main>
  );
}
