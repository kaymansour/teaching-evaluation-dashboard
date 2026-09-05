"use client";

// components/dashboard/overview-report.tsx
//
// The institutional overview. "use client" because the question
// tracking, department and programme sections respond to dropdowns.
//
// Colours come from the tokens in app/globals.css by way of
// lib/chart-theme.ts. Nothing here carries a raw hex value, so the
// whole dashboard moves together when a token changes.

import { useState, type ReactNode } from "react";

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

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AXIS_TICK,
  BAR_SIZE,
  DOT_RADIUS,
  GRID,
  LINE_WIDTH,
  VIZ,
  scoreColor,
  scoreTrack,
} from "@/lib/chart-theme";

import type {
  DepartmentResult,
  OverviewData,
  ProgrammeResult,
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

// ---------- Shared pieces ----------

function showScore(score: number | null) {
  if (score === null) return "\u2014";
  return `${score}%`;
}

// A signed difference. The sign carries the meaning, so the colour is
// reinforcement rather than the only channel.
function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground">{"\u2014"}</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className="tabular-nums"
      style={{
        color: positive
          ? "var(--status-good-inline)"
          : "var(--status-critical-inline)",
      }}
    >
      {positive ? "+" : "\u2212"}
      {Math.abs(value)}
    </span>
  );
}

// A status always ships with its written label; the dot is only a cue.
function StatusPill({ status }: { status: string }) {
  const needsWork = status === "Improvement Required";
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: needsWork
          ? "var(--status-critical-wash)"
          : "var(--status-good-wash)",
        color: needsWork
          ? "var(--status-critical-inline)"
          : "var(--status-good-inline)",
      }}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{
          backgroundColor: needsWork
            ? "var(--status-critical)"
            : "var(--status-good)",
        }}
      />
      {needsWork ? "Improvement required" : "Acceptable"}
    </span>
  );
}

