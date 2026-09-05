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

  const semesters = Object.values(data.bySemester).sort(
    (a, b) => a.semesterOrder - b.semesterOrder
  );
  const first = semesters[0];
  const last = semesters[semesters.length - 1];

  return (
    // The cards sit on a tinted plane so each one reads as a surface
    // of its own rather than as a box drawn on the page.
    <div className="dashboard-plane flex-1 bg-[var(--plane)]">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            University Teaching Evaluation Overview
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Student evaluation results for the whole college, mapped to the UK
            Professional Standards Framework. Anything scoring below{" "}
            {data.target}% is flagged as improvement required.
          </p>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t pt-4 text-sm">
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">Semesters shown</dt>
              <dd className="font-medium">
                {first?.semesterName} to {last?.semesterName}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">Threshold</dt>
              <dd className="font-medium tabular-nums">{data.target}%</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">Departments</dt>
              <dd className="font-medium tabular-nums">
                {Object.keys(data.byDepartment).length}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">Programmes</dt>
              <dd className="font-medium tabular-nums">
                {Object.keys(data.byProgramme).length}
              </dd>
            </div>
          </dl>
        </header>

        <OverviewReport data={data} tracking={tracking} />
      </main>
    </div>
  );
}
