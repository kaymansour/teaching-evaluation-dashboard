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

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Individual faculty report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a faculty member to see their teaching evaluation results
          against the UK Professional Standards Framework.
        </p>
      </header>

      <FacultyReport faculty={list.faculty} />
    </main>
  );
}