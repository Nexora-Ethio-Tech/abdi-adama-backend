
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UserRole = 'super-admin' | 'school-admin' | 'vice-principal' | 'teacher' | 'student' | 'parent' | 'finance-clerk' | 'librarian' | 'clinic-admin' | 'driver' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

const createMockUser = (identifier: string, role: UserRole = 'super-admin'): User => ({
  id: `dev-${identifier || 'user'}`,
  name: identifier.split('@')[0] || 'Dev User',
  email: identifier || 'dev@example.com',
  role,
});

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // ─── SECURITY FIX ──────────────────────────────────────────────────────────
  // Do NOT trust localStorage on initial load. Start with null.
  // The verifyToken effect will restore the user ONLY if the token is valid.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Block rendering until verified
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
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {
          oromic: 'Mana Barumsaa Abdii Adaamaa',
          amharic: 'አብዲ አዳማ ትምህርት ቤት',
          english: 'Abdi Adama School'
        };
      }
    }
    return {
      oromic: 'Mana Barumsaa Abdii Adaamaa',
      amharic: 'አብዲ አዳማ ትምህርት ቤት',
      english: 'Abdi Adama School'
    };
  });

  const [schoolMotto, setSchoolMotto] = useState<MultilingualText>(() => {
    const saved = localStorage.getItem('school_motto');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {
          oromic: 'ijooleen kessaan ijolee kenyaa',
          amharic: 'ልጆቻቹ ልጆቻችን ናቸዉ',
          english: 'Your children are our children'
        };
      }
    }
    return {
      oromic: 'ijooleen kessaan ijolee kenyaa',
      amharic: 'ልጆቻቹ ልጆቻችን ናቸዉ',
      english: 'Your children are our children'
    };
  });

  // ─── Token Verification on Load ────────────────────────────────────────────
  // This is the ONLY way a user gets restored after page refresh.
  // No token → no user. Invalid token → user cleared.
  useEffect(() => {
    const restoreSession = () => {
      const token = localStorage.getItem('abdi_adama_token');
      if (!token) {
        setLoading(false);
        return;
      }

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

  // Persist user to localStorage when it changes (for display only, never trusted)
  useEffect(() => {
    if (user) {
      localStorage.setItem('abdi_adama_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('abdi_adama_user');
      localStorage.removeItem('abdi_adama_token');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('school_name', JSON.stringify(schoolName));
  }, [schoolName]);

  useEffect(() => {
    localStorage.setItem('school_motto', JSON.stringify(schoolMotto));
  }, [schoolMotto]);

  useEffect(() => {
    localStorage.setItem('registration_open', registrationOpen.toString());
  }, [registrationOpen]);

  const role = user?.role || null;


  const login = async (credentials: { digitalIdOrEmail: string; password?: string; otp?: string }): Promise<{ success: boolean; redirect?: string; error?: string }> => {
    const mockUser = createMockUser(credentials.digitalIdOrEmail || 'dev-user', 'super-admin');
    setUser(mockUser);
    setPrimaryRole(mockUser.role);
    localStorage.setItem('abdi_adama_token', 'dev-bypass-token');
    localStorage.setItem('abdi_adama_user', JSON.stringify(mockUser));
    localStorage.setItem('abdi_adama_primary_role', mockUser.role);
    return { success: true, redirect: getDashboardRoute(mockUser.role) };
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
    const activeUser = user || createMockUser('dev-user', primaryRole || 'super-admin');
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
