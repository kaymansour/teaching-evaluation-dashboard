// lib/survey.ts
//
// The wording behind the data: the twenty survey questions, the UKPSF
// categories and the twelve detailed standards.
//
// Both dashboards read from here. They each used to carry their own
// copy, which is exactly the kind of duplication that drifts apart
// without anyone noticing.

export const QUESTION_TEXT: Record<string, string> = {
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

export const CATEGORY_NAMES: Record<string, string> = {
  AA: "Areas of Activity",
  CK: "Core Knowledge",
  PV: "Professional Values",
};

export const CATEGORY_MEANING: Record<string, string> = {
  AA: "What the faculty member does in class",
  CK: "What the faculty member knows about the subject",
  PV: "How the faculty member treats students",
};

export const CODE_TEXT: Record<string, string> = {
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

// The twelve standards, grouped by category rather than alphabetically
export const CODE_ORDER = [
  "A1", "A2", "A3", "A4",
  "K1", "K2", "K3", "K4",
  "V1", "V2", "V3", "V4",
];
