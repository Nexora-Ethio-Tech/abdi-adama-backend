
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AbsenceQueueItem {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  parentName: string;
  parentPhone: string;
  reportedAt: string;
  reportedBy: string;
  reason: string;
  date: string;
  status: 'pending' | 'excused' | 'notified';
}

export interface PublicPost {
  id: string;
  type: 'image' | 'video';
  mediaUrl: string;
  description: string;
  timestamp: string;
}

export interface SchoolNotice {
  id: string;
  title: string;
  content: string;
  priority: 'Normal' | 'Medium' | 'High';
  time: string;
  expiresAt?: string;
  category: 'Academic' | 'Logistics' | 'Finance';
  audience: string[];
  driverName?: string;
  stations?: string;
}

export interface ExamControl {
  isHidden: boolean;
  isLocked: boolean;
  lockOwnerId: string | null;
  lockPassword: string | null;
  principalPassword: string;
}

interface AppState {
  // Exam Lockdown
  isExamLockedDown: boolean;
  lockdownPassword: string | null;
  setExamLockedDown: (isLocked: boolean, password?: string) => void;

  // Branch Selection
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;

  // Attendance Escalation Queue
  absenceQueue: AbsenceQueueItem[];
  enqueueAbsences: (items: AbsenceQueueItem[]) => void;
  updateAbsenceStatus: (id: string, status: AbsenceQueueItem['status']) => void;

  // Examiner Promotion (frontend authority source)
  examinerTeacherIds: string[];
  setTeacherExaminerStatus: (teacherId: string, isExaminer: boolean) => void;

  // Exam Access Controls
  examControls: Record<string, ExamControl>;
  ensureExamControl: (examId: string) => void;
  setExamHidden: (examId: string, hidden: boolean) => void;
  lockExam: (examId: string, ownerId: string, password: string) => void;
  unlockExam: (examId: string, ownerId: string, password: string) => boolean;
  setPrincipalPassword: (examId: string, password: string) => void;

  // Public Landing Page Posts
  publicPosts: PublicPost[];
  addPublicPost: (post: Omit<PublicPost, 'id' | 'timestamp'>) => void;
  updatePublicPost: (id: string, updates: Partial<PublicPost>) => void;
  deletePublicPost: (id: string) => void;

  // School Notices
  notices: SchoolNotice[];
  addNotice: (notice: Omit<SchoolNotice, 'id' | 'time'>) => void;
  deleteNotice: (id: string) => void;
}

const defaultExamControl = (): ExamControl => ({
  isHidden: true,
  isLocked: false,
  lockOwnerId: null,
  lockPassword: null,
  principalPassword: 'principal123',
});

