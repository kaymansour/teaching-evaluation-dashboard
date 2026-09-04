// app/page.tsx
//
// The landing page, at /
//
// Runs on the server so it can read the headline figures straight
// from disk and show them without the browser fetching anything.

import { promises as fs } from "fs";
import path from "path";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { OverviewData } from "@/types/metrics";

export default async function HomePage() {
  const filePath = path.join(process.cwd(), "public", "data", "overview.json");
  const text = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(text) as OverviewData;

  const semesters = Object.values(data.bySemester).sort(
    (a, b) => a.semesterOrder - b.semesterOrder
  );

  const first = semesters[0];
  const last = semesters[semesters.length - 1];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* ---------- Introduction ---------- */}
      <section className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Teaching evaluation, {first?.academicYear.split("/")[0]} to{" "}
          {last?.academicYear.split("/")[1]}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Students rated their teaching across four semesters. Every scored
          question is mapped to the UK Professional Standards Framework, and
          anything below {data.target}% is flagged for improvement.
        </p>
      </section>

      {/* ---------- The two dashboards ---------- */}
      <section className="mt-12">
        <h2 className="mb-4 text-lg font-medium">Open a dashboard</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/overview" className="group block">
            <Card className="h-full transition-all group-hover:border-[#E0241B]/40 group-hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">
                  Institutional overview
                </CardTitle>
                <CardDescription>
                  How the college is performing overall, how results have moved
                  across semesters and academic years, and which courses,
                  faculty and questions need attention.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-[#E0241B]">
                  Open overview &rarr;
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/faculty" className="group block">
            <Card className="h-full transition-all group-hover:border-[#E0241B]/40 group-hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">
                  Individual faculty report
                </CardTitle>
                <CardDescription>
                  Search for a faculty member to see their UKPSF results, their
                  performance over time, every class they taught, and where
                  improvement is required. Downloadable as a PDF.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-[#E0241B]">
                  Open faculty report &rarr;
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </main>
  );
}
