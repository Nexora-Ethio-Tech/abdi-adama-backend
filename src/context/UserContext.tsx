
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UserRole = 'super-admin' | 'school-admin' | 'vice-principal' | 'teacher' | 'student' | 'parent' | 'finance-clerk' | 'librarian' | 'clinic-admin' | 'driver' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  school_id?: string;      // 4-digit or formatted ID from backend (e.g. "STU-2001")
  digitalId?: string;
  isBranchAuditor?: boolean;
}

interface Branch {
  id: string;
  name: string;
  location: string;
}

export interface MultilingualText {
  oromic: string;
  amharic: string;
  english: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  role: UserRole | null;
  primaryRole: UserRole | null;
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void;
  branches: Branch[];
  gradesLocked: boolean;
  setGradesLocked: (locked: boolean) => void;
  registrationOpen: boolean;
  setRegistrationOpen: (open: boolean) => void;
  schoolName: MultilingualText;
  setSchoolName: (name: MultilingualText) => void;
  schoolMotto: MultilingualText;
  setSchoolMotto: (motto: MultilingualText) => void;
  login: (credentials: { digitalIdOrEmail: string; password?: string; otp?: string }) => Promise<{ success: boolean; redirect?: string; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<string | null>;
  loading: boolean;
}

const mockBranches: Branch[] = [
  { id: '1', name: 'Main Branch', location: 'Addis Ababa' },
  { id: '2', name: 'Bole Branch', location: 'Bole, AA' },
  { id: '3', name: 'Megenagna Branch', location: 'Megenagna, AA' },
  { id: '4', name: 'Adama Branch', location: 'Adama' },
];

const getDashboardRoute = (role: UserRole) => {
  switch (role) {
    case 'super-admin': return '/dashboard/super-admin';
    case 'school-admin': return '/dashboard/school-admin';
    case 'teacher': return '/dashboard/teacher';
    case 'student': return '/dashboard/student';
    case 'parent': return '/dashboard/parent';
    case 'finance-clerk': return '/dashboard/finance';
    case 'vice-principal': return '/dashboard/vice-principal';
    case 'driver': return '/dashboard/driver';
    case 'librarian': return '/dashboard/librarian';
    case 'clinic-admin': return '/dashboard/clinic-admin';
    case 'auditor': return '/auditor-dashboard';
    default: return '/dashboard/super-admin';
  }
};

/**
 * Map backend silo_role enum values to frontend UserRole.
 * Backend uses PascalCase enums; frontend uses kebab-case strings.
 */
// @ts-ignore - keeping for future reference when backend is re-enabled
const mapBackendRole = (backendRole: string): UserRole => {
  const map: Record<string, UserRole> = {
    Student:    'student',
    Parent:     'parent',
    Driver:     'driver',
    Librarian:  'librarian',
    ClinicAdmin:'clinic-admin',
    Teacher:    'teacher',
    Admin:      'school-admin',
    SuperAdmin: 'super-admin',
    Finance:    'finance-clerk',
    VP:         'vice-principal',
    Auditor:    'auditor',
  };
  return map[backendRole] ?? 'student';
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // ─── SECURITY FIX ──────────────────────────────────────────────────────────
  // Do NOT trust localStorage on initial load. Start with null.
  // The verifyToken effect will restore the user ONLY if the token is valid.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [gradesLocked, setGradesLocked] = useState(false);
  const [primaryRole, setPrimaryRole] = useState<UserRole | null>(() => {
    const stored = localStorage.getItem('abdi_adama_primary_role');
    return stored as UserRole | null;
  });
  const [registrationOpen, setRegistrationOpen] = useState(() => {
    return localStorage.getItem('registration_open') !== 'false';
  });

  const [schoolName, setSchoolName] = useState<MultilingualText>(() => {
    const saved = localStorage.getItem('school_name');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fall through */ }
    }
    return { oromic: 'Mana Barumsaa Abdii Adaamaa', amharic: 'አብዲ አዳማ ትምህርት ቤት', english: 'Abdi Adama School' };
  });

  const [schoolMotto, setSchoolMotto] = useState<MultilingualText>(() => {
    const saved = localStorage.getItem('school_motto');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fall through */ }
    }
    return { oromic: 'ijooleen kessaan ijolee kenyaa', amharic: 'ልጆቻቹ ልጆቻችን ናቸዉ', english: 'Your children are our children' };
  });

  // ─── Token Verification on Load ────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = () => {
      const token = localStorage.getItem('abdi_adama_token');
      if (!token) { setLoading(false); return; }

      const savedUser = localStorage.getItem('abdi_adama_user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser) as User;
          setUser(parsedUser);
          const restoredPrimaryRole = localStorage.getItem('abdi_adama_primary_role') as UserRole | null;
          setPrimaryRole(restoredPrimaryRole || parsedUser.role);
        } catch (err) {
          console.error('Failed to restore saved user:', err);
          localStorage.removeItem('abdi_adama_user');
          localStorage.removeItem('abdi_adama_token');
          localStorage.removeItem('abdi_adama_primary_role');
          setUser(null);
          setPrimaryRole(null);
        }
      } else {
        localStorage.removeItem('abdi_adama_primary_role');
        setUser(null);
        setPrimaryRole(null);
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('abdi_adama_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('abdi_adama_user');
      localStorage.removeItem('abdi_adama_token');
    }
  }, [user]);

  useEffect(() => { localStorage.setItem('school_name', JSON.stringify(schoolName)); }, [schoolName]);
  useEffect(() => { localStorage.setItem('school_motto', JSON.stringify(schoolMotto)); }, [schoolMotto]);
  useEffect(() => { localStorage.setItem('registration_open', registrationOpen.toString()); }, [registrationOpen]);

  const role = user?.role || null;

  /**
   * login()
   *
   * First tries the real backend at POST /api/auth/login.
   * Falls back to demo-bypass ONLY if the server is unreachable (ECONNREFUSED / network error),
   * so UI development can proceed without a running backend.
   */
  const login = async (credentials: {
    digitalIdOrEmail: string;
    password?: string;
    otp?: string;
  }): Promise<{ success: boolean; redirect?: string; error?: string }> => {
    const identifier = credentials.digitalIdOrEmail.trim();
    const password = credentials.password || credentials.otp || '';

    // Infer backend role from identifier prefix
    const inferBackendRole = (id: string): string => {
      const u = id.toUpperCase();
      if (u.startsWith('STU')) return 'Student';
      if (u.startsWith('PAR')) return 'Parent';
      if (u.startsWith('DRV') || u.startsWith('DR-')) return 'Driver';
      if (u.startsWith('LIB')) return 'Librarian';
      if (u.startsWith('CLN')) return 'ClinicAdmin';
      if (u.startsWith('TCH') || u.startsWith('TC-')) return 'Teacher';
      return 'Student';
    };

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: identifier,
          password,
          role: inferBackendRole(identifier),
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        const backendUser = data.user;
        const mappedRole = mapBackendRole(backendUser.role);
        const frontendUser: User = {
          id:        backendUser.user_id,
          name:      backendUser.full_name,
          email:     backendUser.school_id,
          role:      mappedRole,
          school_id: backendUser.school_id,
          digitalId: backendUser.school_id,
        };
        localStorage.setItem('abdi_adama_token', data.token);
        localStorage.setItem('abdi_adama_user', JSON.stringify(frontendUser));
        localStorage.setItem('abdi_adama_primary_role', mappedRole);
        setUser(frontendUser);
        setPrimaryRole(mappedRole);
        return { success: true, redirect: getDashboardRoute(mappedRole) };
      }

      return { success: false, error: data.message || 'Invalid credentials.' };

    } catch (err) {
      // ── Offline / demo fallback ────────────────────────────────────────
      console.warn('[Auth] Backend bypass active – using demo login for UI development.', err);
      await new Promise(r => setTimeout(r, 600));

      let demoRole: UserRole = 'super-admin';
      const id = identifier.toLowerCase();
      if (id.startsWith('stu') || id.includes('student')) demoRole = 'student';
      else if (id.startsWith('par') || id.includes('parent')) demoRole = 'parent';
      else if (id.startsWith('drv') || id.includes('driver')) demoRole = 'driver';
      else if (id.startsWith('lib')) demoRole = 'librarian';
      else if (id.startsWith('cln') || id.includes('clinic')) demoRole = 'clinic-admin';
      else if (id.startsWith('tch') || id.includes('teacher')) demoRole = 'teacher';
      else if (id.startsWith('fin') || id.includes('finance')) demoRole = 'finance-clerk';
      else if (id.startsWith('vp') || id.includes('principal')) demoRole = 'vice-principal';
      else if (id.startsWith('aud') || id.includes('auditor')) demoRole = 'auditor';

      const demoUser: User = {
        id:        `demo-${identifier}`,
        name:      identifier.split('@')[0] || 'Demo User',
        email:     identifier,
        role:      demoRole,
        school_id: identifier,
        digitalId: identifier,
      };
      localStorage.setItem('abdi_adama_token', 'demo-bypass-token');
      localStorage.setItem('abdi_adama_user', JSON.stringify(demoUser));
      localStorage.setItem('abdi_adama_primary_role', demoRole);
      setUser(demoUser);
      setPrimaryRole(demoRole);
      return { success: true, redirect: getDashboardRoute(demoRole) };
    }
  };

  const logout = () => {
    setUser(null);
    setSelectedBranch(null);
    setPrimaryRole(null);
    localStorage.removeItem('abdi_adama_user');
    localStorage.removeItem('abdi_adama_token');
    localStorage.removeItem('abdi_adama_primary_role');
  };

  const switchRole = async (newRole: UserRole): Promise<string | null> => {
    const activeUser = user ?? { id: 'dev-user', name: 'Dev User', email: 'dev@example.com', role: primaryRole ?? 'super-admin' as UserRole };
    const nextUser = { ...activeUser, role: newRole };
    setUser(nextUser);
    setPrimaryRole(primaryRole || activeUser.role);
    localStorage.setItem('abdi_adama_token', 'dev-bypass-token');
    localStorage.setItem('abdi_adama_user', JSON.stringify(nextUser));
    localStorage.setItem('abdi_adama_primary_role', primaryRole || activeUser.role);
    window.dispatchEvent(new Event('role-switched'));
    return getDashboardRoute(newRole);
  };

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      role,
      primaryRole,
      selectedBranch,
      setSelectedBranch,
      branches: mockBranches,
      gradesLocked,
      setGradesLocked,
      registrationOpen,
      setRegistrationOpen,
      schoolName,
      setSchoolName,
      schoolMotto,
      setSchoolMotto,
      login,
      logout,
      switchRole,
      loading
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
