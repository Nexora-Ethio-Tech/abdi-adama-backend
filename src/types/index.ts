import { Request } from 'express';

export enum UserRole {
  SUPER_ADMIN = 'super-admin',
  SCHOOL_ADMIN = 'school-admin',
  VICE_PRINCIPAL = 'vice-principal',
  TEACHER = 'teacher',
  STUDENT = 'student',
  PARENT = 'parent',
  FINANCE_CLERK = 'finance-clerk',
  LIBRARIAN = 'librarian',
  CLINIC_ADMIN = 'clinic-admin',
  DRIVER = 'driver',
  AUDITOR = 'auditor'
}

export enum UserStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REVOKED = 'Revoked'
}

export interface User {
  id: string;
  digital_id: string;
  username: string;
  name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  branch_id: string | null;
  status: UserStatus;
  is_active: boolean;
  is_branch_auditor: boolean;
  created_at: Date;
  updated_at: Date;
  branch_name?: string;
}

export interface JWTPayload {
  userId: string;
  digitalId: string;
  role: UserRole;
  branchId: string | null;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
  password?: string;
  username?: string;
  grade?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserStatusDTO {
  status: UserStatus;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  count?: number;
}

export interface UserFilters {
  role?: UserRole;
  branchId?: string;
  status?: UserStatus;
}

export interface CreateUserResult {
  user: User;
  temporaryPassword: string | null;
}
