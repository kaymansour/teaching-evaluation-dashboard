"use client";

// components/dashboard/faculty-report.tsx
//
// The interactive part of the faculty page.
//
// "use client" means this runs in the browser, because it responds to
// the user choosing a name from the dropdown and pressing print.
//
// The visual pieces come from report-ui.tsx and the colours from the
// tokens in globals.css, so this report and the institutional overview
// read as one product.

import { useState } from "react";

import { Card } from "@/components/ui/card";
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

import { VIZ } from "@/lib/chart-theme";
import {
  CATEGORY_MEANING,
  CATEGORY_NAMES,
  QUESTION_TEXT,
} from "@/lib/survey";

import {
  Delta,
  Meter,
  Panel,
  SectionHeader,
  StatTile,
  StatusPill,
  SubHeading,
  TableShell,
  Thead,
  TD,
  TD_R,
  TH_L,
  TH_R,
  TR,
  showScore,
  statusKeys,
  thresholdKey,
} from "@/components/dashboard/report-ui";

import {
  RankedBars,
  TrendChart,
} from "@/components/dashboard/report-charts";

import { FacultyPrintReport } from "@/components/dashboard/faculty-print-report";

import type {
  FacultyDetail,
  FacultyListItem,
  ClassResult,
  QuestionResult,
} from "@/types/metrics";

