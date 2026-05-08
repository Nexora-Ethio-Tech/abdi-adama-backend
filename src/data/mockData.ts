export const mockStudents = [
  {
    id: '1',
    name: 'Abebe Bikila',
    grade: '10A',
    status: 'Active',
    parentName: 'Bikila Demissie',
    parentPhone: '+251911111111',
    dob: '2010-05-15',
    gender: 'Male',
    address: 'Addis Ababa, Bole Sub-city',
    bloodGroup: 'A+',
    allergies: 'Peanuts',
    medications: 'None',
    emergencyContact: {
      name: 'Bikila Demissie',
      relation: 'Father',
      phone: '+251911111111'
    },
    riskLevel: 'Low',
    riskFactor: 'Stable performance and attendance.',
    attendanceHistory: [
      { month: 'Sep', rate: 98 },
      { month: 'Oct', rate: 95 },
      { month: 'Nov', rate: 92 },
      { month: 'Dec', rate: 96 },
      { month: 'Jan', rate: 94 },
      { month: 'Feb', rate: 97 },
    ],
    academicHistory: [
      { year: '2014', grade: '8', average: '88%', rank: '5/42' },
      { year: '2015', grade: '9', average: '91%', rank: '2/45' },
    ],
    isScholarship: false,
    isBusUser: true,
    penaltyFee: 0,
    monthlyFee: 5000,
    busFee: 1200,
    chronicConditions: 'None',
    vaccinationStatus: 'Up to Date',
    homeMedications: 'Multivitamins (Daily)',
    bio: 'An enthusiastic student with a strong interest in Mathematics and Physics.'
  },
  {
    id: '2',
    name: 'Sara Kebede',
    grade: '9B',
    status: 'Active',
    parentName: 'Kebede Tessema',
    parentPhone: '+251922222222',
    bloodGroup: 'O+',
    allergies: 'None',
    medications: 'None',
    emergencyContact: {
      name: 'Kebede Tessema',
      relation: 'Father',
      phone: '+251922222222'
    },
    riskLevel: 'Medium',
    riskFactor: 'Slight decline in Mathematics scores recently.',
    isScholarship: true,
    isBusUser: false,
    penaltyFee: 0,
    monthlyFee: 5000,
    busFee: 0,
    chronicConditions: 'None',
    vaccinationStatus: 'Up to Date',
    homeMedications: 'None',
    bio: 'Excels in artistic projects and linguistic studies.'
  },
  {
    id: '3',
    name: 'Dawit Lema',
    grade: '11C',
    status: 'Active',
    parentName: 'Lema Hailu',
    parentPhone: '+251933333333',
    bloodGroup: 'B-',
    allergies: 'Dust',
    medications: 'Antihistamines',
    emergencyContact: {
      name: 'Lema Hailu',
      relation: 'Father',
      phone: '+251933333333'
    },
    riskLevel: 'High',
    riskFactor: 'Frequent absenteeism in the last month.',
    isScholarship: false,
    isBusUser: true,
    penaltyFee: 150,
    monthlyFee: 6500,
    busFee: 1200,
    chronicConditions: 'Asthma',
    vaccinationStatus: 'Up to Date',
    homeMedications: 'Inhaler as needed',
    bio: 'Passionate about sports and active community member.'
  },
  { id: '4', name: 'Hanna Yohannes', grade: '12A', status: 'Inactive', parentName: 'Yohannes Ayele', parentPhone: '+251944444444', riskLevel: 'Low', isScholarship: false, isBusUser: false, penaltyFee: 0, monthlyFee: 7000, busFee: 0 },
  { id: '5', name: 'Mulugeta Tesfaye', grade: '8D', status: 'Active', parentName: 'Tesfaye Belay', parentPhone: '+251955555555', riskLevel: 'Low', isScholarship: true, isBusUser: true, penaltyFee: 0, monthlyFee: 4500, busFee: 1200 },
  { id: '6', name: 'Biniyam Yosef', grade: '10A', status: 'Active', parentName: 'Yosef Kassa', parentPhone: '+251911223344', riskLevel: 'Medium', riskFactor: 'Sudden drop in Physics attendance.', isScholarship: false, isBusUser: false, penaltyFee: 300, monthlyFee: 5000, busFee: 0 },
  { id: '7', name: 'Tigist Walelign', grade: '9B', status: 'Active', parentName: 'Walelign Tadesse', parentPhone: '+251911556677', riskLevel: 'Low', isScholarship: false, isBusUser: true, penaltyFee: 0, monthlyFee: 5000, busFee: 1200 },
];

