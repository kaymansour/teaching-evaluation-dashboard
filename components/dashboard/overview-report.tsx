"use client";

// components/dashboard/overview-report.tsx
//
// The institutional overview. "use client" because the question
// tracking section responds to two dropdowns.

import { useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  OverviewData,
  QuestionTracking,
} from "@/types/metrics";

// The full wording of each survey question
const QUESTION_TEXT: Record<string, string> = {
  "1": "Provides students with a copy of the course syllabus in the first week",
  "2": "Is committed to the course syllabus and presents it in an organised manner",
  "3": "Is keen to start and end lectures on time",
  "4": "Is keen to follow up on students' attendance",
  "5": "Inculcates students with values of virtue, morality and national loyalty",
  "6": "Receives questions and suggestions, respects viewpoints, encourages criticism",
  "7": "Uses lecture time in productive, effective instruction",
  "8": "Emphasises fairness and avoids bias in dealing with students",
  "9": "Prepares tests that are comprehensive, well timed and fairly weighted",
  "10": "Corrects exams, reports and homework and hands them back",
  "11": "Reviews exams with students",
  "12": "Uses information technology and learning resources in teaching",
  "13": "Creates a comfortable classroom environment during lectures and exams",
  "14": "Is committed to office hours and gives students enough time",
  "15": "Is considerate of appearance, language and academic norms",
  "16": "Encourages and stimulates students to enhance learning and motivation",
  "17": "Enriches class discussions and increases student interest",
  "18": "Shows knowledge of course materials and subjects",
  "19": "Assigns homework, reading and research using library and e-resources",
  "20": "Treats students in a friendly, respectful manner and sets a good example",
};

const CATEGORY_NAMES: Record<string, string> = {
  AA: "Areas of Activity",
  CK: "Core Knowledge",
  PV: "Professional Values",
};

const CATEGORY_MEANING: Record<string, string> = {
  AA: "What the faculty member does in class",
  CK: "What the faculty member knows about the subject",
  PV: "How the faculty member treats students",
};

function showScore(score: number | null) {
  if (score === null) return "\u2014";
  return `${score}%`;
}

function StatusLabel({ status }: { status: string }) {
  const needsWork = status === "Improvement Required";
  return (
    <span
      className={
        "inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium " +
        (needsWork
          ? "bg-red-100 text-red-900"
          : "bg-emerald-100 text-emerald-900")
      }
    >
      {needsWork ? "Improvement required" : "Acceptable"}
    </span>
  );
}

function ScoreBar({ score, target }: { score: number | null; target: number }) {
  if (score === null) return null;
  const below = score < target;
  return (
    <div className="relative h-2.5 w-full rounded-full bg-muted">
      <div
        className={
          "h-full rounded-full transition-all " +
          (below ? "bg-red-600" : "bg-emerald-600")
        }
        style={{ width: `${Math.min(score, 100)}%` }}
      />
      <div
        className="absolute top-0 h-full w-0.5 bg-foreground/60"
        style={{ left: `${target}%` }}
      />
    </div>
  );
}

