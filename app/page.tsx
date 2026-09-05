// app/page.tsx
//
// The landing page, at /
//
// Runs on the server so it can read the headline figures straight
// from disk and show them without the browser fetching anything.
//
// It shares its cards, meter and status pill with the two dashboards.
// Those come from report-ui, which carries no charting library, so
// this page stays light.

import { promises as fs } from "fs";
import path from "path";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Meter, StatusPill, showScore } from "@/components/dashboard/report-ui";

import type { OverviewData } from "@/types/metrics";

const DASHBOARDS = [
  {
    href: "/overview",
    title: "Institutional overview",
    description:
      "How the college is performing overall, how results have moved across semesters and academic years, and which courses, faculty and questions need attention.",
    action: "Open overview",
  },
  {
    href: "/faculty",
    title: "Individual faculty report",
    description:
      "Search for a faculty member to see their UKPSF results, their performance over time, every class they taught, and where improvement is required. Downloadable as a PDF.",
    action: "Open faculty report",
  },
];

export default async function HomePage() {
  const filePath = path.join(process.cwd(), "public", "data", "overview.json");
  const text = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(text) as OverviewData;

  const semesters = Object.values(data.bySemester).sort(
    (a, b) => a.semesterOrder - b.semesterOrder
  );

  const first = semesters[0];
  const last = semesters[semesters.length - 1];

  const coverage = [
    { label: "Departments", value: Object.keys(data.byDepartment).length },
    { label: "Programmes", value: Object.keys(data.byProgramme).length },
    { label: "Faculty", value: data.improvementSummary?.facultyTotal ?? null },
    { label: "Courses", value: data.improvementSummary?.courseTotal ?? null },
  ].filter((item) => item.value !== null);

  return (
    <div className="dashboard-plane flex-1 bg-[var(--plane)]">
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* ---------- Introduction, with the headline figure beside it ---------- */}
        <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quality Assurance
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Teaching evaluation, {first?.academicYear.split("/")[0]} to{" "}
              {last?.academicYear.split("/")[1]}
            </h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              Students rated their teaching across four semesters. Every scored
              question is mapped to the UK Professional Standards Framework,
              and anything below {data.target}% is flagged for improvement.
            </p>
          </div>

          <Card className="gap-5 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Institutional average
              </p>
              <p className="mt-3 text-5xl font-semibold leading-none tracking-tight">
                {showScore(data.institution.score)}
              </p>
              <div className="mt-4">
                <StatusPill status={data.institution.status} />
              </div>
            </div>
            <div className="space-y-2">
              <Meter score={data.institution.score} target={data.target} />
              <p className="text-sm text-muted-foreground">
                {data.institution.questionCount.toLocaleString()} student
                answers across {data.institution.groupCount} classes
              </p>
            </div>
          </Card>
        </section>

        {/* ---------- The two dashboards ---------- */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            Open a dashboard
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {DASHBOARDS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-red)]"
              >
                <Card className="h-full justify-between gap-4 p-6 transition-all group-hover:shadow-md group-hover:ring-foreground/20">
                  <div>
                    <p className="text-lg font-semibold tracking-tight">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--brand-red)" }}
                  >
                    {item.action}{" "}
                    <span className="inline-block transition-transform group-hover:translate-x-0.5">
                      &rarr;
                    </span>
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- What the data covers ---------- */}
        <section className="mt-14 border-t pt-6">
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            <div className="flex items-baseline gap-2 text-sm">
              <dt className="text-muted-foreground">Semesters shown</dt>
              <dd className="font-medium">
                {first?.semesterName} to {last?.semesterName}
              </dd>
            </div>
            {coverage.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2 text-sm">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="font-medium tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
