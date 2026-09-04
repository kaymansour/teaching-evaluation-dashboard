"use client";

// components/dashboard/faculty-report.tsx
//
// The interactive part of the faculty page.
//
// "use client" means this runs in the browser, because it responds to
// the user choosing a name from the dropdown and pressing print.

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Bar,
  BarChart,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  FacultyDetail,
  FacultyListItem,
  ClassResult,
  QuestionResult,
} from "@/types/metrics";

// The full wording of each survey question, so the report explains
// itself without the reader needing the original survey.
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

// What each UKPSF code means
const CODE_TEXT: Record<string, string> = {
  A1: "Design and plan learning activities",
  A2: "Teach and support learning",
  A3: "Assess and give feedback",
  A4: "Develop effective learning environments",
  K1: "The subject material",
  K2: "Appropriate methods for teaching the subject",
  K3: "How students learn",
  K4: "Use of appropriate learning technologies",
  V1: "Respect individual learners and diverse communities",
  V2: "Promote participation and equality of opportunity",
  V3: "Use evidence-informed approaches",
  V4: "Acknowledge the wider context of higher education",
};

// What each category means, in plain words
const CATEGORY_MEANING: Record<string, string> = {
  AA: "What the faculty member does in class",
  CK: "What the faculty member knows about the subject",
  PV: "How the faculty member treats students",
};

const CATEGORY_NAMES: Record<string, string> = {
  AA: "Areas of Activity",
  CK: "Core Knowledge",
  PV: "Professional Values",
};

// Show a score, or a dash if there is none
function showScore(score: number | null) {
  if (score === null) return "\u2014";
  return `${score}%`;
}

// A short plain-English note about distance from the target
function targetNote(score: number | null, target: number) {
  if (score === null) return "No data";
  const difference = Math.round((score - target) * 10) / 10;
  if (difference < 0) {
    return `${Math.abs(difference)} points below the ${target}% threshold`;
  }
  return `${difference} points above the ${target}% threshold`;
}

// A label saying whether a result is acceptable.
// The word is always shown, never colour alone.
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

