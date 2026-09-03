// app/overview/page.tsx
//
// The institutional overview page, at /overview
//
// This is a server component: it runs on the server, reads the data,
// and sends finished HTML to the browser.

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getOverview } from "@/lib/data";

export default async function OverviewPage() {
  // Load the data before rendering anything
  const data = await getOverview();

  // Put the semesters in the right order using SemesterOrder
  const semesters = Object.values(data.bySemester).sort(
    (a, b) => a.semesterOrder - b.semesterOrder
  );

  const improvement = data.improvementSummary;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Teaching evaluation overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculated from {data.institution.questionCount.toLocaleString()}{" "}
          survey answers across {data.institution.groupCount} classes. The
          minimum acceptable score is {data.target}%.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Institutional average</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.institution.score}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.institution.gap !== null && data.institution.gap >= 0
                ? `${data.institution.gap} points above target`
                : `${Math.abs(data.institution.gap ?? 0)} points below target`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Teachers below {data.target}%</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {improvement.facultyBelow}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              of {improvement.facultyTotal} ({improvement.facultyBelowPercent}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Courses below {data.target}%</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {improvement.courseBelow}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              of {improvement.courseTotal} ({improvement.courseBelowPercent}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Semesters with detailed data</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {semesters.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Spring 2022 has summary data only
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Score by semester</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {semesters.map((semester) => (
            <Card key={semester.semesterName}>
              <CardHeader>
                <CardDescription>{semester.semesterName}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {semester.score}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {semester.groupCount} classes · {semester.academicYear}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">UKPSF categories</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["AA", "Areas of Activity", "What the teacher does"],
              ["CK", "Core Knowledge", "What the teacher knows"],
              ["PV", "Professional Values", "How the teacher behaves"],
            ] as const
          ).map(([code, name, meaning]) => {
            const result = data.byUkpsfCategory[code];
            if (!result) return null;
            return (
              <Card key={code}>
                <CardHeader>
                  <CardDescription>{name}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {result.score}%
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
    </main>
  );
}
