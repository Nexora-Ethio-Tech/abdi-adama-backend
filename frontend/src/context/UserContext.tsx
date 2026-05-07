
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
  switchRole: (role: UserRole) => void;
  loading: boolean;
}

const mockBranches: Branch[] = [
  { id: '1', name: 'Main Branch', location: 'Addis Ababa' },
  { id: '2', name: 'Bole Branch', location: 'Bole, AA' },
  { id: '3', name: 'Megenagna Branch', location: 'Megenagna, AA' },
  { id: '4', name: 'Adama Branch', location: 'Adama' },
];

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // ─── SECURITY FIX ──────────────────────────────────────────────────────────
  // Do NOT trust localStorage on initial load. Start with null.
  // The verifyToken effect will restore the user ONLY if the token is valid.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Block rendering until verified
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [gradesLocked, setGradesLocked] = useState(false);
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
    const verifyToken = async () => {
      const token = localStorage.getItem('abdi_adama_token');
      if (!token) {
        // No token at all — clear any stale user data and stop loading
        localStorage.removeItem('abdi_adama_user');
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('abdi_adama_user', JSON.stringify(data.user));
        } else {
          // Token expired or invalid — force logout
          localStorage.removeItem('abdi_adama_user');
          localStorage.removeItem('abdi_adama_token');
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to verify token:', err);
        // Network error — clear session to be safe
        localStorage.removeItem('abdi_adama_user');
        localStorage.removeItem('abdi_adama_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
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
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: credentials.digitalIdOrEmail,
          password: credentials.password
        })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('abdi_adama_token', data.token);
        setUser(data.user);
        return { success: true, redirect: data.redirect };
      }
      return { success: false, error: data.error || 'Invalid credentials' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Unable to connect to server' };
    }
  };

  const logout = () => {
    setUser(null);
    setSelectedBranch(null);
    localStorage.removeItem('abdi_adama_user');
    localStorage.removeItem('abdi_adama_token');
  };

  const switchRole = async (newRole: UserRole) => {
    try {
      const token = localStorage.getItem('abdi_adama_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/switch-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newRole })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('abdi_adama_token', data.token);
        setUser(data.user);
        // Dispatch event for components that need to know
        window.dispatchEvent(new Event('role-switched'));
      } else {
        console.error('Failed to switch role:', data.error);
      }
    } catch (err) {
      console.error('Error switching role:', err);
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      role,
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
