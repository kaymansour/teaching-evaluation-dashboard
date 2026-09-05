// app/faculty/page.tsx
//
// The individual faculty report, at /faculty
//
// This part runs on the server. It loads the list of teachers once,
// then hands it to the interactive part.

import { promises as fs } from "fs";
import path from "path";

import type { FacultyList } from "@/types/metrics";

import { FacultyReport } from "@/components/dashboard/faculty-report";

export default async function FacultyPage() {
  // Read the dropdown list from disk
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "faculty-list.json"
  );
  const text = await fs.readFile(filePath, "utf-8");
  const list = JSON.parse(text) as FacultyList;

  const withResults = list.faculty.length;
  const belowThreshold = list.faculty.filter(
    (person) => person.status === "Improvement Required"
  ).length;

  return (
    // The same tinted plane as the overview, so the two dashboards
    // read as one product. It prints white.
    <div className="dashboard-plane flex-1 bg-[var(--plane)]">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10 print:hidden">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Individual report
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Faculty teaching evaluation
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Select a faculty member to see their teaching evaluation results
            against the UK Professional Standards Framework. Every report can
            be downloaded as a PDF.
          </p>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t pt-4 text-sm">
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">Faculty with results</dt>
              <dd className="font-medium tabular-nums">{withResults}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">
                Below the threshold
              </dt>
              <dd className="font-medium tabular-nums">{belowThreshold}</dd>
            </div>
          </dl>
        </header>

        <FacultyReport faculty={list.faculty} />
      </main>
    </div>
  );
}