export const mockTeachers = [
  { id: 'T1', name: 'Ato Solomon', subjects: ['Math', 'Physics'], branch: 'Main', classes: 2, isInClass: true, isDean: true, isRoomTeacher: true, assignedRoomClass: 'Grade 10A', department: 'Science', hireDate: '2015-09-01', experience: '12 Years', bio: 'Senior educator with a passion for theoretical physics and mathematical modeling.', points: 1450 },
  { id: 'T2', name: 'W/ro Selam', subjects: ['Biology', 'Chemistry'], branch: 'Main', classes: 3, isInClass: false, isRoomTeacher: true, assignedRoomClass: 'Grade 9B', department: 'Science', hireDate: '2018-10-15', experience: '8 Years', bio: 'Expert in molecular biology and interactive lab teaching methods.', points: 1200 },
  { id: 'T3', name: 'Ato Kebede', subjects: ['History', 'Geography'], branch: 'Bole', classes: 4, isInClass: true, department: 'Social Science', hireDate: '2020-01-10', experience: '15 Years', bio: 'Specializes in Ethiopian history and regional geographical studies.', points: 1580 },
  { id: 'T4', name: 'W/ro Aster', subjects: ['English', 'Amharic'], branch: 'Megenagna', classes: 2, isInClass: false, department: 'Languages', hireDate: '2021-09-01', experience: '5 Years', bio: 'Focused on bilingual education and creative writing for young learners.', points: 980 },
  { id: 'T5', name: 'Ato Tadesse', subjects: ['Physical Education'], branch: 'Adama', classes: 5, isInClass: false, department: 'Vocational', hireDate: '2019-02-20', experience: '10 Years', bio: 'Certified athletics coach and advocate for healthy student lifestyles.', points: 1350 },
];

export const mockClasses = [
  { id: 'C1', name: 'Grade 10A', teacher: 'Ato Solomon', students: 45 },
  { id: 'C2', name: 'Grade 9B', teacher: 'W/ro Selam', students: 42 },
];

export const mockFinances = {
  totalRevenue: 1250000,
  pendingFees: 45000,
  recentTransactions: [
    { id: 'TX1', student: 'Abebe Bikila', amount: 5000, type: 'Registration', date: '2026-04-10', verifiedBy: 'Ato Solomon (Finance Clerk)' },
    { id: 'TX2', student: 'Sara Kebede', amount: 5000, type: 'Registration', date: '2026-04-11', verifiedBy: 'W/ro Selam (Finance Clerk)' },
    { id: 'TX3', student: 'Dawit Lema', amount: 6500, type: 'Monthly Fee', date: '2026-04-12', verifiedBy: 'Ato Girma (Auto-verify)' },
  ],
  summaries: [
    { id: 'S1', category: 'Student Fees', description: 'April Student Fee', amount: 450000, count: 1200, type: 'Income', date: '2026-04-01' },
    { id: 'S2', category: 'Staff Payment', description: 'Monthly Salaries', amount: 250000, count: 75, type: 'Expense', date: '2026-04-28' },
    { id: 'S3', category: 'Item Purchase', description: 'Lab Equipment', amount: 35000, count: 12, type: 'Expense', date: '2026-04-15' },
  ]
};

