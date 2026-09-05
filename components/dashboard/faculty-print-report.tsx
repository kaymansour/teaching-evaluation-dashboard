"use client";

// components/dashboard/faculty-print-report.tsx
//
// The printed faculty report, and only the printed one.
//
// On screen this whole tree sits under display:none. It becomes a
// document when the browser switches to print media, which is why it
// is written as a formal four-part report rather than as a screenshot
// of the dashboard:
//
//   1. Cover            2. Summary
//   3. Results by course  4. Question breakdown
//
// Each part opens a page of its own. The page rules live in the
// .print-report block of app/globals.css; nothing here can move the
// dashboard, because nothing here is ever visible on screen.
//
// Two blocks that used to be print-only inside the on-screen report
// live here now, so they stay print-only and exist exactly once: the
// faculty ID, on the cover, and the detailed UKPSF standards table,
// at the end of the summary.

import Image from "next/image";

import { scoreColor } from "@/lib/chart-theme";
import { CATEGORY_NAMES, CODE_ORDER, CODE_TEXT, QUESTION_TEXT } from "@/lib/survey";

import { PrintBars } from "@/components/dashboard/report-charts";
import { showScore } from "@/components/dashboard/report-ui";

import type { FacultyDetail } from "@/types/metrics";

// Ruled tables rather than the screen's cards: no fills, no hover, no
// rounded corners. A printed report is read as a document.
const PH =
  "border-b border-black/70 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide";
const PH_R = PH + " text-right";
const PD = "border-b border-black/15 px-2 py-1.5 align-top";
const PD_R = PD + " text-right tabular-nums";

// Long text has to fit a fixed-width chart axis, which cannot wrap.
function fit(text: string, limit: number) {
  return text.length > limit ? text.slice(0, limit - 1) + "…" : text;
}

// Status as a word. The screen's coloured pill means nothing in ink.
function statusWord(status: string) {
  if (status === "Improvement Required") return "Below threshold";
  if (status === "NO_DATA") return "No data";
  return "Acceptable";
}

// One question's score, drawn as a bar with the threshold marked. Built
// from divs rather than Recharts because the full question wording has
// to wrap beside it, and an SVG category axis cannot wrap.
function QuestionBar({
  score,
  target,
}: {
  score: number | null;
  target: number;
}) {
  return (
    <div className="relative h-2.5 w-full bg-black/[0.07]">
      {score !== null && (
        <div
          className="h-full"
          style={{ width: `${Math.min(score, 100)}%`, backgroundColor: scoreColor(score, target) }}
        />
      )}
      <div
        className="absolute inset-y-0 w-px"
        style={{ left: `${target}%`, backgroundColor: "var(--viz-threshold)" }}
      />
    </div>
  );
}

