"use client";

// components/dashboard/overview-report.tsx
//
// The institutional overview. "use client" because the question
// tracking, department and programme sections respond to dropdowns.
//
// Colours come from the tokens in app/globals.css by way of
// lib/chart-theme.ts. Nothing here carries a raw hex value, so the
// whole dashboard moves together when a token changes.

import { useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
  GRID,
  VIZ,
  degreeColor,
  degreeRank,
} from "@/lib/chart-theme";

import {
  ChartKey,
  ChartTooltip,
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
  DegreeDonut,
  RankedBars,
  TrendChart,
  type DegreeSlice,
  type RankedRow,
} from "@/components/dashboard/report-charts";

import {
  CATEGORY_MEANING,
  CATEGORY_NAMES,
  QUESTION_TEXT,
} from "@/lib/survey";

import type {
  DepartmentResult,
  OverviewData,
  ProgrammeResult,
  QuestionTracking,
} from "@/types/metrics";

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

  // Only the weakest question is still named, in the note that stands in
  // for the improvement table when nothing falls below the threshold.
  const questions = Object.entries(data.byQuestion).sort(
    (a, b) => (b[1].score ?? 0) - (a[1].score ?? 0)
  );
  const weakest = [...questions].reverse().slice(0, 5);

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

      {/* ---------- Requirement 5: question tracking ---------- */}
      <QuestionTrackingSection tracking={tracking} target={target} />

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
          <Panel title={selected} keyItems={[thresholdKey(target)]}>
            <TrendChart data={trend} target={target} />
          </Panel>
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
  // Diploma versions of the same subject sit together, then put each
  // department's levels in the order of study rather than by score, so
  // the rings all read the same way round.
  const departments: Record<string, ProgrammeResult[]> = {};
  for (const item of all) {
    if (!departments[item.department]) {
      departments[item.department] = [];
    }
    departments[item.department].push(item);
  }
  for (const items of Object.values(departments)) {
    items.sort((a, b) => degreeRank(a.degree) - degreeRank(b.degree));
  }

  const departmentNames = Object.keys(departments).sort();

  // The levels actually present, in the order of study, for the key
  const degreesPresent = [...new Set(all.map((item) => item.degree))].sort(
    (a, b) => degreeRank(a) - degreeRank(b)
  );

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

      {/* --- Degree levels within each department, drawn as rings --- */}
      <div className="mb-10">
        <SubHeading>Degree levels within each department</SubHeading>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Each ring is one department, split by how much of its evaluated
          teaching sat at each degree level. The average for the level is
          printed beside it: where a department teaches at more than one level,
          the gap between them is often larger than the gap between
          departments.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
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

            const total = items.reduce(
              (sum, item) => sum + item.questionCount,
              0
            );
            const slices: DegreeSlice[] = items.map((item) => ({
              degree: item.degree,
              answers: item.questionCount,
              share: total
                ? Math.round((item.questionCount / total) * 1000) / 10
                : 0,
              score: item.score,
              reliable: item.reliable,
            }));

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

                <div className="flex items-center gap-5">
                  <DegreeDonut data={slices} total={total} />

                  {/* The ring's own key. Every slice is named here, so
                      the colour never has to carry the level on its own. */}
                  <ul className="min-w-0 flex-1 space-y-2.5">
                    {slices.map((slice) => (
                      <li
                        key={slice.degree}
                        className="flex items-baseline gap-2.5"
                      >
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 translate-y-0.5 rounded-sm"
                          style={{ backgroundColor: degreeColor(slice.degree) }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {slice.degree}
                          </span>
                          <span className="block text-xs tabular-nums text-muted-foreground">
                            {slice.answers.toLocaleString()} answers &middot;{" "}
                            {slice.share}%
                          </span>
                          {!slice.reliable && (
                            <span
                              className="block text-xs"
                              style={{ color: "var(--status-caution-inline)" }}
                            >
                              few answers, treat with caution
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold tabular-nums">
                            {showScore(slice.score)}
                          </span>
                          {slice.score !== null && slice.score < target && (
                            <span
                              className="block text-xs"
                              style={{ color: "var(--status-critical-inline)" }}
                            >
                              below {target}%
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>

        <ChartKey
          items={degreesPresent.map((degree) => ({
            label: degree,
            color: degreeColor(degree),
          }))}
        />

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          The rings are sized by survey answers, not by score. A score is an
          average, not a share of anything, so it cannot be divided into
          slices; what a ring can honestly show is how a department&rsquo;s
          evaluated teaching was spread across its levels. Read the ring for
          the mix and the figures beside it for the result.
        </p>
      </div>

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
