import { UserRole, STAFF_ROLES } from './types';

/**
 * Generate a human-readable school_id.
 *
 * Format:
 *   Students/Parents  →  STU-XXXXXX   (shared)
 *   Driver            →  DRV-XXXXXX
 *   Librarian         →  LIB-XXXXXX
 *   ClinicAdmin       →  CLN-XXXX
 *
 * Where XXXX is a zero-padded random 4-digit number.
 */

const PREFIXES: Record<UserRole, string> = {
  Student:    'STU',
  Parent:     'STU', // Parents share the STU prefix — same identity as Student
  Driver:     'DRV',
  Librarian:  'LIB',
  ClinicAdmin: 'CLN',
  Teacher:    'TCH',
  Admin:      'ADM',
};

const pad = (n: number, width: number) => String(n).padStart(width, '0');

export const generateSchoolId = (role: UserRole): string => {
  const prefix = PREFIXES[role];
  const number = Math.floor(Math.random() * 9999);
  return `${prefix}-${pad(number, 4)}`;
};

/**
 * Returns true for roles that share one identity between Student and Parent.
 */
export const isSharedIdentityRole = (role: UserRole): boolean => {
  return role === 'Student' || role === 'Parent';
};

/**
 * Returns true for standalone staff roles.
 */
export const isStaffRole = (role: UserRole): boolean => {
  return STAFF_ROLES.includes(role);
};