// A score against the threshold. The track is a lighter step of the
// fill's own colour, so the state reads across the whole bar.
function Meter({
  score,
  target,
  className = "h-2",
}: {
  score: number | null;
  target: number;
  className?: string;
}) {
  if (score === null) return null;
  return (
    <div
      className={"relative w-full overflow-hidden rounded-full " + className}
      style={{ backgroundColor: scoreTrack(score, target) }}
      role="img"
      aria-label={`${score}% against a ${target}% threshold`}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(score, 100)}%`,
          backgroundColor: scoreColor(score, target),
        }}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 w-px bg-foreground/45"
        style={{ left: `${target}%` }}
      />
    </div>
  );
}

function SectionHeader({ title, lede }: { title: string; lede: ReactNode }) {
  return (
    <div className="mb-6 border-b pb-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{lede}</p>
    </div>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold tracking-tight">{children}</h3>
  );
}

// A card built to hold a chart: a title, the plot, then an optional
// key and caption underneath.
function Panel({
  title,
  children,
  keyItems,
  caption,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  keyItems?: KeyItem[];
  caption?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={"gap-0 p-5 " + className}>
      {title ? (
        <p className="mb-4 text-sm font-medium leading-snug">{title}</p>
      ) : null}
      {children}
      {keyItems ? <ChartKey items={keyItems} /> : null}
      {caption ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {caption}
        </p>
      ) : null}
    </Card>
  );
}

type KeyItem = { label: string; color: string; dashed?: boolean };

// The identity channel. Every chart that encodes something in colour
// says so here in words, so colour never carries meaning alone.
function ChartKey({ items }: { items: KeyItem[] }) {
  return (
    <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          {item.dashed ? (
            <span
              aria-hidden
              className="h-0 w-4 shrink-0 border-t-2 border-dashed"
              style={{ borderColor: item.color }}
            />
          ) : (
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// The threshold key, used by every chart that draws the line
function thresholdKey(target: number): KeyItem {
  return { label: `${target}% threshold`, color: VIZ.threshold, dashed: true };
}

// The pass/fail key, used by every chart whose marks are coloured by
// where they sit against the threshold
function statusKeys(target: number): KeyItem[] {
  return [
    { label: `Meets the ${target}% threshold`, color: VIZ.meets },
    { label: "Improvement required", color: VIZ.below },
  ];
}

// One tooltip for the whole dashboard, styled like the cards.
type TooltipRow = { full?: string; answers?: number };

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel = "Average",
}: {
  active?: boolean;
  payload?: { value?: number | string; payload?: TooltipRow }[];
  label?: string | number;
  valueLabel?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload ?? {};
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg bg-card px-3 py-2 shadow-lg ring-1 ring-foreground/10">
      <p className="text-xs font-medium">{row.full ?? label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">{valueLabel}</span>
        <span className="text-sm font-semibold tabular-nums">{value}%</span>
      </p>
      {row.answers !== undefined ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.answers.toLocaleString()} answers
        </p>
      ) : null}
    </div>
  );
}

// Only the final point on a line is labelled; the axis and the tooltip
// carry the rest. A number beside every dot goes unread.
//
// This has to be a valueAccessor rather than a formatter: Recharts
// calls a label formatter with the value alone, so there is no index
// to test. valueAccessor receives one, but only when the LabelList
// carries no dataKey of its own.
function endpointOnly(length: number) {
  return (entry: { payload?: { score?: number } }, index: number) =>
    index === length - 1 ? `${entry.payload?.score}%` : "";
}

// Table styling, kept in one place so every table matches.
// The alignment utilities are held apart rather than concatenated onto
// one base string, since two conflicting Tailwind classes on the same
// element resolve by stylesheet order, not by the order written.
const TH = "px-4 py-2.5 text-xs font-medium uppercase tracking-wide";
const TH_L = TH + " text-left";
const TH_R = TH + " text-right";
const TD = "px-4 py-2.5 align-middle";
const TD_R = TD + " text-right tabular-nums";
const TR = "border-b transition-colors last:border-0 hover:bg-muted/40";

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b bg-muted/40 text-muted-foreground">
      {children}
    </thead>
  );
}

// A supporting figure beside the headline. Big numbers take the font's
// proportional figures; tabular digits are for columns that align.
function StatTile({
  label,
  value,
  note,
  flagged = false,
}: {
  label: string;
  value: number;
  note: string;
  flagged?: boolean;
}) {
  return (
    <Card className="gap-2 p-5">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {flagged ? (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--status-critical)" }}
          />
        ) : null}
        {label}
      </p>
      <p className="text-4xl font-semibold leading-none tracking-tight">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-muted-foreground">{note}</p>
    </Card>
  );
}

// The strongest / weakest question lists
function QuestionList({
  items,
  target,
}: {
  items: [string, { score: number | null }][];
  target: number;
}) {
  return (
    <ol className="space-y-4">
      {items.map(([number, result]) => (
        <li key={number}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm leading-snug">
              <span className="font-medium tabular-nums text-muted-foreground">
                Q{number}
              </span>{" "}
              {QUESTION_TEXT[number]}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {showScore(result.score)}
            </span>
          </div>
          <div className="mt-2">
            <Meter score={result.score} target={target} className="h-1.5" />
          </div>
        </li>
      ))}
    </ol>
  );
}

// Score over time. The same plot serves the institution, a department
// and a tracked question, so they stay identical to read.
type TrendPoint = { label: string; score: number; answers: number };

function TrendChart({
  data,
  target,
  valueLabel = "Average",
}: {
  data: TrendPoint[];
  target: number;
  valueLabel?: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 44, left: 0, bottom: 4 }}>
          <CartesianGrid {...GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: VIZ.grid }}
            tick={AXIS_TICK}
            tickMargin={8}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            unit="%"
            width={44}
          />
          <Tooltip
            content={<ChartTooltip valueLabel={valueLabel} />}
            cursor={{ stroke: VIZ.grid, strokeWidth: 1 }}
          />
          <ReferenceLine y={target} stroke={VIZ.threshold} strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="score"
            stroke={VIZ.meets}
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{
              r: DOT_RADIUS,
              fill: VIZ.meets,
              stroke: VIZ.surface,
              strokeWidth: 2,
            }}
            activeDot={{
              r: DOT_RADIUS + 2,
              fill: VIZ.meets,
              stroke: VIZ.surface,
              strokeWidth: 2,
            }}
            animationDuration={700}
          >
            <LabelList
              position="top"
              offset={12}
              fill={VIZ.ink}
              fontSize={12}
              fontWeight={600}
              valueAccessor={endpointOnly(data.length)}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// A ranked horizontal comparison. The value rides each bar, so the
// x-axis is dropped: direct labels come before gridlines.
type RankedRow = { label: string; full: string; score: number };

function RankedBars({
  data,
  target,
  height,
  barSize = BAR_SIZE,
  labelWidth,
  fontSize = 12,
  benchmark = null,
}: {
  data: RankedRow[];
  target: number;
  height: string;
  barSize?: number;
  labelWidth: number;
  fontSize?: number;
  benchmark?: number | null;
}) {
  return (
    <div className={"w-full " + height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 56, left: 0, bottom: 4 }}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={labelWidth}
            tickLine={false}
            axisLine={false}
            tick={{ ...AXIS_TICK, fontSize }}
          />
          <Tooltip
            content={<ChartTooltip valueLabel="Average" />}
            cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.5 }}
          />
          <ReferenceLine x={target} stroke={VIZ.threshold} strokeDasharray="4 4" />
          {benchmark !== null && (
            <ReferenceLine
              x={benchmark}
              stroke={VIZ.benchmark}
              strokeDasharray="2 3"
            />
          )}
          <Bar
            dataKey="score"
            radius={[0, 4, 4, 0]}
            maxBarSize={barSize}
            animationDuration={700}
          >
            {data.map((entry) => (
              <Cell key={entry.full} fill={scoreColor(entry.score, target)} />
            ))}
            <LabelList
              dataKey="score"
              position="right"
              offset={10}
              fill={VIZ.ink}
              fontSize={fontSize}
              fontWeight={600}
              formatter={(value: unknown) => `${Number(value)}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- The report ----------

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

  // How far apart the best and worst questions actually are
  const questionSpread =
    Math.round(
      ((questions[0]?.[1].score ?? 0) -
        (questions[questions.length - 1]?.[1].score ?? 0)) *
        10
    ) / 10;

  const semesterChart = semesters
    .filter((s) => s.score !== null)
    .map((s) => ({
      label: s.semesterName,
      score: s.score as number,
      answers: s.questionCount,
    }));

  const yearChart = years
    .filter(([, y]) => y.score !== null)
    .map(([label, y]) => ({
      label,
      score: y.score as number,
      answers: y.questionCount,
    }));

  const categoryChart = ["AA", "CK", "PV"]
    .map((code) => {
      const result = data.byUkpsfCategory[code];
      if (!result || result.score === null) return null;
      return {
        label: CATEGORY_NAMES[code],
        full: CATEGORY_NAMES[code],
        score: result.score,
      };
    })
    .filter((item): item is RankedRow => item !== null);

  const improvement = data.improvement;

  return (
    <div className="space-y-14">
      {/* ---------- Headline ---------- */}
      <section>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* The one number the page leads with */}
          <Card className="justify-between gap-6 p-6 lg:row-span-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Institutional average
              </p>
              <p className="mt-3 text-6xl font-semibold leading-none tracking-tight">
                {showScore(data.institution.score)}
              </p>
              <div className="mt-4">
                <StatusPill status={data.institution.status} />
              </div>
            </div>

            <div className="space-y-2">
              <Meter
                score={data.institution.score}
                target={target}
                className="h-2.5"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>threshold {target}%</span>
                <span>100%</span>
              </div>
              <p className="pt-2 text-sm text-muted-foreground">
                {data.institution.gap !== null && data.institution.gap >= 0
                  ? `${data.institution.gap} points above the ${target}% threshold`
                  : `${Math.abs(
                      data.institution.gap ?? 0
                    )} points below the ${target}% threshold`}
              </p>
            </div>
          </Card>

          <StatTile
            label={`Faculty below ${target}%`}
            value={improvement.faculty.length}
            flagged
            note={
              data.improvementSummary
                ? `of ${data.improvementSummary.facultyTotal} (${data.improvementSummary.facultyBelowPercent}%)`
                : "faculty members"
            }
          />

          <StatTile
            label={`Courses below ${target}%`}
            value={improvement.courses.length}
            flagged
            note={
              data.improvementSummary
                ? `of ${data.improvementSummary.courseTotal} (${data.improvementSummary.courseBelowPercent}%)`
                : "courses"
            }
          />

          <StatTile
            label={`Classes below ${target}%`}
            value={improvement.classes.length}
            flagged
            note="individual class sections"
          />

          <StatTile
            label="Student answers"
            value={data.institution.questionCount}
            note={`across ${data.institution.groupCount} classes`}
          />
        </div>
      </section>

      {/* ---------- Requirement 7: semesters and academic years ---------- */}
      <section>
        <SectionHeader
          title="Performance over time"
          lede="The institutional average by semester and by academic year."
        />

        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Panel
            title="By semester"
            keyItems={[thresholdKey(target)]}
            caption="Spring 2022 is not shown. It was supplied as department summaries only, with no question-level data."
          >
            <TrendChart data={semesterChart} target={target} />
          </Panel>

          <Panel title="By academic year" keyItems={[thresholdKey(target)]}>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={yearChart}
                  margin={{ top: 24, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid {...GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: VIZ.grid }}
                    tick={AXIS_TICK}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TICK}
                    unit="%"
                    width={44}
                  />
                  <Tooltip
                    content={<ChartTooltip valueLabel="Average" />}
                    cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.5 }}
                  />
                  <ReferenceLine
                    y={target}
                    stroke={VIZ.threshold}
                    strokeDasharray="4 4"
                  />
                  <Bar
                    dataKey="score"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={BAR_SIZE}
                    fill={VIZ.meets}
                    animationDuration={700}
                  >
                    <LabelList
                      dataKey="score"
                      position="top"
                      offset={8}
                      fill={VIZ.ink}
                      fontSize={12}
                      fontWeight={600}
                      formatter={(value: unknown) => `${Number(value)}%`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
                    {semester.semesterName} &middot; {semester.academicYear}
                  </p>
                  <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight">
                    {showScore(semester.score)}
                  </p>
                </div>
                <Meter score={semester.score} target={target} className="h-1.5" />
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

      {/* ---------- Requirements 2, 3 and 6: departments ---------- */}
      <DepartmentSection
        departments={data.byDepartment}
        target={target}
        institution={data.institution.score}
      />

      {/* ---------- Requirement 2: programmes ---------- */}
      <ProgrammeSection programmes={data.byProgramme} target={target} />

      {/* ---------- UKPSF ---------- */}
      <section>
        <SectionHeader
          title="Teaching quality areas"
          lede="The three areas of the UK Professional Standards Framework."
        />

        <Panel keyItems={[thresholdKey(target), ...statusKeys(target)]}>
          <RankedBars
            data={categoryChart}
            target={target}
            height="h-44"
            labelWidth={150}
            fontSize={13}
          />
        </Panel>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {["AA", "CK", "PV"].map((code) => {
            const result = data.byUkpsfCategory[code];
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
              </Card>
            );
          })}
        </div>
      </section>

      {/* ---------- Requirement 8: best and worst questions ---------- */}
      <section>
        <SectionHeader
          title="Strongest and weakest questions"
          lede={`Where the college does best and least well across all evaluations. All twenty questions fall within ${questionSpread} points of each other, so these bars sit close together by design.`}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Five strongest" keyItems={[thresholdKey(target)]}>
            <QuestionList items={strongest} target={target} />
          </Panel>

          <Panel title="Five weakest" keyItems={[thresholdKey(target)]}>
            <QuestionList items={weakest} target={target} />
          </Panel>
        </div>
      </section>

      {/* ---------- Requirement 4: improvement required ---------- */}
      <section>
        <SectionHeader
          title="Improvement required"
          lede={`Everything scoring below the ${target}% threshold, gathered in one place.`}
        />

        <div className="space-y-8">
          <div>
            <SubHeading>Survey questions below {target}%</SubHeading>
            {improvement.questions.length === 0 ? (
              <Card className="p-5">
                <p className="max-w-3xl text-sm text-muted-foreground">
                  No survey question falls below {target}% across the college.
                  The weakest, Q{weakest[0]?.[0]}, scores{" "}
                  {showScore(weakest[0]?.[1].score ?? null)}. Individual faculty
                  members may still have weak questions, shown on their own
                  report.
                </p>
              </Card>
            ) : (
              <TableShell>
                <Thead>
                  <tr>
                    <th className={TH_L}>Q</th>
                    <th className={TH_L}>Question</th>
                    <th className={TH_R}>Score</th>
                  </tr>
                </Thead>
                <tbody>
                  {improvement.questions.map((item) => (
                    <tr key={item.number} className={TR}>
                      <td className={TD + " tabular-nums text-muted-foreground"}>
                        {item.number}
                      </td>
                      <td className={TD}>{QUESTION_TEXT[item.number]}</td>
                      <td className={TD_R + " font-medium"}>
                        {showScore(item.score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </div>

          <div>
            <SubHeading>
              Courses below {target}% ({improvement.courses.length})
            </SubHeading>
            <TableShell>
              <Thead>
                <tr>
                  <th className={TH_L}>Course</th>
                  <th className={TH_L}>Code</th>
                  <th className={TH_R}>Classes</th>
                  <th className={TH_R}>Score</th>
                  <th className={TH_R}>Difference</th>
                </tr>
              </Thead>
              <tbody>
                {improvement.courses.map((item) => (
                  <tr key={item.code} className={TR}>
                    <td className={TD + " font-medium"}>{item.name}</td>
                    <td className={TD + " text-muted-foreground"}>{item.code}</td>
                    <td className={TD_R + " text-muted-foreground"}>
                      {item.groupCount}
                    </td>
                    <td className={TD_R + " font-medium"}>
                      {showScore(item.score)}
                    </td>
                    <td className={TD_R}>
                      <Delta value={item.gap} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>

          <div>
            <SubHeading>
              Faculty below {target}% ({improvement.faculty.length})
            </SubHeading>
            <TableShell>
              <Thead>
                <tr>
                  <th className={TH_L}>Faculty member</th>
                  <th className={TH_R}>Classes</th>
                  <th className={TH_R}>Score</th>
                  <th className={TH_R}>Difference</th>
                </tr>
              </Thead>
              <tbody>
                {improvement.faculty.map((item) => (
                  <tr key={item.id} className={TR}>
                    <td className={TD + " font-medium"}>{item.name}</td>
                    <td className={TD_R + " text-muted-foreground"}>
                      {item.classCount}
                    </td>
                    <td className={TD_R + " font-medium"}>
                      {showScore(item.score)}
                    </td>
                    <td className={TD_R}>
                      <Delta value={item.gap} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <p className="mt-2 text-xs text-muted-foreground">
              Individual results are on the faculty report page.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Requirement 5: question tracking ---------- */}
      <QuestionTrackingSection tracking={tracking} target={target} />
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
      <SectionHeader
        title="Question tracking"
        lede="Follow one survey question for one degree programme across the semesters."
      />

      {/* The controls sit in one row above everything they scope */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor="degree-select"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
        <Card className="gap-1 p-5">
          <p className="text-sm font-medium">No data</p>
          <p className="text-sm text-muted-foreground">
            There are no results for question {question} at {degree} level.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Panel
            title={
              <>
                Q{question}. {QUESTION_TEXT[question]}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  &middot; {degree} &middot; {tracked.ukpsfCategory}/
                  {tracked.ukpsfCode}
                </span>
              </>
            }
            keyItems={[thresholdKey(target)]}
          >
            <TrendChart data={chartData} target={target} valueLabel="Score" />
          </Panel>

          <div className="space-y-4">
            {tracked.bySemester.map((point) => (
              <Card key={point.semesterCode} className="gap-2 p-5">
                <p className="text-xs text-muted-foreground">
                  {point.semesterName}
                </p>
                <p className="text-2xl font-semibold leading-none tracking-tight">
                  {showScore(point.score)}
                </p>
                <Meter score={point.score} target={target} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {point.questionCount.toLocaleString()} answers
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- Requirements 2, 3 and 6: department results ----------
function DepartmentSection({
  departments,
  target,
  institution,
}: {
  departments: Record<string, DepartmentResult>;
  target: number;
  institution: number | null;
}) {
  // Which department the semester chart is showing
  const names = Object.keys(departments).sort(
    (a, b) => (departments[b].score ?? 0) - (departments[a].score ?? 0)
  );

  const [selected, setSelected] = useState<string>(names[0] ?? "");

  const chartData = names.map((name) => ({
    label: name.length > 24 ? name.slice(0, 22) + "\u2026" : name,
    full: name,
    score: departments[name].score as number,
  }));

  const chosen = departments[selected];

  const trend = chosen
    ? Object.values(chosen.bySemester)
        .sort((a, b) => a.semesterOrder - b.semesterOrder)
        .filter((s) => s.score !== null)
        .map((s) => ({
          label: s.semesterName,
          score: s.score as number,
          answers: s.questionCount,
        }))
    : [];

  return (
    <section>
      <SectionHeader
        title="Department comparison"
        lede={`Average score for each of the ${names.length} departments, set against the ${target}% threshold and the institutional average.`}
      />

      {/* --- The comparison chart --- */}
      <Panel
        keyItems={[
          thresholdKey(target),
          {
            label: `Institutional average ${institution}%`,
            color: VIZ.benchmark,
            dashed: true,
          },
          ...statusKeys(target),
        ]}
      >
        <RankedBars
          data={chartData}
          target={target}
          height="h-80"
          labelWidth={190}
          benchmark={institution}
        />
      </Panel>

      {/* --- The detail table --- */}
      <div className="mt-4">
        <TableShell>
          <Thead>
            <tr>
              <th className={TH_L}>Department</th>
              <th className={TH_R}>Courses</th>
              <th className={TH_R}>Faculty</th>
              <th className={TH_R}>Answers</th>
              <th className={TH_R}>Score</th>
              <th className={TH_R}>vs institution</th>
              <th className={TH_L}>Status</th>
            </tr>
          </Thead>
          <tbody>
            {names.map((name) => {
              const item = departments[name];
              const difference =
                item.score !== null && institution !== null
                  ? Math.round((item.score - institution) * 10) / 10
                  : null;
              return (
                <tr key={name} className={TR}>
                  <td className={TD + " font-medium"}>{name}</td>
                  <td className={TD_R + " text-muted-foreground"}>
                    {item.courseCount}
                  </td>
                  <td className={TD_R + " text-muted-foreground"}>
                    {item.facultyCount}
                  </td>
                  <td className={TD_R + " text-muted-foreground"}>
                    {item.questionCount.toLocaleString()}
                  </td>
                  <td className={TD_R + " font-medium"}>
                    {showScore(item.score)}
                  </td>
                  <td className={TD_R}>
                    <Delta value={difference} />
                  </td>
                  <td className={TD}>
                    <StatusPill status={item.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      </div>

      {/* --- One department over time --- */}
      <div className="mt-10">
        <SubHeading>One department over time</SubHeading>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose a department to see how its results have moved.
        </p>

        <div className="mb-4">
          <label
            htmlFor="department-select"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Department
          </label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger id="department-select" className="w-full sm:w-80">
              <SelectValue placeholder="Choose a department" />
            </SelectTrigger>
            <SelectContent>
              {names.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {chosen && trend.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Panel title={selected} keyItems={[thresholdKey(target)]}>
              <TrendChart data={trend} target={target} />
            </Panel>

            <div className="space-y-4">
              {["AA", "CK", "PV"].map((code) => {
                const result = chosen.ukpsfCategories[code];
                if (!result) return null;
                return (
                  <Card key={code} className="gap-2 p-5">
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_NAMES[code]}
                    </p>
                    <p className="text-2xl font-semibold leading-none tracking-tight">
                      {showScore(result.score)}
                    </p>
                    <Meter
                      score={result.score}
                      target={target}
                      className="h-1.5"
                    />
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="gap-1 p-5">
            <p className="text-sm font-medium">No data</p>
            <p className="text-sm text-muted-foreground">
              There are no results for this department.
            </p>
          </Card>
        )}
      </div>

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Departments are taken from the timetable PDFs supplied with the data,
        which state the department for every course. The evaluation
        spreadsheets contain no department field. All 184 evaluated courses
        were matched, and the three timetables agree with each other in every
        case.
      </p>
    </section>
  );
}

// ---------- Requirement 2: programme results ----------
function ProgrammeSection({
  programmes,
  target,
}: {
  programmes: Record<string, ProgrammeResult>;
  target: number;
}) {
  const all = Object.values(programmes).sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );

  // Group programmes under their department so the Bachelor and
  // Diploma versions of the same subject sit together
  const departments: Record<string, ProgrammeResult[]> = {};
  for (const item of all) {
    if (!departments[item.department]) {
      departments[item.department] = [];
    }
    departments[item.department].push(item);
  }

  const departmentNames = Object.keys(departments).sort();

  const chartData = all.map((item) => ({
    label:
      item.name.length > 34 ? item.name.slice(0, 32) + "\u2026" : item.name,
    full: item.name,
    score: item.score as number,
  }));

  const below = all.filter((item) => item.status === "Improvement Required");

  return (
    <section>
      <SectionHeader
        title="Programme comparison"
        lede={`Average score for each of the ${all.length} degree programmes. A programme is a degree level within a department.`}
      />

      {/* --- The comparison chart --- */}
      <Panel keyItems={[thresholdKey(target), ...statusKeys(target)]}>
        <RankedBars
          data={chartData}
          target={target}
          height="h-[34rem]"
          barSize={16}
          labelWidth={240}
          fontSize={11}
        />
      </Panel>

      {/* --- Programmes below the threshold --- */}
      {below.length > 0 && (
        <div className="mt-6">
          <SubHeading>
            Programmes below {target}% ({below.length})
          </SubHeading>
          <TableShell>
            <Thead>
              <tr>
                <th className={TH_L}>Programme</th>
                <th className={TH_R}>Answers</th>
                <th className={TH_R}>Score</th>
                <th className={TH_R}>Difference</th>
              </tr>
            </Thead>
            <tbody>
              {below.map((item) => (
                <tr key={item.name} className={TR}>
                  <td className={TD}>
                    <span className="font-medium">{item.name}</span>
                    {!item.reliable && (
                      <span
                        className="ml-2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: "var(--status-caution-wash)",
                          color: "var(--status-caution-inline)",
                        }}
                      >
                        few answers, treat with caution
                      </span>
                    )}
                  </td>
                  <td className={TD_R + " text-muted-foreground"}>
                    {item.questionCount.toLocaleString()}
                  </td>
                  <td className={TD_R + " font-medium"}>
                    {showScore(item.score)}
                  </td>
                  <td className={TD_R}>
                    <Delta value={item.gap} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </div>
      )}

      {/* --- Degree levels compared within each department --- */}
      <div className="mt-10">
        <SubHeading>Degree levels within each department</SubHeading>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Where a department teaches at more than one level, the gap between
          them is often larger than the gap between departments.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {departmentNames.map((department) => {
            const items = departments[department];
            const scores = items
              .map((item) => item.score)
              .filter((score): score is number => score !== null);
            const spread =
              scores.length > 1
                ? Math.round((Math.max(...scores) - Math.min(...scores)) * 10) /
                  10
                : null;

            return (
              <Card key={department} className="gap-4 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold tracking-tight">
                    {department}
                  </p>
                  {spread !== null && (
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {spread} point gap
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.name}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm">
                          {item.degree}
                          {!item.reliable && (
                            <span
                              className="ml-2 text-xs"
                              style={{ color: "var(--status-caution-inline)" }}
                            >
                              {item.questionCount} answers
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {showScore(item.score)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Meter
                          score={item.score}
                          target={target}
                          className="h-1.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        The source data contains no field named &ldquo;Programme&rdquo;. A
        programme here is a degree level within a department, which is how a
        degree of study is normally described. Both fields come from the
        supplied data: degree level from the evaluation files, department from
        the timetable PDFs. Programmes based on fewer than 100 survey answers
        are marked, since a score drawn from one small class is far less
        dependable than one drawn from hundreds.
      </p>
    </section>
  );
}
