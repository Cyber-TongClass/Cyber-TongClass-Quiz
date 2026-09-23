export type QuizAnswer = string | string[] | null;
export interface QuizQuestion {
  id: string;
  type: "single_choice" | "multiple_choice" | "fill_blank";
  stem: string;
  timeLimitSeconds?: number;
  options?: { id: string; text: string }[];
}
export interface QuizStudent {
  id: string;
  studentId: string;
  name: string;
  status: "active" | "disabled";
}
export interface QuizCourse {
  _id: string;
  slug: string;
  title: string;
  term: string;
  description: string;
  published: boolean;
  total?: number;
  completed?: number;
  best?: number | null;
  updated?: number | null;
}
export interface QuizLecture {
  _id: string;
  course: string;
  slug: string;
  title: string;
  order: number;
  bank: string;
  drawCount: number;
  published: boolean;
  progress?: { completed: number; best: number; latest: number } | null;
}
export interface QuizBank {
  _id: string;
  key: string;
  title: string;
  status: "draft" | "ready";
  expected: number;
}
export interface QuizCatalog {
  courses: QuizCourse[];
  lectures: QuizLecture[];
  banks: QuizBank[];
}
export interface QuizVerdict {
  correct: boolean;
  answer: string | string[];
  explanation: string;
  timedOut: boolean;
}
export interface QuizAttempt {
  id: string;
  title: string;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  revision: number;
  deadlines: (number | null)[];
  verdicts: (QuizVerdict | null)[];
  serverNow: number;
  status: "active" | "submitted";
  score?: number;
}
export interface QuizHistory {
  id: string;
  title: string;
  status: string;
  score?: number;
  started: number;
}
export interface QuizProgress {
  studentId: string;
  name: string;
  course: string;
  lecture: string;
  completed: number;
  best: number;
  latest: number;
  updated: number;
}
export interface QuizPage<T> {
  page: T[];
  isDone: boolean;
  continueCursor: string;
}
export interface QuizStudentDetail extends QuizStudent {
  enrollments: { course: string; active: boolean }[];
}
export interface QuizQueries {
  "learning:me": QuizStudent | null;
  "learning:courses": QuizCourse[];
  "learning:course": QuizCourse & { lectures: QuizLecture[] };
  "learning:attempt": QuizAttempt;
  "learning:history": QuizPage<QuizHistory>;
}