// A clickable Score column heading. Clicking it switches between
// highest-first and lowest-first. The arrow shows which way it is sorted.
function SortHeader({
  label,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  direction: "asc" | "desc";
  onSort: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      className={
        "px-3 py-2 font-medium " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2"
        aria-label={
          direction === "desc"
            ? "Sorted highest first. Click to sort lowest first."
            : "Sorted lowest first. Click to sort highest first."
        }
      >
        {label}
        <span className="text-[10px] leading-none">
          {direction === "desc" ? "\u25BC" : "\u25B2"}
        </span>
      </button>
    </th>
  );
}

// The Score heading for the questions table. It cycles through three
// states: survey order, lowest first, highest first.
function QuestionSortHeader({
  sortBy,
  onSort,
}: {
  sortBy: "number" | "asc" | "desc";
  onSort: () => void;
}) {
  const arrow = sortBy === "asc" ? "\u25B2" : sortBy === "desc" ? "\u25BC" : "\u21C5";
  const label =
    sortBy === "number"
      ? "In survey order. Click to sort by lowest score."
      : sortBy === "asc"
        ? "Sorted lowest first. Click to sort highest first."
        : "Sorted highest first. Click to return to survey order.";

  return (
    <th className="px-3 py-2 text-right font-medium">
      <button
        type="button"
        onClick={onSort}
        className={
          "inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 " +
          (sortBy === "number" ? "text-muted-foreground" : "text-foreground")
        }
        aria-label={label}
        title={label}
      >
        Score
        <span className="text-[10px] leading-none">{arrow}</span>
      </button>
    </th>
  );
}

// A horizontal bar showing a score out of 100
function ScoreBar({ score, target }: { score: number | null; target: number }) {
  if (score === null) return null;
  const below = score < target;
  return (
    <div className="relative h-2.5 w-full rounded-full bg-muted">
      {/* The filled portion, coloured by whether it meets the target */}
      <div
        className={
          "h-full rounded-full transition-all " +
          (below ? "bg-red-600" : "bg-emerald-600")
        }
        style={{ width: `${Math.min(score, 100)}%` }}
      />
      {/* A marker showing where the target sits */}
      <div
        className="absolute top-0 h-full w-0.5 bg-foreground/60"
        style={{ left: `${target}%` }}
      />
    </div>
  );
}

export function FacultyReport({ faculty }: { faculty: FacultyListItem[] }) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [open, setOpen] = useState(false);

  // The name to show on the button once a faculty member is chosen
  const selectedName =
    faculty.find((person) => person.id === selectedId)?.name ?? "";
  const [detail, setDetail] = useState<FacultyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Fetch one faculty member's file when the dropdown changes
  async function handleChange(id: string) {
    setSelectedId(id);
    setDetail(null);
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/data/faculty/${id}.json`);
      if (!response.ok) {
        throw new Error("not found");
      }
      setDetail((await response.json()) as FacultyDetail);
    } catch {
      setError("Could not load this faculty member's results. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* The filter is hidden when printing */}
      <div className="mb-8 print:hidden">
        <label
          htmlFor="faculty-select"
          className="mb-2 block text-sm font-medium"
        >
          Faculty member
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id="faculty-select"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal sm:w-96"
              >
                {selectedName || "Search or choose a faculty member"}
                <span className="ml-2 text-xs opacity-60">&#9662;</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command>
                <CommandInput placeholder="Type a name to search..." />
                <CommandList>
                  <CommandEmpty>No faculty member found.</CommandEmpty>
                  <CommandGroup>
                    {faculty.map((person) => (
                      <CommandItem
                        key={person.id}
                        value={person.name}
                        onSelect={() => {
                          setOpen(false);
                          handleChange(person.id);
                        }}
                      >
                        {person.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {detail && (
            <Button variant="outline" onClick={() => window.print()}>
              Download PDF
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {faculty.length} faculty members have evaluation results.
        </p>
      </div>

      {!selectedId && !loading && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base">No faculty member selected</CardTitle>
            <CardDescription>
              Choose a name above to see their results.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">Loading results…</p>
      )}

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {detail && !loading && <Report detail={detail} />}
    </div>
  );
}

function Report({ detail }: { detail: FacultyDetail }) {
  const target = detail.benchmarks.target;

  // How far this faculty member sits from the institutional average
  const difference =
    detail.overall.score !== null && detail.benchmarks.institution !== null
      ? Math.round(
          (detail.overall.score - detail.benchmarks.institution) * 10
        ) / 10
      : null;

  const semesters = Object.values(detail.bySemester).sort(
    (a, b) => a.semesterOrder - b.semesterOrder
  );

  // All 20 questions, in survey order
  const allQuestions = Object.entries(detail.byQuestion).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );

  const weakQuestions = allQuestions.filter(
    ([, q]) => q.status === "Improvement Required"
  );

  const weakClasses = detail.classes
    .filter((c) => c.status === "Improvement Required")
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

  // Data shaped for the category bar chart
  const categoryChart = ["AA", "CK", "PV"]
    .map((code) => {
      const result = detail.ukpsfCategories[code];
      if (!result || result.score === null) return null;
      return {
        label: CATEGORY_NAMES[code],
        score: result.score,
        target: target,
      };
    })
    .filter(
      (item): item is { label: string; score: number; target: number } =>
        item !== null
    );

  // Data shaped for the class pass/fail donut
  const acceptableClasses = detail.classes.filter(
    (c) => c.status !== "Improvement Required"
  ).length;
  const belowClasses = detail.classes.length - acceptableClasses;
  const classSplit = [
    { label: "Acceptable", value: acceptableClasses, fill: "#047857" },
    { label: "Improvement required", value: belowClasses, fill: "#B42318" },
  ].filter((slice) => slice.value > 0);

  // Data shaped for the semester line chart
  const semesterChart = semesters
    .filter((s) => s.score !== null)
    .map((s) => ({ label: s.semesterName, score: s.score as number }));

  // Detailed standards in a sensible order
  const codeOrder = [
    "A1", "A2", "A3", "A4",
    "K1", "K2", "K3", "K4",
    "V1", "V2", "V3", "V4",
  ];

  return (
    <div className="space-y-10">
      {/* Printed reports need their own title block */}
      <div className="hidden print:block">
        <p className="text-xs text-muted-foreground">
          University College of Bahrain &middot; Teaching Evaluation Report
        </p>
      </div>

      {/* --- Headline --- */}
      <section>
        <div className="mb-5 flex flex-wrap items-baseline gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            {detail.name}
          </h2>
          <span className="hidden text-sm text-muted-foreground print:inline">
            Faculty ID {detail.id}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* The overall score is the headline, so it gets the most room */}
          <Card className="lg:col-span-1 lg:row-span-2">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wide">
                Overall score
              </CardDescription>
              <div className="flex items-baseline gap-3">
                <CardTitle className="text-5xl tabular-nums">
                  {showScore(detail.overall.score)}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusLabel status={detail.overall.status} />

              <div className="space-y-1.5">
                <ScoreBar score={detail.overall.score} target={target} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>threshold {target}%</span>
                  <span>100%</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {targetNote(detail.overall.score, target)}
              </p>
            </CardContent>
          </Card>

          {/* Supporting figures */}
          <Card className="transition-shadow hover:shadow-md lg:col-span-2">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wide">
                Compared with the institution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
                <div>
                  <p className="text-3xl tabular-nums">
                    {showScore(detail.overall.score)}
                  </p>
                  <p className="text-sm text-muted-foreground">This faculty member</p>
                </div>
                <div>
                  <p className="text-3xl tabular-nums text-muted-foreground">
                    {showScore(detail.benchmarks.institution)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    University average
                  </p>
                </div>
                <div>
                  <p
                    className={
                      "text-3xl tabular-nums " +
                      (difference !== null && difference < 0
                        ? "text-red-700"
                        : "text-emerald-700")
                    }
                  >
                    {difference === null
                      ? "\u2014"
                      : difference >= 0
                        ? `+${difference}`
                        : difference}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {difference === null
                      ? "No comparison"
                      : difference >= 0
                        ? "points above the average"
                        : "points below the average"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wide">
                Classes taught
              </CardDescription>
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

          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wide">
                Student answers
              </CardDescription>
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

      {/* --- UKPSF categories --- */}
      <section className="break-inside-avoid">
        <h3 className="mb-1 text-lg font-medium">Teaching quality areas</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          The three areas of the UK Professional Standards Framework. The dashed
          line marks the {target}% threshold.
        </p>

        <Card className="p-4 pt-6">
          <div className="h-64 w-full">
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
                  width={140}
                  tickLine={false}
                  axisLine={false}
                  fontSize={13}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Score"]}
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
                    formatter={(value: number) => `${value}%`}
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
            const result = detail.ukpsfCategories[code];
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
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_MEANING[code]}
                  </p>
                  <StatusLabel status={result.status} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* --- Detailed standards: printed report only, to keep the page calm --- */}
      <section className="hidden break-inside-avoid print:block">
        <h3 className="mb-1 text-lg font-medium">Detailed standards</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          The twelve detailed standards. Standards based on fewer questions are
          less reliable, so the number of answers is shown.
        </p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Code</th>
                <th className="px-3 py-2 text-left font-medium">Standard</th>
                <th className="px-3 py-2 text-right font-medium">Answers</th>
                <th className="px-3 py-2 text-right font-medium">Score</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {codeOrder.map((code) => {
                const result = detail.ukpsfCodes[code];
                if (!result) return null;
                return (
                  <tr key={code} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium">{code}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {CODE_TEXT[code]}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {result.questionCount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {showScore(result.score)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusLabel status={result.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Semester trend --- */}
      <section className="break-inside-avoid">
        <h3 className="mb-1 text-lg font-medium">Performance over time</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Whether results are improving, holding steady, or declining.
        </p>

        {semesterChart.length > 1 && (
          <Card className="mb-4 p-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={semesterChart} margin={{ top: 8, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} fontSize={12} />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    unit="%"
                  />
                  <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} />
                  <ReferenceLine
                    y={target}
                    stroke="#B42318"
                    strokeDasharray="4 4"
                    label={{
                      value: `${target}% target`,
                      position: "right",
                      fontSize: 11,
                      fill: "#B42318",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#E0241B"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#E0241B" }}
                    activeDot={{ r: 6 }}
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {semesters.map((semester, index) => {
            const previous = index > 0 ? semesters[index - 1].score : null;
            const change =
              previous !== null && semester.score !== null
                ? Math.round((semester.score - previous) * 10) / 10
                : null;
            return (
              <Card key={semester.semesterName} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardDescription>{semester.semesterName}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {showScore(semester.score)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ScoreBar score={semester.score} target={target} />
                  <p className="text-sm text-muted-foreground">
                    {semester.groupCount} classes
                    {change !== null && (
                      <>
                        {" "}
                        &middot;{" "}
                        {change >= 0 ? `up ${change}` : `down ${Math.abs(change)}`}{" "}
                        points
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* --- Class outcomes --- */}
      <section className="break-inside-avoid">
        <h3 className="mb-1 text-lg font-medium">Class results</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {acceptableClasses} of {detail.classes.length} classes met the{" "}
          {target}% threshold.
          {belowClasses > 0
            ? ` ${belowClasses} did not.`
            : " None fell below it."}
        </p>

        <div className="grid gap-6 sm:grid-cols-[1fr_1fr]">
          <Card className="p-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={classSplit}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    animationDuration={800}
                  >
                    {classSplit.map((slice) => (
                      <Cell key={slice.label} fill={slice.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} classes`,
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="flex flex-col justify-center gap-4">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">
                  Met the threshold
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums text-emerald-700">
                  {acceptableClasses}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {detail.classes.length > 0
                    ? Math.round(
                        (acceptableClasses / detail.classes.length) * 100
                      )
                    : 0}
                  % of classes taught
                </p>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">
                  Below the threshold
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums text-red-700">
                  {belowClasses}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {detail.classes.length > 0
                    ? Math.round((belowClasses / detail.classes.length) * 100)
                    : 0}
                  % of classes taught
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* --- All 20 questions --- */}
      <section className="break-inside-avoid">
        <h3 className="mb-1 text-lg font-medium">All 20 questions</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          How students rated this faculty member on each question, in survey order.
          Click Score to sort by result.
        </p>
        <QuestionTable questions={allQuestions} />
      </section>

      {/* --- Classes --- */}
      <section className="break-inside-avoid">
        <h3 className="mb-1 text-lg font-medium">
          Classes taught ({detail.classes.length})
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Every class this faculty member delivered. Click Score to sort.
        </p>
        <ClassTable classes={detail.classes} />
      </section>

      {/* --- Improvement required --- */}
      <section className="break-inside-avoid">
        <h3 className="mb-1 text-lg font-medium">Improvement required</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Everything scoring below the {target}% threshold, gathered in one place.
        </p>

        {weakClasses.length === 0 &&
        weakQuestions.length === 0 &&
        detail.overall.status !== "Improvement Required" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Nothing below the threshold
              </CardTitle>
              <CardDescription>
                Every class and every question is at or above {target}%.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {detail.overall.status === "Improvement Required" && (
              <Card className="border-red-300">
                <CardHeader>
                  <CardTitle className="text-base">
                    Overall score is below the threshold
                  </CardTitle>
                  <CardDescription>
                    {showScore(detail.overall.score)} &mdash;{" "}
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
                  Questions below {target}% ({weakQuestions.length})
                </h4>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Q</th>
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
                        <tr key={number} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                          <td className="px-3 py-2 tabular-nums">{number}</td>
                          <td className="px-3 py-2">{QUESTION_TEXT[number]}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
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

// A table of classes, sortable by any column
function ClassTable({ classes }: { classes: ClassResult[] }) {
  // Start with the weakest classes at the top, since those need attention
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  function toggle() {
    setDirection(direction === "asc" ? "desc" : "asc");
  }

  const sorted = [...classes].sort((a, b) => {
    const result = (a.score ?? 0) - (b.score ?? 0);
    return direction === "asc" ? result : -result;
  });

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Course</th>
            <th className="px-3 py-2 text-left font-medium">Semester</th>
            <th className="px-3 py-2 text-left font-medium">Section</th>
            <th className="px-3 py-2 text-right font-medium">Students</th>
            <SortHeader label="Score" direction={direction} onSort={toggle} align="right" />
            <th className="px-3 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, index) => (
            <tr
              key={`${item.semesterCode}-${item.courseCode}-${item.section}-${index}`}
              className="border-b transition-colors last:border-0 hover:bg-muted/40"
            >
              <td className="px-3 py-2">
                {item.courseName}
                {!item.complete && (
                  <span className="ml-2 whitespace-nowrap text-xs text-amber-700">
                    only {item.questionCount} answers
                  </span>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {item.semesterName}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {item.section} &middot; {item.degree}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {item.evaluatedStudents || "\u2014"}
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

// A table of survey questions, sortable by any column
function QuestionTable({
  questions,
}: {
  questions: [string, QuestionResult][];
}) {
  // Questions start in survey order, 1 to 20.
  // Clicking Score switches to lowest-first, then highest-first,
  // then back to survey order.
  const [sortBy, setSortBy] = useState<"number" | "asc" | "desc">("number");

  function toggle() {
    if (sortBy === "number") {
      setSortBy("asc");
    } else if (sortBy === "asc") {
      setSortBy("desc");
    } else {
      setSortBy("number");
    }
  }

  const sorted = [...questions].sort((a, b) => {
    if (sortBy === "number") {
      return Number(a[0]) - Number(b[0]);
    }
    const result = (a[1].score ?? 0) - (b[1].score ?? 0);
    return sortBy === "asc" ? result : -result;
  });

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Q</th>
            <th className="px-3 py-2 text-left font-medium">Question</th>
            <th className="px-3 py-2 text-left font-medium">UKPSF</th>
            <QuestionSortHeader sortBy={sortBy} onSort={toggle} />
            <th className="px-3 py-2 text-right font-medium">Difference</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([number, result]) => (
            <tr
              key={number}
              className="border-b transition-colors last:border-0 hover:bg-muted/40"
            >
              <td className="px-3 py-2 tabular-nums">{number}</td>
              <td className="px-3 py-2">{QUESTION_TEXT[number]}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {result.ukpsfCategory} / {result.ukpsfCode}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {showScore(result.score)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {result.gap !== null && result.gap > 0
                  ? `+${result.gap}`
                  : result.gap}
              </td>
              <td className="px-3 py-2">
                <StatusLabel status={result.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
