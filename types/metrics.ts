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

export type OverviewData = {
  target: number;
  institution: Result;
  participation: Participation;
  coverage: Coverage;
  bySemester: Record<string, SemesterResult>;
  byAcademicYear: Record<string, Result>;
  byUkpsfCategory: Record<string, Result>;
  byUkpsfCode: Record<string, Result>;
  byQuestion: Record<string, QuestionResult>;
  byCourse: Record<string, CourseResult>;
  improvementSummary: ImprovementSummary;
  improvement: Improvement;
  dataQuality: DataQuality;
  byDepartment: Record<string, DepartmentResult>;
  byProgramme: Record<string, ProgrammeResult>;
};

// --- Overview page ---------------------------------------------

// Who was asked, and who answered. Enrolment comes from the timetable
// PDFs; the evaluation files carry only the number who answered, so
// eligibleStudents and responseRate are null when that lookup is absent.
export type Participation = {
  eligibleStudents: number | null;
  studentsResponded: number;
  responseRate: number | null;
  sectionsEvaluated: number;
  sectionsWithEnrolment: number;
};

// How much teaching the evaluation actually reached
export type Coverage = {
  facultyEvaluated: number;
  coursesEvaluated: number;
  classSectionsEvaluated: number;
  semesters: number;
};

// One faculty member below the threshold
export type ImprovementFaculty = {
  id: string;
  name: string;
  score: number;
  gap: number;
  classCount: number;
};

// One course below the threshold
export type ImprovementCourse = {
  code: string;
  name: string;
  score: number;
  gap: number;
  questionCount: number;
  groupCount: number;
};

// One survey question below the threshold
export type ImprovementQuestion = {
  number: string;
  score: number;
  gap: number;
  ukpsfCategory: string;
  ukpsfCode: string;
};

// One class below the threshold
export type ImprovementClass = {
  facultyId: string;
  facultyName: string;
  courseCode: string;
  courseName: string;
  semesterName: string;
  section: string;
  degree: string;
  score: number;
  gap: number;
  questionCount: number;
};

// Everything below the threshold, gathered together
export type Improvement = {
  faculty: ImprovementFaculty[];
  courses: ImprovementCourse[];
  questions: ImprovementQuestion[];
  classes: ImprovementClass[];
};

// How complete and reliable the underlying data is
export type DataQuality = {
  validRecords: number;
  excludedRecords: number;
  excludedReasons: Record<string, number>;
  semestersWithQuestionData: number;
  semestersSupplied: number;
  note: string;
};

// One point on a question-tracking line
export type TrackingPoint = Result & {
  semesterCode: string;
  semesterName: string;
  semesterOrder: number;
};

// One question tracked for one degree level
export type TrackedQuestion = {
  overall: Result;
  ukpsfCategory: string;
  ukpsfCode: string;
  bySemester: TrackingPoint[];
};

// public/data/question-tracking.json
export type QuestionTracking = {
  byDegree: Record<string, Record<string, TrackedQuestion>>;
};


// --- Departments -----------------------------------------------

// A department's score in one semester
export type DepartmentSemester = Result & {
  semesterName: string;
  semesterOrder: number;
};

// One department's full results
export type DepartmentResult = Result & {
  name: string;
  facultyCount: number;
  courseCount: number;
  bySemester: Record<string, DepartmentSemester>;
  ukpsfCategories: Record<string, Result>;
};


// --- Programmes ------------------------------------------------

// A programme's score in one semester
export type ProgrammeSemester = Result & {
  semesterName: string;
  semesterOrder: number;
};

// One programme: a degree level within a department
export type ProgrammeResult = Result & {
  name: string;
  department: string;
  degree: string;
  facultyCount: number;
  courseCount: number;
  reliable: boolean;
  bySemester: Record<string, ProgrammeSemester>;
  ukpsfCategories: Record<string, Result>;
};