export const mockSchedules = {
  'T1': [
    { day: 'Monday', time: '8:00 AM - 9:30 AM', class: '10A', subject: 'Math' },
    { day: 'Monday', time: '10:00 AM - 11:30 AM', class: '9B', subject: 'Physics' },
    { day: 'Wednesday', time: '8:00 AM - 9:30 AM', class: '10A', subject: 'Math' },
  ],
  'T2': [
    { day: 'Tuesday', time: '9:00 AM - 10:30 AM', class: '11C', subject: 'Biology' },
    { day: 'Thursday', time: '1:00 PM - 2:30 PM', class: '12A', subject: 'Chemistry' },
  ]
};

export const mockGrades = [
  { type: 'Mid-term', weight: '30%', score: 85, total: 100 },
  { type: 'Final Exam', weight: '50%', score: 92, total: 100 },
  { type: 'Assignment', weight: '20%', score: 18, total: 20 },
];

export const studentCurrentCourses = [
  {
    id: 'c1',
    name: 'Mathematics',
    code: 'MATH-10A',
    teacher: 'Dr. Solomon',
    progress: 65,
    grades: {
      quizzes: [{ name: 'Quiz 1', score: 15, total: 20 }, { name: 'Quiz 2', score: null, total: 20 }],
      tests: [{ name: 'Test 1', score: 32, total: 40 }],
      midterm: { name: 'Midterm', score: null, total: 100 },
      assignments: [{ name: 'Assignment 1', score: 18, total: 20 }, { name: 'Assignment 2', score: null, total: 20 }],
      final: { name: 'Final Exam', score: null, total: 100 }
    }
  },
  {
    id: 'c2',
    name: 'Physics',
    code: 'PHYS-10A',
    teacher: 'Dr. Solomon',
    progress: 40,
    grades: {
      quizzes: [{ name: 'Quiz 1', score: 12, total: 20 }],
      tests: [{ name: 'Test 1', score: null, total: 40 }],
      midterm: { name: 'Midterm', score: null, total: 100 },
      assignments: [{ name: 'Assignment 1', score: 15, total: 20 }],
      final: { name: 'Final Exam', score: null, total: 100 }
    }
  },
  {
    id: 'c3',
    name: 'Biology',
    code: 'BIOL-10A',
    teacher: 'W/ro Selam',
    progress: 80,
    grades: {
      quizzes: [{ name: 'Quiz 1', score: 18, total: 20 }, { name: 'Quiz 2', score: 19, total: 20 }],
      tests: [{ name: 'Test 1', score: 38, total: 40 }],
      midterm: { name: 'Midterm', score: 88, total: 100 },
      assignments: [{ name: 'Assignment 1', score: 20, total: 20 }],
      final: { name: 'Final Exam', score: null, total: 100 }
    }
  }
];

export const studentAcademicHistory = [
  {
    year: '2024/2025',
    semester: 'Semester 2',
    gpa: '3.85',
    courses: [
      { name: 'Amharic', grade: 'A', score: 92 },
      { name: 'English', grade: 'A', score: 95 },
      { name: 'Chemistry', grade: 'B+', score: 88 },
      { name: 'Civics', grade: 'A', score: 90 }
    ]
  },
  {
    year: '2024/2025',
    semester: 'Semester 1',
    gpa: '3.72',
    courses: [
      { name: 'Amharic', grade: 'A-', score: 89 },
      { name: 'English', grade: 'A', score: 93 },
      { name: 'General Science', grade: 'B', score: 84 },
      { name: 'Art', grade: 'A+', score: 98 }
    ]
  },
  {
    year: '2023/2024',
    semester: 'Full Year',
    gpa: '3.65',
    courses: [
      { name: 'Grade 9 Mathematics', grade: 'B+', score: 87 },
      { name: 'Grade 9 Physics', grade: 'A-', score: 90 },
      { name: 'Grade 9 Biology', grade: 'A', score: 94 },
      { name: 'Geography', grade: 'B', score: 82 }
    ]
  }
];