// A short plain-English note about distance from the target
function targetNote(score: number | null, target: number) {
  if (score === null) return "No data";
  const difference = Math.round((score - target) * 10) / 10;
  if (difference < 0) {
    return `${Math.abs(difference)} points below the ${target}% threshold`;
  }
  return `${difference} points above the ${target}% threshold`;
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
    <th className={align === "right" ? TH_R : TH_L}>
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 rounded uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2"
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
  const arrow =
    sortBy === "asc" ? "\u25B2" : sortBy === "desc" ? "\u25BC" : "\u21C5";
  const label =
    sortBy === "number"
      ? "In survey order. Click to sort by lowest score."
      : sortBy === "asc"
        ? "Sorted lowest first. Click to sort highest first."
        : "Sorted highest first. Click to return to survey order.";

  return (
    <th className={TH_R}>
      <button
        type="button"
        onClick={onSort}
        className={
          "inline-flex items-center gap-1 rounded uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 " +
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

// How the classes split between meeting the threshold and falling short.
// Two segments on one baseline, held apart by a gap in the surface
// colour rather than by a border drawn around them.
function ProportionBar({ met, below }: { met: number; below: number }) {
  const total = met + below;
  if (total === 0) return null;
  return (
    <div className="flex h-3 w-full gap-0.5">
      {met > 0 && (
        <div
          className="h-full rounded-full"
          style={{ flexGrow: met, backgroundColor: VIZ.meets }}
        />
      )}
      {below > 0 && (
        <div
          className="h-full rounded-full"
          style={{ flexGrow: below, backgroundColor: VIZ.below }}
        />
      )}
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
      setError(
        "Could not load this faculty member's results. Please try again."
      );
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
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
        <Card className="gap-1 p-5 print:hidden">
          <p className="text-sm font-medium">No faculty member selected</p>
          <p className="text-sm text-muted-foreground">
            Choose a name above to see their results.
          </p>
        </Card>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">Loading results…</p>
      )}

      {error && (
        <Card className="gap-1 p-5">
          <p className="text-sm font-medium">Results unavailable</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      )}

      {detail && !loading && (
        <>
          {/* The dashboard, on screen only */}
          <div className="print:hidden">
            <Report detail={detail} />
          </div>

          {/* The formal four-part report, on paper only */}
          <FacultyPrintReport detail={detail} />
        </>
      )}
    </div>
  );
}

function Report({ detail }: { detail: FacultyDetail }) {
  const target = detail.benchmarks.target;
  const institution = detail.benchmarks.institution;

  // How far this faculty member sits from the institutional average
  const difference =
    detail.overall.score !== null && institution !== null
      ? Math.round((detail.overall.score - institution) * 10) / 10
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
        full: CATEGORY_NAMES[code],
        score: result.score,
      };
    })
    .filter(
      (item): item is { label: string; full: string; score: number } =>
        item !== null
    );

  // How the classes split against the threshold
  const acceptableClasses = detail.classes.filter(
    (c) => c.status !== "Improvement Required"
  ).length;
  const belowClasses = detail.classes.length - acceptableClasses;
  const share = (count: number) =>
    detail.classes.length > 0
      ? Math.round((count / detail.classes.length) * 100)
      : 0;

  // Data shaped for the semester line chart
  const semesterChart = semesters
    .filter((s) => s.score !== null)
    .map((s) => ({
      label: s.semesterName,
      score: s.score as number,
      answers: s.questionCount,
    }));

  return (
    <div className="space-y-14">
      {/* --- Headline --- */}
      <section>
        <div className="mb-5 flex flex-wrap items-baseline gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            {detail.name}
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* The overall score is the headline, so it gets the most room */}
          <Card className="justify-between gap-6 p-6 lg:col-span-1 lg:row-span-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Overall score
              </p>
              <p className="mt-3 text-6xl font-semibold leading-none tracking-tight">
                {showScore(detail.overall.score)}
              </p>
              <div className="mt-4">
                <StatusPill status={detail.overall.status} />
              </div>
            </div>

            <div className="space-y-2">
              <Meter
                score={detail.overall.score}
                target={target}
                benchmark={institution}
                className="h-2.5"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>threshold {target}%</span>
                <span>100%</span>
              </div>
              <p className="pt-2 text-sm text-muted-foreground">
                {targetNote(detail.overall.score, target)}
              </p>
            </div>
          </Card>

          {/* Supporting figures */}
          <Card className="gap-4 p-5 lg:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Compared with the institution
            </p>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <p className="text-3xl font-semibold leading-none tracking-tight">
                  {showScore(detail.overall.score)}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  This faculty member
                </p>
              </div>
              <div>
                <p className="text-3xl font-semibold leading-none tracking-tight text-muted-foreground">
                  {showScore(institution)}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Institutional average
                </p>
              </div>
              <div>
                <p className="text-3xl font-semibold leading-none tracking-tight">
                  <Delta value={difference} className="" />
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {difference === null
                    ? "No comparison"
                    : difference >= 0
                      ? "points above the average"
                      : "points below the average"}
                </p>
              </div>
            </div>
          </Card>

          <StatTile
            label="Classes taught"
            value={detail.classCount}
            note={`across ${detail.courseCount} courses`}
          />

          <StatTile
            label="Student answers"
            value={detail.overall.questionCount}
            note="used in these calculations"
          />
        </div>
      </section>

      {/* --- UKPSF categories --- */}
      <section className="break-inside-avoid">
        <SectionHeader
          title="Teaching quality areas"
          lede="The three areas of the UK Professional Standards Framework."
        />

        <Panel keyItems={[thresholdKey(target), ...statusKeys(target)]}>
          <RankedBars
            data={categoryChart}
            target={target}
            height="h-44"
            labelWidth={140}
            fontSize={13}
          />
        </Panel>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {["AA", "CK", "PV"].map((code) => {
            const result = detail.ukpsfCategories[code];
            if (!result) return null;
            return (
              <Card key={code} className="gap-3 p-5">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_NAMES[code]}
                  </p>
                  <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight">
                    {showScore(result.score)}
                  </p>
                </div>
                <Meter score={result.score} target={target} className="h-1.5" />
                <p className="text-sm text-muted-foreground">
                  {CATEGORY_MEANING[code]}
                </p>
                <StatusPill status={result.status} />
              </Card>
            );
          })}
        </div>
      </section>

      {/* --- Semester trend --- */}
      <section className="break-inside-avoid">
        <SectionHeader
          title="Performance over time"
          lede="Whether results are improving, holding steady, or declining."
        />

        {semesterChart.length > 1 && (
          <div className="mb-4">
            <Panel keyItems={[thresholdKey(target)]}>
              <TrendChart
                data={semesterChart}
                target={target}
                valueLabel="Score"
              />
            </Panel>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {semesters.map((semester, index) => {
            const previous = index > 0 ? semesters[index - 1].score : null;
            const change =
              previous !== null && semester.score !== null
                ? Math.round((semester.score - previous) * 10) / 10
                : null;
            return (
              <Card key={semester.semesterName} className="gap-3 p-5">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {semester.semesterName}
                  </p>
                  <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight">
                    {showScore(semester.score)}
                  </p>
                </div>
                <Meter
                  score={semester.score}
                  target={target}
                  className="h-1.5"
                />
                <p className="text-xs text-muted-foreground">
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
              </Card>
            );
          })}
        </div>
      </section>

      {/* --- Class outcomes --- */}
      <section className="break-inside-avoid">
        <SectionHeader
          title="Class results"
          lede={
            <>
              {acceptableClasses} of {detail.classes.length} classes met the{" "}
              {target}% threshold.
              {belowClasses > 0
                ? ` ${belowClasses} did not.`
                : " None fell below it."}
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <Panel
            title="How the classes split"
            keyItems={statusKeys(target)}
            className="justify-center"
          >
            <div className="space-y-4">
              <ProportionBar met={acceptableClasses} below={belowClasses} />
              <div className="flex flex-wrap justify-between gap-4 text-sm">
                <span>
                  <span className="font-semibold tabular-nums">
                    {acceptableClasses}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    met the threshold
                  </span>
                </span>
                <span>
                  <span className="font-semibold tabular-nums">
                    {belowClasses}
                  </span>{" "}
                  <span className="text-muted-foreground">below it</span>
                </span>
              </div>
            </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <StatTile
              label="Met the threshold"
              value={acceptableClasses}
              note={`${share(acceptableClasses)}% of classes taught`}
            />
            <StatTile
              label="Below the threshold"
              value={belowClasses}
              flagged={belowClasses > 0}
              note={`${share(belowClasses)}% of classes taught`}
            />
          </div>
        </div>
      </section>

      {/* --- All 20 questions --- */}
      <section className="break-inside-avoid">
        <SectionHeader
          title="All 20 questions"
          lede="How students rated this faculty member on each question, in survey order. Click Score to sort by result."
        />
        <QuestionTable questions={allQuestions} />
      </section>

      {/* --- Classes --- */}
      <section className="break-inside-avoid">
        <SectionHeader
          title={`Classes taught (${detail.classes.length})`}
          lede="Every class this faculty member delivered. Click Score to sort."
        />
        <ClassTable classes={detail.classes} />
      </section>

      {/* --- Improvement required --- */}
      <section className="break-inside-avoid">
        <SectionHeader
          title="Improvement required"
          lede={`Everything scoring below the ${target}% threshold, gathered in one place.`}
        />

        {weakClasses.length === 0 &&
        weakQuestions.length === 0 &&
        detail.overall.status !== "Improvement Required" ? (
          <Card className="gap-1 p-5">
            <p className="text-sm font-medium">Nothing below the threshold</p>
            <p className="text-sm text-muted-foreground">
              Every class and every question is at or above {target}%.
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {detail.overall.status === "Improvement Required" && (
              <Card
                className="gap-1 p-5"
                style={{
                  backgroundColor: "var(--status-critical-wash)",
                  boxShadow: "inset 0 0 0 1px var(--status-critical)",
                }}
              >
                <p className="text-sm font-medium">
                  Overall score is below the threshold
                </p>
                <p className="text-sm text-muted-foreground">
                  {showScore(detail.overall.score)} &mdash;{" "}
                  {targetNote(detail.overall.score, target)}
                </p>
              </Card>
            )}

            {weakClasses.length > 0 && (
              <div>
                <SubHeading>
                  Classes below {target}% ({weakClasses.length})
                </SubHeading>
                <ClassTable classes={weakClasses} />
              </div>
            )}

            {weakQuestions.length > 0 && (
              <div>
                <SubHeading>
                  Questions below {target}% ({weakQuestions.length})
                </SubHeading>
                <TableShell>
                  <Thead>
                    <tr>
                      <th className={TH_L}>Q</th>
                      <th className={TH_L}>Question</th>
                      <th className={TH_L}>UKPSF</th>
                      <th className={TH_R}>Score</th>
                      <th className={TH_R}>Gap</th>
                    </tr>
                  </Thead>
                  <tbody>
                    {weakQuestions.map(([number, result]) => (
                      <tr key={number} className={TR}>
                        <td className={TD + " tabular-nums text-muted-foreground"}>
                          {number}
                        </td>
                        <td className={TD}>{QUESTION_TEXT[number]}</td>
                        <td
                          className={
                            TD + " whitespace-nowrap text-muted-foreground"
                          }
                        >
                          {result.ukpsfCategory} / {result.ukpsfCode}
                        </td>
                        <td className={TD_R + " font-medium"}>
                          {showScore(result.score)}
                        </td>
                        <td className={TD_R}>
                          <Delta value={result.gap} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// A table of classes, sortable by score
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
    <TableShell>
      <Thead>
        <tr>
          <th className={TH_L}>Course</th>
          <th className={TH_L}>Semester</th>
          <th className={TH_L}>Section</th>
          <th className={TH_R}>Students</th>
          <SortHeader
            label="Score"
            direction={direction}
            onSort={toggle}
            align="right"
          />
          <th className={TH_L}>Status</th>
        </tr>
      </Thead>
      <tbody>
        {sorted.map((item, index) => (
          <tr
            key={`${item.semesterCode}-${item.courseCode}-${item.section}-${index}`}
            className={TR}
          >
            <td className={TD}>
              <span className="font-medium">{item.courseName}</span>
              {!item.complete && (
                <span
                  className="ml-2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: "var(--status-caution-wash)",
                    color: "var(--status-caution-inline)",
                  }}
                >
                  only {item.questionCount} answers
                </span>
              )}
            </td>
            <td className={TD + " whitespace-nowrap text-muted-foreground"}>
              {item.semesterName}
            </td>
            <td className={TD + " whitespace-nowrap text-muted-foreground"}>
              {item.section} &middot; {item.degree}
            </td>
            <td className={TD_R + " text-muted-foreground"}>
              {item.evaluatedStudents || "\u2014"}
            </td>
            <td className={TD_R + " font-medium"}>{showScore(item.score)}</td>
            <td className={TD}>
              <StatusPill status={item.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

// A table of survey questions, sortable by score
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
    <TableShell>
      <Thead>
        <tr>
          <th className={TH_L}>Q</th>
          <th className={TH_L}>Question</th>
          <th className={TH_L}>UKPSF</th>
          <QuestionSortHeader sortBy={sortBy} onSort={toggle} />
          <th className={TH_R}>Difference</th>
          <th className={TH_L}>Status</th>
        </tr>
      </Thead>
      <tbody>
        {sorted.map(([number, result]) => (
          <tr key={number} className={TR}>
            <td className={TD + " tabular-nums text-muted-foreground"}>
              {number}
            </td>
            <td className={TD}>{QUESTION_TEXT[number]}</td>
            <td className={TD + " whitespace-nowrap text-muted-foreground"}>
              {result.ukpsfCategory} / {result.ukpsfCode}
            </td>
            <td className={TD_R + " font-medium"}>{showScore(result.score)}</td>
            <td className={TD_R}>
              <Delta value={result.gap} />
            </td>
            <td className={TD}>
              <StatusPill status={result.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}
