// ─── Role Enum ─────────────────────────────────────────────────────────────
export type UserRole = 'Student' | 'Parent' | 'Driver' | 'Librarian' | 'ClinicAdmin';

export const STAFF_ROLES: UserRole[] = ['Driver', 'Librarian', 'ClinicAdmin'];
export const SHARED_IDENTITY_ROLES: UserRole[] = ['Student', 'Parent'];
export const ALL_ROLES: UserRole[] = [...SHARED_IDENTITY_ROLES, ...STAFF_ROLES];

// ─── Identity / User Row Shapes ─────────────────────────────────────────────
export interface SiloIdentity {
  id: string;
  school_id: string;
  full_name: string;
  created_at: Date;
}

export interface SiloUser {
  id: string;
  identity_id: string;
  role: UserRole;
  password_hash: string;
  is_active: boolean;
  created_at: Date;
}

// ─── Request Bodies ──────────────────────────────────────────────────────────
export interface CreateUserBody {
  fullName: string;
  role: UserRole;
  /** Optional: custom 6-digit plain password for the primary role */
  password?: string;
  /** Optional: custom 6-digit plain password for the auto-created Parent (Student role only) */
  parentPassword?: string;
}

export interface LoginBody {
  school_id: string;
  password: string;
  role: UserRole;
}

// ─── JWT Payload ─────────────────────────────────────────────────────────────
export interface JwtPayload {
  user_id: string;
  identity_id: string;
  school_id: string;
  role: UserRole;
}
