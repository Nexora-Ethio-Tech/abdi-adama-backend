import { UserRole } from '../types';

export const normalizeRole = (role: string | null | undefined): UserRole | null => {
  if (!role) return null;
  let r = role.toString().toLowerCase().trim();
  r = r.replace(/[_\s]+/g, '-');

  const roleMap: Record<string, UserRole> = {
    'clinicadmin': UserRole.CLINIC_ADMIN,
    'clinic-admin': UserRole.CLINIC_ADMIN,
    'financeadmin': UserRole.FINANCE_CLERK,
    'finance-admin': UserRole.FINANCE_CLERK,
    'finance-clerk': UserRole.FINANCE_CLERK,
    'finance_clerk': UserRole.FINANCE_CLERK,
    'viceprincipal': UserRole.VICE_PRINCIPAL,
    'vice-principal': UserRole.VICE_PRINCIPAL,
    'vice_principal': UserRole.VICE_PRINCIPAL,
    'schooladmin': UserRole.SCHOOL_ADMIN,
    'school-admin': UserRole.SCHOOL_ADMIN,
    'school_admin': UserRole.SCHOOL_ADMIN,
    'superadmin': UserRole.SUPER_ADMIN,
    'super-admin': UserRole.SUPER_ADMIN,
    'super_admin': UserRole.SUPER_ADMIN,
    'audit': UserRole.AUDITOR,
    'auditor': UserRole.AUDITOR,
    'driver': UserRole.DRIVER,
    'librarian': UserRole.LIBRARIAN,
    'teacher': UserRole.TEACHER,
    'student': UserRole.STUDENT,
    'parent': UserRole.PARENT
  };

  return roleMap[r] || (r as UserRole);
};
