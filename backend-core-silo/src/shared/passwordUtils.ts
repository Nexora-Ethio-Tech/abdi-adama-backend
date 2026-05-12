import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Generates a random 4-digit PIN as a string.
 */
export const generate4DigitPIN = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Hash a plain-text password.
 * Passwords are 4-digit pins but we still run them through bcrypt for safety.
 */
export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

/**
 * Compare a plain-text attempt against a stored bcrypt hash.
 */
export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};

/**
 * Validate that a password is exactly 4 digits.
 */
export const isValidPin = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};