export function OverviewReport({
  data,
  tracking,
}: {
  data: OverviewData;
  tracking: QuestionTracking;
}) {
  const target = data.target;

  const semesters = Object.values(data.bySemester).sort(
    (a, b) => a.semesterOrder - b.semesterOrder
  );

  const years = Object.entries(data.byAcademicYear).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const questions = Object.entries(data.byQuestion).sort(
    (a, b) => (b[1].score ?? 0) - (a[1].score ?? 0)
  );
  const strongest = questions.slice(0, 5);
  const weakest = [...questions].reverse().slice(0, 5);

  const semesterChart = semesters
    .filter((s) => s.score !== null)
    .map((s) => ({ label: s.semesterName, score: s.score as number }));

  const yearChart = years
    .filter(([, y]) => y.score !== null)
    .map(([label, y]) => ({ label, score: y.score as number }));

  const categoryChart = ["AA", "CK", "PV"]
    .map((code) => {
      const result = data.byUkpsfCategory[code];
      if (!result || result.score === null) return null;
      return { label: CATEGORY_NAMES[code], score: result.score };
    })
    .filter((item): item is { label: string; score: number } => item !== null);

  const improvement = data.improvement;

  return (
    <div className="space-y-12">
      {/* ---------- Headline ---------- */}
      <section>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:row-span-2">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wide">
                Institutional average
              </CardDescription>
              <CardTitle className="text-5xl tabular-nums">
                {showScore(data.institution.score)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusLabel status={data.institution.status} />
              <div className="space-y-1.5">
                <ScoreBar score={data.institution.score} target={target} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>threshold {target}%</span>
                  <span>100%</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {data.institution.gap !== null && data.institution.gap >= 0
                  ? `${data.institution.gap} points above the ${target}% threshold`
                  : `${Math.abs(
                      data.institution.gap ?? 0
                    )} points below the ${target}% threshold`}
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wide">
                Faculty below {target}%
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums text-red-700">
                {improvement.faculty.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {data.improvementSummary
                  ? `of ${data.improvementSummary.facultyTotal} (${data.improvementSummary.facultyBelowPercent}%)`
                  : "faculty members"}
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wide">
                Courses below {target}%
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums text-red-700">
                {improvement.courses.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {data.improvementSummary
                  ? `of ${data.improvementSummary.courseTotal} (${data.improvementSummary.courseBelowPercent}%)`
                  : "courses"}
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wide">
                Classes below {target}%
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums text-red-700">
                {improvement.classes.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                individual class sections
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wide">
                Student answers
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {data.institution.questionCount.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                across {data.institution.groupCount} classes
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ---------- Requirement 7: semesters and academic years ---------- */}
      <section>
        <h2 className="mb-1 text-lg font-medium">Performance over time</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The institutional average by semester and by academic year. The
          dashed line marks the {target}% threshold.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <p className="mb-2 text-sm font-medium">By semester</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={semesterChart} margin={{ top: 8, right: 44 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} fontSize={12} />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      `${Number(value)}%`,
                      "Average",
                    ]}
                  />
                  <ReferenceLine
                    y={target}
                    stroke="#B42318"
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#E0241B"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#E0241B" }}
                    activeDot={{ r: 6 }}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-sm font-medium">By academic year</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearChart} margin={{ top: 20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} fontSize={12} />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      `${Number(value)}%`,
                      "Average",
                    ]}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />
                  <ReferenceLine
                    y={target}
                    stroke="#B42318"
                    strokeDasharray="4 4"
                  />
                  <Bar
                    dataKey="score"
                    radius={[4, 4, 0, 0]}
                    barSize={64}
                    fill="#047857"
                    animationDuration={800}
                  >
                    <LabelList
                      dataKey="score"
                      position="top"
                      formatter={(value: unknown) => `${Number(value)}%`}
                      fontSize={12}
                      fontWeight={600}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {semesters.map((semester, index) => {
            const previous = index > 0 ? semesters[index - 1].score : null;
            const change =
              previous !== null && semester.score !== null
                ? Math.round((semester.score - previous) * 10) / 10
                : null;
            return (
              <Card
                key={semester.semesterName}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">
                    {semester.semesterName} &middot; {semester.academicYear}
                  </CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {showScore(semester.score)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {semester.groupCount} classes
                    {change !== null && (
                      <>
                        {" "}
                        &middot;{" "}
                        {change >= 0
                          ? `up ${change}`
                          : `down ${Math.abs(change)}`}{" "}
                        points
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Spring 2022 is not shown. It was supplied as department summaries
          only, with no question-level data.
        </p>
      </section>

      {/* ---------- UKPSF ---------- */}
      <section>
        <h2 className="mb-1 text-lg font-medium">Teaching quality areas</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The three areas of the UK Professional Standards Framework.
        </p>

        <Card className="p-4 pt-6">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChart}
                layout="vertical"
                margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={150}
                  tickLine={false}
                  axisLine={false}
                  fontSize={13}
                />
                <Tooltip
                  formatter={(value: unknown) => [`${Number(value)}%`, "Score"]}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <ReferenceLine
                  x={target}
                  stroke="#B42318"
                  strokeDasharray="4 4"
                />
                <Bar
                  dataKey="score"
                  radius={[0, 4, 4, 0]}
                  barSize={28}
                  animationDuration={800}
                >
                  {categoryChart.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={entry.score < target ? "#B42318" : "#047857"}
                    />
                  ))}
                  <LabelList
                    dataKey="score"
                    position="right"
                    formatter={(value: unknown) => `${Number(value)}%`}
                    fontSize={13}
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {["AA", "CK", "PV"].map((code) => {
            const result = data.byUkpsfCategory[code];
            if (!result) return null;
            return (
              <Card key={code} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">
                    {CATEGORY_NAMES[code]}
                  </CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {showScore(result.score)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_MEANING[code]}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ---------- Requirement 8: best and worst questions ---------- */}
      <section>
        <h2 className="mb-1 text-lg font-medium">
          Strongest and weakest questions
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Where the college does best and least well across all evaluations.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <p className="mb-3 text-sm font-medium">Five strongest</p>
            <ul className="space-y-3">
              {strongest.map(([number, result]) => (
                <li key={number}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">
                      Q{number}. {QUESTION_TEXT[number]}
                    </span>
                    <span className="shrink-0 tabular-nums text-sm font-medium">
                      {showScore(result.score)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ScoreBar score={result.score} target={target} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-sm font-medium">Five weakest</p>
            <ul className="space-y-3">
              {weakest.map(([number, result]) => (
                <li key={number}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">
                      Q{number}. {QUESTION_TEXT[number]}
                    </span>
                    <span className="shrink-0 tabular-nums text-sm font-medium">
                      {showScore(result.score)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ScoreBar score={result.score} target={target} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* ---------- Requirement 5: question tracking ---------- */}
      <QuestionTrackingSection tracking={tracking} target={target} />

      {/* ---------- Requirement 4: improvement required ---------- */}
      <section>
        <h2 className="mb-1 text-lg font-medium">Improvement required</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Everything scoring below the {target}% threshold, gathered in one
          place.
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="mb-2 text-sm font-medium">
              Survey questions below {target}%
            </h3>
            {improvement.questions.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardDescription>
                    No survey question falls below {target}% across the college.
                    The weakest, Q{weakest[0]?.[0]}, scores{" "}
                    {showScore(weakest[0]?.[1].score ?? null)}. Individual
                    faculty members may still have weak questions, shown on
                    their own report.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Q</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Question
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {improvement.questions.map((item) => (
                      <tr
                        key={item.number}
                        className="border-b transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-3 py-2 tabular-nums">
                          {item.number}
                        </td>
                        <td className="px-3 py-2">
                          {QUESTION_TEXT[item.number]}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {showScore(item.score)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">
              Courses below {target}% ({improvement.courses.length})
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Course</th>
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Classes
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Score</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Difference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {improvement.courses.map((item) => (
                    <tr
                      key={item.code}
                      className="border-b transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.code}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {item.groupCount}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {showScore(item.score)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-700">
                        {item.gap}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">
              Faculty below {target}% ({improvement.faculty.length})
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      Faculty member
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Classes
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Score</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Difference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {improvement.faculty.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {item.classCount}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {showScore(item.score)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-700">
                        {item.gap}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Individual results are on the faculty report page.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- What is not available ---------- */}
      <section>
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base">
              Department and programme comparisons are not available
            </CardTitle>
            <CardDescription className="space-y-2">
              <span className="block">
                The evaluation files contain no department or programme field,
                and folder names cannot substitute: the same file was supplied
                inside two different department folders.
              </span>
              <span className="block">
                Two derivation routes were tested. Course codes named in the
                departmental summaries cover 32 of 184 courses. Faculty names
                in the Spring 2022 summaries cover 16 of 74 staff. Neither is
                sufficient, and applying a guessed mapping to the remainder
                would produce comparisons that look authoritative but are not.
              </span>
              <span className="block">
                A course-to-department mapping from the college would enable
                programme averages, department averages and interdepartmental
                comparison.
              </span>
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}

// ---------- Requirement 5: track one question for one degree level ----------
function QuestionTrackingSection({
  tracking,
  target,
}: {
  tracking: QuestionTracking;
  target: number;
}) {
  const degrees = Object.keys(tracking.byDegree).sort();

  const [degree, setDegree] = useState<string>(degrees[0] ?? "");
  const [question, setQuestion] = useState<string>("1");

  const tracked = tracking.byDegree[degree]?.[question];

  const chartData =
    tracked?.bySemester
      .filter((point) => point.score !== null)
      .map((point) => ({
        label: point.semesterName,
        score: point.score as number,
        answers: point.questionCount,
      })) ?? [];

  return (
    <section>
      <h2 className="mb-1 text-lg font-medium">Question tracking</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Follow one survey question for one degree programme across the
        semesters.
      </p>

      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label
            htmlFor="degree-select"
            className="mb-1.5 block text-sm font-medium"
          >
            Degree programme
          </label>
          <Select value={degree} onValueChange={setDegree}>
            <SelectTrigger id="degree-select" className="w-48">
              <SelectValue placeholder="Choose a degree" />
            </SelectTrigger>
            <SelectContent>
              {degrees.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 flex-1">
          <label
            htmlFor="question-select"
            className="mb-1.5 block text-sm font-medium"
          >
            Survey question
          </label>
          <Select value={question} onValueChange={setQuestion}>
            <SelectTrigger id="question-select" className="w-full sm:w-[28rem]">
              <SelectValue placeholder="Choose a question" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(QUESTION_TEXT).map((number) => (
                <SelectItem key={number} value={number}>
                  Q{number}. {QUESTION_TEXT[number]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!tracked || chartData.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No data</CardTitle>
            <CardDescription>
              There are no results for question {question} at {degree} level.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="p-4">
            <p className="mb-3 text-sm">
              <span className="font-medium">
                Q{question}. {QUESTION_TEXT[question]}
              </span>
              <span className="text-muted-foreground">
                {" "}
                &middot; {degree} &middot; {tracked.ukpsfCategory}/
                {tracked.ukpsfCode}
              </span>
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 44 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} fontSize={12} />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      `${Number(value)}%`,
                      "Score",
                    ]}
                  />
                  <ReferenceLine
                    y={target}
                    stroke="#B42318"
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#E0241B"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#E0241B" }}
                    activeDot={{ r: 6 }}
                    animationDuration={600}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="space-y-3">
            {tracked.bySemester.map((point) => (
              <Card
                key={point.semesterCode}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">
                    {point.semesterName}
                  </CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {showScore(point.score)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {point.questionCount} answers
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