export const mockInventory = [
  { id: 'I1', name: 'Microscope', category: 'Lab Equipment', quantity: 15, condition: 'Good', location: 'Science Lab A' },
  { id: 'I2', name: 'Dell Latitude 3420', category: 'IT Assets', quantity: 30, condition: 'New', location: 'Computer Lab 1' },
  { id: 'I3', name: 'Whiteboard Marker (Pack)', category: 'Stationery', quantity: 120, condition: 'Good', location: 'Central Store' },
  { id: 'I4', name: 'Student Desk', category: 'Furniture', quantity: 450, condition: 'Fair', location: 'Main Building' },
];

export const mockLibrary = [
  { id: 'B1', title: 'Calculus: Early Transcendentals', author: 'James Stewart', isbn: '978-0538497909', status: 'Available', shelf: 'Mathematics - Row 1', total: 12, available: 8 },
  { id: 'B2', title: 'Biology: The Core', author: 'Eric Simon', isbn: '978-0134152196', status: 'Borrowed', shelf: 'Science - Row 4', total: 5, available: 0 },
  { id: 'B3', title: 'Principles of Economics', author: 'N. Gregory Mankiw', isbn: '978-1305155915', status: 'Available', shelf: 'Economics - Row 2', total: 8, available: 5 },
  { id: 'B4', title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', isbn: '978-0062316097', status: 'Available', shelf: 'History - Row 3', total: 15, available: 12 },
];

export const mockOverdueLoans = [
  { id: 'L1', studentName: 'Abebe Bikila', bookTitle: 'Calculus: Early Transcendentals', dueDate: '2026-04-05', daysOverdue: 15, studentId: '1' },
  { id: 'L2', studentName: 'Sara Kebede', bookTitle: 'Biology: The Core', dueDate: '2026-04-10', daysOverdue: 10, studentId: '2' },
  { id: 'L3', studentName: 'Biniyam Yosef', bookTitle: 'Principles of Economics', dueDate: '2026-04-12', daysOverdue: 8, studentId: '6' },
];

export const mockEvents = [
  { id: 'E1', title: 'Parent-Teacher Conference', date: '2026-04-15', type: 'Meeting' },
  { id: 'E2', title: 'Annual Sports Day', date: '2026-05-10', type: 'Event' },
  { id: 'E3', title: 'Mid-term Exams Start', date: '2026-05-20', type: 'Academic' },
  { id: 'E4', title: 'Final Graduation Ceremony', date: '2026-06-15', type: 'Ceremony' },
];

export interface GradingMethod {
  id: string;
  label: string;
  maxWeight: number;
}

export const mockGradingConfigs: Record<string, GradingMethod[]> = {
  'default': [
    { id: 'mid', label: 'Mid-Exam', maxWeight: 30 },
    { id: 'final', label: 'Final-Exam', maxWeight: 50 },
    { id: 'quiz', label: 'Quiz', maxWeight: 10 },
    { id: 'assignment', label: 'Assignment', maxWeight: 10 },
  ],
  '10': [
    { id: 'mid', label: 'Mid-Exam', maxWeight: 30 },
    { id: 'final', label: 'Final-Exam', maxWeight: 40 },
    { id: 'quiz', label: 'Quiz', maxWeight: 10 },
    { id: 'classwork', label: 'Class-Work', maxWeight: 10 },
    { id: 'activity', label: 'Class Activity', maxWeight: 10 },
  ],
  '9': [
    { id: 'mid', label: 'Mid-Exam', maxWeight: 25 },
    { id: 'final', label: 'Final-Exam', maxWeight: 50 },
    { id: 'homework', label: 'Home-Work', maxWeight: 15 },
    { id: 'test', label: 'Test', maxWeight: 10 },
  ]
};

export interface CommunicationLog {
  id: string;
  studentId: string;
  weekEnding: string;
  ratings: {
    uniform: number; // 0-3 scale: 0: Needs Improvement, 1: Good, 2: Very Good, 3: Excellent
    materials: number;
    homework: number;
    participation: number;
    conduct: number;
    social: number;
    punctuality: number;
    noteTaking: number;
  };
  teacherNote?: string;
}

export interface WeeklyPlan {
  id: string;
  teacherId: string;
  date: string;
  content: string;
  objectives: string;
  teacherActivity: string;
  time: string;
  studentActivity: string;
  teachingMethod: string;
  teachingAids: string;
  evaluation: string;
  remark: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Revision Required';
  deanFeedback?: string;
  deanRating?: number; // 1-5 stars
}

export const commFields = [
  { id: 'uniform', label: 'Uniform', description: 'Compliance with school dress code' },
  { id: 'materials', label: 'Materials', description: 'Readiness of school tools and books' },
  { id: 'homework', label: 'Homework', description: 'Completion and accuracy of home assignments' },
  { id: 'participation', label: 'Participation', description: 'Active engagement in classroom lessons' },
  { id: 'conduct', label: 'Conduct', description: 'General behavior and ethical standing' },
  { id: 'social', label: 'Social', description: 'Interaction and cooperation with other students' },
  { id: 'punctuality', label: 'Punctuality', description: 'Arriving at and leaving school on time' },
  { id: 'noteTaking', label: 'Note-taking', description: 'Quality of notebook handling and writing' },
];

export const ratingLabels = ['Needs Improvement', 'Good', 'Very Good', 'Excellent'];

export const mockCommunicationLogs: CommunicationLog[] = [
  {
    id: 'L1',
    studentId: '1',
    weekEnding: '2026-05-24',
    ratings: {
      uniform: 3,
      materials: 3,
      homework: 2,
      participation: 3,
      conduct: 3,
      social: 2,
      punctuality: 3,
      noteTaking: 3
    },
    teacherNote: "Abebe has shown great improvement in his participation this week. He is always ready with his materials."
  },
  {
    id: 'L2',
    studentId: '1',
    weekEnding: '2026-05-17',
    ratings: {
      uniform: 2,
      materials: 3,
      homework: 3,
      participation: 2,
      conduct: 3,
      social: 3,
      punctuality: 2,
      noteTaking: 3
    },
    teacherNote: "Strong academic focus on homework completion. Needs to ensure uniform compliance every day."
  },
  {
    id: 'L3',
    studentId: '2',
    weekEnding: '2026-05-24',
    ratings: {
      uniform: 3,
      materials: 2,
      homework: 2,
      participation: 3,
      conduct: 3,
      social: 3,
      punctuality: 3,
      noteTaking: 2
    }
  }
];

export const mockWeeklyPlans: WeeklyPlan[] = [
  {
    id: 'P1',
    teacherId: 'T1',
    date: '2026-05-24',
    content: 'Mathematics: Quadratic Equations',
    objectives: 'Solve complex quadratic equations using various methods.',
    teacherActivity: 'Explaining the quadratic formula and its derivation.',
    time: '45 mins',
    studentActivity: 'Solving practice problems on the board.',
    teachingMethod: 'Interactive lectures and group problem-solving.',
    teachingAids: 'Textbook, GeoGebra, Digital Whiteboard',
    evaluation: 'Short quiz and classroom activity performance.',
    remark: 'Students need more practice with factoring.',
    status: 'Approved',
    deanRating: 5,
    deanFeedback: 'Excellent integration with Physics.'
  },
  {
    id: 'P2',
    teacherId: 'T2',
    date: '2026-05-24',
    content: 'Biology: Cell Division',
    objectives: 'Understand Mitosis and Meiosis.',
    teacherActivity: 'Demonstrating microscope use and slide preparation.',
    time: '60 mins',
    studentActivity: 'Observing slides and drawing cell stages.',
    teachingMethod: 'Lab experiments and microscopy.',
    teachingAids: 'Microscopes, prepared slides, wall charts',
    evaluation: 'Lab report and diagram accuracy check.',
    remark: 'Practical sessions were very engaging.',
    status: 'Pending'
  }
];
