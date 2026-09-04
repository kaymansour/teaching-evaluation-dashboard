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

      {/* ---------- Headline figures ---------- */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Institutional average
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.institution.score}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.institution.gap !== null && data.institution.gap >= 0
                ? `${data.institution.gap} points above the threshold`
                : `${Math.abs(
                    data.institution.gap ?? 0
                  )} points below the threshold`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Survey answers
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.institution.questionCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              from {data.institution.groupCount} classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Faculty evaluated
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.improvementSummary.facultyTotal}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.improvementSummary.facultyBelow} below {data.target}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Courses evaluated
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.improvementSummary.courseTotal}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.improvementSummary.courseBelow} below {data.target}%
            </p>
          </CardContent>
        </Card>
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

      {/* ---------- What UKPSF means ---------- */}
      <section className="mt-12">
        <h2 className="mb-1 text-lg font-medium">
          What the survey measures
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The twenty scored questions map to three areas of the UK
          Professional Standards Framework.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["AA", "Areas of Activity", "What the faculty member does in class"],
              ["CK", "Core Knowledge", "What they know about the subject"],
              ["PV", "Professional Values", "How they treat students"],
            ] as const
          ).map(([code, name, meaning]) => {
            const result = data.byUkpsfCategory[code];
            return (
              <Card key={code}>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{name}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {result ? `${result.score}%` : "\u2014"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{meaning}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ---------- Note on coverage ---------- */}
      <section className="mt-10">
        <p className="text-xs text-muted-foreground">
          Figures cover Fall 2020, Spring 2021 and Fall 2021. Spring 2022 was
          supplied as department summaries only, without question-level data.
          Department and programme comparisons require a course-to-department
          mapping that the source files do not contain.
        </p>
      </section>
    </main>
  );
}
