/**
 * Utility for generating student and parent credentials
 * - Student ID: Unique identifier
 * - Student Password: Temporary secure password
 * - Parent ID: Unique identifier 
 * - Parent Password: Temporary secure password
 */

import * as crypto from 'crypto';

const generateRandomString = (length: number = 12): string => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

const generateRandomNumeric = (length: number = 6): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
};

const generateSecurePassword = (): string => {
  // Format: uppercase + lowercase + number + special char + remaining random
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';

  const password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
    ...generateRandomString(8).split('')
  ];

  // Shuffle the password
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
};

/**
 * Generate Student ID
 * Format: STU-YYYYMMDD-XXXXX
 */
export const generateStudentId = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomPart = generateRandomNumeric(5);
  return `STU-${year}${month}${day}-${randomPart}`;
};

/**
 * Generate Parent ID
 * Format: PAR-YYYYMMDD-XXXXX
 */
export const generateParentId = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomPart = generateRandomNumeric(5);
  return `PAR-${year}${month}${day}-${randomPart}`;
};

/**
 * Generate Student Temporary Password
 */
export const generateStudentPassword = (): string => {
  return generateSecurePassword();
};

/**
 * Generate Parent Temporary Password
 */
export const generateParentPassword = (): string => {
  return generateSecurePassword();
};

/**
 * Generate all credentials for a new student and parent
 */
export const generateCredentials = () => {
  return {
    studentId: generateStudentId(),
    studentPassword: generateStudentPassword(),
    parentId: generateParentId(),
    parentPassword: generateParentPassword(),
    generatedAt: new Date()
  };
};

export default {
  generateStudentId,
  generateParentId,
  generateStudentPassword,
  generateParentPassword,
  generateCredentials
};
