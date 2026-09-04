"use client";

// components/dashboard/faculty-report.tsx
//
// The interactive part of the faculty page.
//
// "use client" means this runs in the browser, because it responds to
// the user choosing a name from the dropdown.

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  FacultyDetail,
  FacultyListItem,
  ClassResult,
} from "@/types/metrics";

// Show a score with one decimal place, or a dash if there is none
function showScore(score: number | null) {
  if (score === null) return "—";
  return `${score}%`;
}

// A short plain-English note about how far a score is from the target
function targetNote(score: number | null, target: number) {
  if (score === null) return "No data";
  const difference = Math.round((score - target) * 10) / 10;
  if (difference < 0) {
    return `${Math.abs(difference)} points below the ${target}% target`;
  }
  return `${difference} points above the ${target}% target`;
}

// A small coloured label saying whether a result is acceptable.
// The word is always shown, never colour alone.
function StatusLabel({ status }: { status: string }) {
  const needsWork = status === "Improvement Required";
  return (
    <span
      className={
        "inline-block rounded px-2 py-0.5 text-xs font-medium " +
        (needsWork
          ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200"
          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200")
      }
    >
      {needsWork ? "Improvement required" : "Acceptable"}
    </span>
  );
}

export function FacultyReport({ faculty }: { faculty: FacultyListItem[] }) {
  // Which teacher is selected, and their loaded details
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<FacultyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Fetch one teacher's file when the dropdown changes
  async function handleChange(id: string) {
    setSelectedId(id);
    setDetail(null);
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/data/faculty/${id}.json`);
      if (!response.ok) {
        throw new Error(`Could not load data for faculty ${id}`);
      }
      setDetail((await response.json()) as FacultyDetail);
    } catch {
      setError("Could not load this faculty member's results. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* --- The filter --- */}
      <div className="mb-8">
        <label
          htmlFor="faculty-select"
          className="mb-2 block text-sm font-medium"
        >
          Faculty member
        </label>
        <Select value={selectedId} onValueChange={handleChange}>
          <SelectTrigger id="faculty-select" className="w-full sm:w-96">
            <SelectValue placeholder="Choose a faculty member" />
          </SelectTrigger>
          <SelectContent>
            {faculty.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-sm text-muted-foreground">
          {faculty.length} faculty members with evaluation results.
        </p>
      </div>

      {/* --- Empty state --- */}
      {!selectedId && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No faculty selected</CardTitle>
            <CardDescription>
              Choose a name above to see their results.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* --- Loading state --- */}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading results…</p>
      )}

      {/* --- Error state --- */}
      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* --- The report --- */}
      {detail && !loading && (
        <Report detail={detail} />
      )}
    </div>
  );
}

function Report({ detail }: { detail: FacultyDetail }) {
  const target = detail.benchmarks.target;

  // Semesters in chronological order
  const semesters = Object.values(detail.bySemester).sort(
    (a, b) => a.semesterOrder - b.semesterOrder
  );

  // Classes scoring below the target
  const weakClasses = detail.classes
    .filter((c) => c.status === "Improvement Required")
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

  // Questions scoring below the target
  const weakQuestions = Object.entries(detail.byQuestion)
    .filter(([, q]) => q.status === "Improvement Required")
    .sort((a, b) => (a[1].score ?? 0) - (b[1].score ?? 0));

  const categoryNames: Record<string, string> = {
    AA: "Areas of Activity",
    CK: "Core Knowledge",
    PV: "Professional Values",
  };

  return (
    <div className="space-y-10">
      {/* --- Headline --- */}
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{detail.name}</h2>
          <StatusLabel status={detail.overall.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Overall score</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {showScore(detail.overall.score)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {targetNote(detail.overall.score, target)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Institutional average</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {showScore(detail.benchmarks.institution)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {detail.overall.score !== null &&
                detail.benchmarks.institution !== null
                  ? `${
                      Math.round(
                        (detail.overall.score -
                          detail.benchmarks.institution) *
                          10
                      ) / 10
                    } points difference`
                  : "No comparison available"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Classes taught</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {detail.classCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                across {detail.courseCount} courses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Survey answers</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {detail.overall.questionCount.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                used in these calculations
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* --- UKPSF --- */}
      <section>
        <h3 className="mb-4 text-lg font-medium">UKPSF categories</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {["AA", "CK", "PV"].map((code) => {
            const result = detail.ukpsfCategories[code];
            if (!result) return null;
            return (
              <Card key={code}>
                <CardHeader>
                  <CardDescription>{categoryNames[code]}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {showScore(result.score)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StatusLabel status={result.status} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* --- Semester trend --- */}
      <section>
        <h3 className="mb-4 text-lg font-medium">Score by semester</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {semesters.map((semester) => (
            <Card key={semester.semesterName}>
              <CardHeader>
                <CardDescription>{semester.semesterName}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {showScore(semester.score)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {semester.groupCount} classes
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* --- Classes --- */}
      <section>
        <h3 className="mb-4 text-lg font-medium">
          Classes taught ({detail.classes.length})
        </h3>
        <ClassTable classes={detail.classes} />
      </section>

      {/* --- Improvement required --- */}
      <section>
        <h3 className="mb-1 text-lg font-medium">Improvement required</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Anything scoring below {target}%.
        </p>

        {weakClasses.length === 0 && weakQuestions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Nothing below {target}%
              </CardTitle>
              <CardDescription>
                Every class and every survey question is at or above the
                target.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {detail.overall.status === "Improvement Required" && (
              <Card className="border-red-300 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="text-base">
                    Overall score below target
                  </CardTitle>
                  <CardDescription>
                    {showScore(detail.overall.score)} —{" "}
                    {targetNote(detail.overall.score, target)}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {weakClasses.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Classes below {target}% ({weakClasses.length})
                </h4>
                <ClassTable classes={weakClasses} />
              </div>
            )}

            {weakQuestions.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Survey questions below {target}% ({weakQuestions.length})
                </h4>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">
                          Question
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          UKPSF
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Score
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Gap
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {weakQuestions.map(([number, result]) => (
                        <tr key={number} className="border-b last:border-0">
                          <td className="px-3 py-2">Question {number}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {result.ukpsfCategory} / {result.ukpsfCode}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {showScore(result.score)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {result.gap}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// A table of classes, used twice on the page
function ClassTable({ classes }: { classes: ClassResult[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Course</th>
            <th className="px-3 py-2 text-left font-medium">Semester</th>
            <th className="px-3 py-2 text-left font-medium">Section</th>
            <th className="px-3 py-2 text-right font-medium">Students</th>
            <th className="px-3 py-2 text-right font-medium">Score</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((item, index) => (
            <tr
              key={`${item.semesterCode}-${item.courseCode}-${item.section}-${index}`}
              className="border-b last:border-0"
            >
              <td className="px-3 py-2">
                {item.courseName}
                {!item.complete && (
                  <span className="ml-2 text-xs text-amber-700 dark:text-amber-500">
                    only {item.questionCount} answers
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {item.semesterName}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {item.section} · {item.degree}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {item.evaluatedStudents || "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {showScore(item.score)}
              </td>
              <td className="px-3 py-2">
                <StatusLabel status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
