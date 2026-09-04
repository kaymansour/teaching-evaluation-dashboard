// types/metrics.ts
//
// Describes the shape of the JSON files in public/data.
//
// TypeScript uses these to catch mistakes before the page runs.
// If you type result.scoer instead of result.score, it tells you
// straight away rather than showing "undefined" on the page.

// --- Faculty ---------------------------------------------------

// One entry in the faculty dropdown
export type FacultyListItem = {
  id: string;
  name: string;
  score: number | null;
  status: Result["status"];
  classCount: number;
  semesters: string[];
};

// public/data/faculty-list.json
export type FacultyList = {
  faculty: FacultyListItem[];
};

// One class a teacher taught
export type ClassResult = Result & {
  semesterCode: string;
  semesterName: string;
  semesterOrder: number;
  courseCode: string;
  courseName: string;
  degree: string;
  section: string;
  edition: string;
  evaluatedStudents: string;
  complete: boolean;
};

// A teacher's score in one semester
export type FacultySemester = Result & {
  semesterName: string;
  semesterOrder: number;
};

// public/data/faculty/<id>.json
export type FacultyDetail = {
  id: string;
  name: string;
  nameRaw: string;
  overall: Result;
  ukpsfCategories: Record<string, Result>;
  ukpsfCodes: Record<string, Result>;
  bySemester: Record<string, FacultySemester>;
  byQuestion: Record<string, QuestionResult>;
  classes: ClassResult[];
  courseCount: number;
  classCount: number;
  benchmarks: {
    institution: number | null;
    target: number;
  };
};


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
