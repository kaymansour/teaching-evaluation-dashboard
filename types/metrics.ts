// types/metrics.ts
//
// Describes the shape of the JSON files in public/data.
//
// TypeScript uses these to catch mistakes before the page runs.
// If you type result.scoer instead of result.score, it tells you
// straight away rather than showing "undefined" on the page.

// The standard result block returned for every calculation
export type Result = {
  score: number | null;
  status: "Acceptable" | "Improvement Required" | "NO_DATA";
  gap: number | null;
  questionCount: number;
  groupCount: number;
};

// A result for one semester, with the extra fields needed for sorting
export type SemesterResult = Result & {
  semesterName: string;
  semesterOrder: number;
  academicYear: string;
};

// A result for one survey question
export type QuestionResult = Result & {
  ukpsfCategory: string;
  ukpsfCode: string;
};

// A result for one course
export type CourseResult = Result & {
  name: string;
};

// How many faculty and courses fall below the 65% target
export type ImprovementSummary = {
  facultyTotal: number;
  facultyBelow: number;
  facultyBelowPercent: number;
  courseTotal: number;
  courseBelow: number;
  courseBelowPercent: number;
};

// The whole of public/data/overview.json
export type OverviewData = {
  target: number;
  institution: Result;
  bySemester: Record<string, SemesterResult>;
  byAcademicYear: Record<string, Result>;
  byUkpsfCategory: Record<string, Result>;
  byUkpsfCode: Record<string, Result>;
  byQuestion: Record<string, QuestionResult>;
  byCourse: Record<string, CourseResult>;
  improvementSummary: ImprovementSummary;
};
