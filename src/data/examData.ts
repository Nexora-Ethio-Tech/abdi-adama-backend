
export type ExamCategory = 'Mid-term' | 'Final' | 'Quiz' | 'Assignment';

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  correctOptionId?: string;
}

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  category: ExamCategory;
  durationMinutes: number;
  questions: Question[];
  status: 'available' | 'completed' | 'draft';
  isLocked?: boolean;
  lockPassword?: string;
  lockedBy?: string;
  isHidden?: boolean;
  hiddenBy?: string;
  canBeAccessedBy?: string[];
  principalSetPassword?: string;
}

export interface AnswerPayload {
  examId: string;
  studentId: string;
  answers: Record<string, string>;
  warningCount: number;
  startedAt: string;
  submittedAt: string;
  autoSubmitted: boolean;
}

export interface ViolationEvent {
  type: 'fullscreen-exit' | 'visibility-change' | 'blur';
  timestamp: string;
}

export const mockExams: Exam[] = [
  {
    id: 'math-mid-2024',
    title: 'Mathematics Mid-term Exam',
    courseId: 'math-101',
    courseName: 'Advanced Calculus',
    teacherId: 't1',
    teacherName: 'Dr. Smith',
    category: 'Mid-term',
    durationMinutes: 60,
    status: 'available',
    questions: [
      {
        id: 'q1',
        text: 'What is the square root of 144?',
        options: [
          { id: 'a', text: '10' },
          { id: 'b', text: '12' },
          { id: 'c', text: '14' },
          { id: 'd', text: '16' },
        ],
      },
    ],
  },
  {
    id: 'phys-final-2024',
    title: 'Physics Final Assessment',
    courseId: 'phys-202',
    courseName: 'Quantum Mechanics',
    teacherId: 't2',
    teacherName: 'Prof. Einstein',
    category: 'Final',
    durationMinutes: 120,
    status: 'available',
    questions: [],
  },
  {
    id: 'chem-quiz-1',
    title: 'Organic Chemistry Quiz #1',
    courseId: 'chem-301',
    courseName: 'Organic Chemistry',
    teacherId: 't1',
    teacherName: 'Dr. Smith',
    category: 'Quiz',
    durationMinutes: 30,
    status: 'available',
    questions: [],
  }
];

export const mockExam = mockExams[0];
