import { UserRole } from '../types';

export const USER_ROLES = UserRole;

export const USER_STATUS = {
  PENDING: 'Pending' as const,
  APPROVED: 'Approved' as const,
  REVOKED: 'Revoked' as const
};

export const SUPER_ADMIN_ONLY_ROLES: UserRole[] = [
  UserRole.SCHOOL_ADMIN,
  UserRole.VICE_PRINCIPAL,
  UserRole.AUDITOR
];

export const SCHOOL_ADMIN_CREATABLE_ROLES: UserRole[] = [
  UserRole.TEACHER,
  UserRole.STUDENT,
  UserRole.PARENT,
  UserRole.FINANCE_CLERK,
  UserRole.LIBRARIAN,
  UserRole.CLINIC_ADMIN,
  UserRole.DRIVER
];

export const DIGITAL_ID_PREFIX: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'SA',
  [UserRole.SCHOOL_ADMIN]: 'ADM',
  [UserRole.VICE_PRINCIPAL]: 'VP',
  [UserRole.TEACHER]: 'TCH',
  [UserRole.STUDENT]: 'STD',
  [UserRole.PARENT]: 'PRT',
  [UserRole.FINANCE_CLERK]: 'FIN',
  [UserRole.LIBRARIAN]: 'LIB',
  [UserRole.CLINIC_ADMIN]: 'CLN',
  [UserRole.DRIVER]: 'DRV',
  [UserRole.AUDITOR]: 'AUD'
};

export const BRANCH_CODES: Record<string, string> = {
  'Main Branch': 'MB',
  'Bole Branch': 'BL',
  'Megenagna Branch': 'MG',
  'Adama Branch': 'AD'
};