export const useStore = create<AppState>()(persist((set, get) => ({
  isExamLockedDown: false,
  lockdownPassword: null,
  setExamLockedDown: (isLocked: boolean, password?: string) => set({
    isExamLockedDown: isLocked,
    lockdownPassword: password || null
  }),

  selectedBranchId: null,
  setSelectedBranchId: (id: string | null) => set({ selectedBranchId: id }),

  absenceQueue: [],
  enqueueAbsences: (items: AbsenceQueueItem[]) => set((state) => ({
    absenceQueue: [...items, ...state.absenceQueue]
  })),
  updateAbsenceStatus: (id: string, status: AbsenceQueueItem['status']) => set((state) => ({
    absenceQueue: state.absenceQueue.map((q) => q.id === id ? { ...q, status } : q)
  })),

  examinerTeacherIds: ['T1'],
  setTeacherExaminerStatus: (teacherId: string, isExaminer: boolean) => set((state) => {
    const normalized = teacherId.toUpperCase();
    if (isExaminer && !state.examinerTeacherIds.includes(normalized)) {
      return { examinerTeacherIds: [...state.examinerTeacherIds, normalized] };
    }
    if (!isExaminer) {
      return { examinerTeacherIds: state.examinerTeacherIds.filter((id) => id !== normalized) };
    }
    return state;
  }),

  examControls: {},
  ensureExamControl: (examId: string) => set((state) => ({
    examControls: state.examControls[examId]
      ? state.examControls
      : { ...state.examControls, [examId]: defaultExamControl() }
  })),
  setExamHidden: (examId: string, hidden: boolean) => set((state) => ({
    examControls: {
      ...state.examControls,
      [examId]: {
        ...(state.examControls[examId] || defaultExamControl()),
        isHidden: hidden
      }
    }
  })),
  lockExam: (examId: string, ownerId: string, password: string) => set((state) => ({
    examControls: {
      ...state.examControls,
      [examId]: {
        ...(state.examControls[examId] || defaultExamControl()),
        isLocked: true,
        lockOwnerId: ownerId,
        lockPassword: password
      }
    }
  })),
  unlockExam: (examId: string, ownerId: string, password: string) => {
    const control = get().examControls[examId] || defaultExamControl();
    const canUnlock = control.isLocked && control.lockOwnerId === ownerId && control.lockPassword === password;
    if (!canUnlock) {
      return false;
    }
    set((state) => ({
      examControls: {
        ...state.examControls,
        [examId]: {
          ...control,
          isLocked: false,
          lockOwnerId: null,
          lockPassword: null
        }
      }
    }));
    return true;
  },
  setPrincipalPassword: (examId: string, password: string) => set((state) => ({
    examControls: {
      ...state.examControls,
      [examId]: {
        ...(state.examControls[examId] || defaultExamControl()),
        principalPassword: password
      }
    }
  })),

  publicPosts: [
    {
      id: 'post-1',
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1523050853063-913ec3673c2e?q=80&w=800&auto=format&fit=crop',
      description: 'Celebrating our Class of 2024! A beautiful graduation ceremony marking the end of one journey and the beginning of another. Congratulations to all our outstanding students.',
      timestamp: '2024-06-15T10:00:00Z'
    },
    {
      id: 'post-2',
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1544333346-64e4fe18204b?q=80&w=800&auto=format&fit=crop',
      description: 'New sports facilities now open! Our commitment to physical education continues with the inauguration of our modern sports complex. Building champions on and off the field.',
      timestamp: '2024-05-20T14:30:00Z'
    },
    {
      id: 'post-3',
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1564939558297-fc396f18e5c7?q=80&w=800&auto=format&fit=crop',
      description: 'Annual Science Fair Highlights: Our young scientists showcased incredible innovative projects this week. From robotics to sustainable energy solutions, the future looks bright!',
      timestamp: '2024-04-10T09:00:00Z'
    }
  ],
  addPublicPost: (post) => set((state) => ({
    publicPosts: [
      {
        ...post,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      ...state.publicPosts
    ]
  })),
  updatePublicPost: (id, updates) => set((state) => ({
    publicPosts: state.publicPosts.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  deletePublicPost: (id) => set((state) => ({
    publicPosts: state.publicPosts.filter(p => p.id !== id)
  })),

  notices: [
    { id: '1', title: 'Term 3 Exams Schedule', content: 'The final schedule for Term 3 exams has been posted in the academic office.', priority: 'High', time: '1 hour ago', expiresAt: '2024-06-30', category: 'Academic', audience: ['school-admin','vice-principal','teacher','student','parent'] },
    { id: '2', title: 'Bus #4 — 15 min delay', content: 'Heavy traffic near Meskel Square. Route B running behind schedule.', priority: 'Medium', time: '30 mins ago', expiresAt: '2024-05-15', category: 'Logistics', driverName: 'Ato Bekele', audience: ['school-admin','vice-principal','parent','student'] },
    { id: '3', title: 'Fee deadline extended', content: 'April fee payment deadline extended to May 5th for all branches.', priority: 'High', time: 'Yesterday', expiresAt: '2024-05-05', category: 'Finance', audience: ['school-admin','finance-clerk','parent'] },
  ],
  addNotice: (notice) => set((state) => ({
    notices: [
      {
        ...notice,
        id: crypto.randomUUID(),
        time: 'Just now',
      },
      ...state.notices
    ]
  })),
  deleteNotice: (id) => set((state) => ({
    notices: state.notices.filter(n => n.id !== id)
  })),
}), {
  name: 'abdi-adama-front-store',
  partialize: (state) => ({
    selectedBranchId: state.selectedBranchId,
    absenceQueue: state.absenceQueue,
    examinerTeacherIds: state.examinerTeacherIds,
    examControls: state.examControls,
    publicPosts: state.publicPosts,
    notices: state.notices,
  })
}));