export function FacultyPrintReport({ detail }: { detail: FacultyDetail }) {
  const target = detail.benchmarks.target;
  const institution = detail.benchmarks.institution;
  const response = detail.response;
  const department = detail.department;

  // Which semesters and years this report covers
  const semesters = Object.values(detail.bySemester).sort(
    (a, b) => a.semesterOrder - b.semesterOrder
  );
  const years = [...new Set(semesters.map((s) => s.academicYear))];

  // Printed the day it is printed, not the day the data was built
  const generated = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // The benchmark chart: this teacher, their department, the college.
  // Anything without a score is left out rather than drawn as zero.
  const benchmark = [
    { label: fit(detail.name, 26), full: detail.name, score: detail.overall.score },
    { label: fit(department.name, 26), full: department.name, score: department.score },
    { label: "Institution", full: "Institution", score: institution },
  ].filter(
    (row): row is { label: string; full: string; score: number } =>
      row.score !== null
  );

  // All 20 questions, strongest first
  const rankedQuestions = Object.entries(detail.byQuestion).sort(
    (a, b) => (b[1].score ?? 0) - (a[1].score ?? 0)
  );

  // Enrolment is missing for some of the sections taught, so the ratio
  // rests on fewer sections than the report otherwise covers
  const shortfall = response.sectionsTaught - response.sectionsWithEnrolment;

  return (
    <div className="print-report hidden text-[11px] leading-snug text-black print:block">
      {/* ============ 1. COVER ============ */}
      <section className="print-part">
        <div className="flex items-center gap-4 border-b border-black pb-4">
          <Image
            src="/ucb_logo.png"
            alt="University College of Bahrain"
            width={1024}
            height={486}
            priority
            className="h-12 w-auto"
          />
          <div>
            <p className="text-sm font-semibold">
              University College of Bahrain
            </p>
            <p className="text-[11px] text-black/60">
              Quality Assurance &middot; Teaching Evaluation
            </p>
          </div>
        </div>

        <div className="mt-16">
          <p className="text-[11px] uppercase tracking-[0.2em] text-black/60">
            Teaching Evaluation Report
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {detail.name}
          </h1>
          <p className="mt-2 text-[11px] text-black/60">
            Faculty ID {detail.id} &middot; {department.name}
            {department.count > 1 && (
              <> &middot; {department.share}% of teaching in this department</>
            )}
          </p>
        </div>

        <dl className="mt-12 grid max-w-xl grid-cols-[10rem_1fr] gap-y-2 border-t border-black/20 pt-6">
          <dt className="text-black/60">Academic year</dt>
          <dd>{years.join(", ")}</dd>

          <dt className="text-black/60">Semesters covered</dt>
          <dd>{semesters.map((s) => s.semesterName).join(", ")}</dd>

          <dt className="text-black/60">Classes taught</dt>
          <dd className="tabular-nums">
            {detail.classCount} surveys across {response.sectionsTaught} class
            sections in {detail.courseCount} courses
          </dd>

          <dt className="text-black/60">Report generated</dt>
          <dd>{generated}</dd>
        </dl>

        {/* The summary box: who was asked, and who answered */}
        <div className="print-keep mt-10 max-w-xl border border-black/40 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide">
            Survey response
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <dt className="text-black/60">Audience</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {response.audience === null
                  ? "—"
                  : response.audience.toLocaleString()}
              </dd>
              <dd className="text-[10px] text-black/60">students enrolled</dd>
            </div>
            <div>
              <dt className="text-black/60">Responses</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {response.responses.toLocaleString()}
              </dd>
              <dd className="text-[10px] text-black/60">
                student responses
              </dd>
            </div>
            <div>
              <dt className="text-black/60">Response ratio</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {response.responseRatio === null
                  ? "—"
                  : `${response.responseRatio}%`}
              </dd>
              <dd className="text-[10px] text-black/60">
                {response.sectionsWithEnrolment.toLocaleString()} of{" "}
                {response.sectionsTaught.toLocaleString()} sections
              </dd>
            </div>
          </dl>

          {shortfall > 0 && (
            <p className="mt-4 border-t border-black/15 pt-3 text-[10px] leading-relaxed text-black/60">
              {shortfall} of the {response.sectionsTaught} sections taught carry
              no enrolment figure, so the ratio is worked out from the{" "}
              {response.sectionsWithEnrolment} that do, against{" "}
              {(response.responsesMatched ?? 0).toLocaleString()} of the{" "}
              {response.responses.toLocaleString()} responses received.
            </p>
          )}
        </div>

        <p className="mt-10 max-w-xl border-t border-black/20 pt-4 text-[10px] leading-relaxed text-black/60">
          Scores in this report are percentages out of 100. The threshold for
          acceptable performance is {target}%. Enrolment figures come from the
          published timetables; all other figures come from the student
          evaluation returns.
        </p>
      </section>

      {/* ============ 2. SUMMARY ============ */}
      <section className="print-part">
        <h2 className="border-b border-black pb-2 text-base font-semibold">
          1. Summary
        </h2>

        <div className="print-keep mt-6 flex items-baseline gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-black/60">
              Overall score
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">
              {showScore(detail.overall.score)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-black/60">
              Against the {target}% threshold
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {detail.overall.gap === null
                ? "—"
                : `${detail.overall.gap >= 0 ? "+" : ""}${detail.overall.gap} points`}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-black/60">
              Status
            </p>
            <p className="mt-1 text-lg font-semibold">
              {statusWord(detail.overall.status)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-black/60">
              Student answers
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {detail.overall.questionCount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="print-keep mt-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide">
            Benchmark
          </h3>
          <p className="mt-1 text-[10px] text-black/60">
            This faculty member against {department.name} and the institutional
            average. The dashed rule marks the {target}% threshold.
          </p>
          <div className="mt-3">
            <PrintBars data={benchmark} target={target} />
          </div>
          {department.count > 1 && (
            <p className="mt-1 text-[10px] text-black/60">
              This faculty member teaches across {department.count} departments;{" "}
              {department.share}% of their survey answers came from{" "}
              {department.name}, which is the department benchmarked above.
            </p>
          )}
        </div>

        <div className="print-keep mt-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide">
            Survey response
          </h3>
          <table className="mt-3 w-full max-w-xl border-collapse">
            <tbody>
              <tr>
                <td className={PD}>Students enrolled (audience)</td>
                <td className={PD_R}>
                  {response.audience === null
                    ? "—"
                    : response.audience.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className={PD}>Student responses</td>
                <td className={PD_R}>{response.responses.toLocaleString()}</td>
              </tr>
              <tr>
                <td className={PD}>Response ratio</td>
                <td className={PD_R}>
                  {response.responseRatio === null
                    ? "—"
                    : `${response.responseRatio}%`}
                </td>
              </tr>
              <tr>
                <td className={PD}>Class sections taught</td>
                <td className={PD_R}>
                  {response.sectionsTaught.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className={PD}>Surveys returned</td>
                <td className={PD_R}>{detail.classCount.toLocaleString()}</td>
              </tr>
              <tr>
                <td className={PD}>Sections with an enrolment figure</td>
                <td className={PD_R}>
                  {response.sectionsWithEnrolment.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Kept print-only, as it was inside the screen report */}
        <div className="mt-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide">
            Detailed standards
          </h3>
          <p className="mt-1 text-[10px] text-black/60">
            The twelve UKPSF standards. A standard resting on fewer answers is
            less reliable, so the number of answers is shown.
          </p>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr>
                <th className={PH + " w-12"}>Code</th>
                <th className={PH}>Standard</th>
                <th className={PH_R + " w-20"}>Answers</th>
                <th className={PH_R + " w-16"}>Score</th>
                <th className={PH + " w-32"}>Status</th>
              </tr>
            </thead>
            <tbody>
              {CODE_ORDER.map((code) => {
                const result = detail.ukpsfCodes[code];
                if (!result) return null;
                return (
                  <tr key={code}>
                    <td className={PD + " font-medium"}>{code}</td>
                    <td className={PD}>{CODE_TEXT[code]}</td>
                    <td className={PD_R}>
                      {result.questionCount.toLocaleString()}
                    </td>
                    <td className={PD_R + " font-medium"}>
                      {showScore(result.score)}
                    </td>
                    <td className={PD}>{statusWord(result.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide">
            Teaching quality areas
          </h3>
          <table className="mt-3 w-full max-w-xl border-collapse">
            <thead>
              <tr>
                <th className={PH}>Area</th>
                <th className={PH_R + " w-20"}>Answers</th>
                <th className={PH_R + " w-16"}>Score</th>
                <th className={PH + " w-32"}>Status</th>
              </tr>
            </thead>
            <tbody>
              {["AA", "CK", "PV"].map((code) => {
                const result = detail.ukpsfCategories[code];
                if (!result) return null;
                return (
                  <tr key={code}>
                    <td className={PD}>{CATEGORY_NAMES[code]}</td>
                    <td className={PD_R}>
                      {result.questionCount.toLocaleString()}
                    </td>
                    <td className={PD_R + " font-medium"}>
                      {showScore(result.score)}
                    </td>
                    <td className={PD}>{statusWord(result.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============ 3. RESULTS BY COURSE ============ */}
      <section className="print-part">
        <h2 className="border-b border-black pb-2 text-base font-semibold">
          2. Results by course
        </h2>
        <p className="mt-2 text-[10px] text-black/60">
          Every course and section taught, in semester order. Scores are
          percentages out of 100; the threshold is {target}%.
        </p>

        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr>
              <th className={PH + " w-20"}>Code</th>
              <th className={PH}>Course</th>
              <th className={PH + " w-28"}>Semester</th>
              <th className={PH + " w-14"}>Section</th>
              <th className={PH + " w-20"}>Level</th>
              <th className={PH_R + " w-16"}>Answers</th>
              <th className={PH_R + " w-14"}>Score</th>
              <th className={PH + " w-28"}>Status</th>
            </tr>
          </thead>
          <tbody>
            {detail.classes.map((item, index) => (
              <tr
                key={`${item.semesterCode}-${item.courseCode}-${item.section}-${index}`}
              >
                <td className={PD + " whitespace-nowrap"}>{item.courseCode}</td>
                <td className={PD}>{item.courseName}</td>
                <td className={PD + " whitespace-nowrap"}>
                  {item.semesterName}
                </td>
                <td className={PD}>{item.section}</td>
                <td className={PD + " whitespace-nowrap"}>{item.degree}</td>
                <td className={PD_R}>{item.questionCount}</td>
                <td className={PD_R + " font-medium"}>
                  {showScore(item.score)}
                </td>
                <td className={PD + " whitespace-nowrap"}>
                  {statusWord(item.status)}
                  {!item.complete && (
                    <span className="block text-[9px] text-black/60">
                      only {item.questionCount} answers
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ============ 4. QUESTION BREAKDOWN ============ */}
      <section className="print-part">
        <h2 className="border-b border-black pb-2 text-base font-semibold">
          3. Question breakdown
        </h2>
        <p className="mt-2 text-[10px] text-black/60">
          All {rankedQuestions.length} survey questions, strongest first. The
          vertical rule on each bar marks the {target}% threshold.
        </p>

        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr>
              <th className={PH + " w-8"}>Q</th>
              <th className={PH}>Question</th>
              <th className={PH + " w-20"}>UKPSF</th>
              <th className={PH_R + " w-14"}>Score</th>
              <th className={PH + " w-[34%]"} />
            </tr>
          </thead>
          <tbody>
            {rankedQuestions.map(([number, result]) => (
              <tr key={number}>
                <td className={PD_R + " text-black/60"}>{number}</td>
                <td className={PD}>{QUESTION_TEXT[number]}</td>
                <td className={PD + " whitespace-nowrap text-black/60"}>
                  {result.ukpsfCategory} / {result.ukpsfCode}
                </td>
                <td className={PD_R + " font-medium"}>
                  {showScore(result.score)}
                </td>
                <td className={PD}>
                  <div className="pt-1">
                    <QuestionBar score={result.score} target={target} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
