/**
 * Phone Number Validation and Formatting Utility
 * Handles Ethiopian phone numbers with country code +251
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  error?: string;
}

/**
 * Validate and normalize Ethiopian phone numbers
 * Accepts formats:
 * - 9xxxxxxxx
 * - 7xxxxxxxx
 * - 09xxxxxxxx
 * - 07xxxxxxxx
 * - +2519xxxxxxxx
 * - +2517xxxxxxxx
 * - +251-9-xxxxxxxx (with separators)
 */
export function validateAndFormatPhoneNumber(
  phoneInput: string
): PhoneValidationResult {
  // Remove all whitespace and common separators
  let phone = (phoneInput || '').trim().replace(/[\s\-().]/g, '');

  // If empty, return error
  if (!phone) {
    return {
      isValid: false,
      formatted: '',
      error: 'Phone number is required',
    };
  }

  // Handle +251 prefix
  if (phone.startsWith('+251')) {
    phone = phone.substring(4); // Remove +251
  } else if (phone.startsWith('251')) {
    phone = phone.substring(3); // Remove 251
  }

  // Handle 0 prefix (old format)
  if (phone.startsWith('0')) {
    phone = phone.substring(1);
  }

  // Check if starts with 9 or 7 (valid Ethiopian prefixes)
  if (!phone.match(/^[97]\d{7}$/)) {
    return {
      isValid: false,
      formatted: '',
      error: 'Phone number must start with 9 or 7 and contain 8 digits after that',
    };
  }

  // Format with country code
  const formatted = `+251${phone}`;

  return {
    isValid: true,
    formatted,
  };
}

/**
 * Validate required fields in registration form
 */
export interface RegistrationValidationErrors {
  [key: string]: string;
}

export interface RegistrationFormData {
  name?: string;
  digital_id?: string;
  dob?: string;
  gender?: string;
  email?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  previousSchool?: string;
  grade?: string;
  feeStatus?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  medications?: string;
}

export function validateRegistrationForm(
  formData: RegistrationFormData
): { isValid: boolean; errors: RegistrationValidationErrors } {
  const errors: RegistrationValidationErrors = {};

  // Required fields
  const requiredFields = {
    name: 'Full Name',
    digital_id: 'Fayda Alias Number (Digital ID)',
    dob: 'Date of Birth',
    gender: 'Gender',
    parentName: 'Parent/Guardian Name',
    address: 'Address',
    grade: 'Grade Applying For',
    feeStatus: 'Registration Fee Status',
    previousSchool: 'Previous School',
    parentPhone: 'Parent Phone Number',
  };

  // Check required fields
  for (const [field, label] of Object.entries(requiredFields)) {
    const value = (formData as any)[field];
    if (!value || (typeof value === 'string' && !value.trim())) {
      errors[field] = `${label} is required`;
    }
  }

  // Validate email if provided
  if (formData.email && !isValidEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Validate date of birth
  if (formData.dob) {
    const dobDate = new Date(formData.dob);
    const today = new Date();
    const age = today.getFullYear() - dobDate.getFullYear();

    if (age < 5 || age > 30) {
      errors.dob = 'Student age must be between 5 and 30 years old';
    }
  }

  // Validate parent phone
  if (formData.parentPhone) {
    const phoneValidation = validateAndFormatPhoneNumber(formData.parentPhone);
    if (!phoneValidation.isValid) {
      errors.parentPhone = phoneValidation.error || 'Invalid phone number format';
    }
  }

  // Validate digital ID format (basic check)
  if (formData.digital_id && !formData.digital_id.match(/^[A-Z0-9\-]+$/i)) {
    errors.digital_id = 'Digital ID should only contain letters, numbers, and hyphens';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate file size
 */
export function validateFileSize(
  fileSize: number,
  maxSizeMB: number = 2
): { isValid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (fileSize > maxSizeBytes) {
    return {
      isValid: false,
      error: `The file you uploaded is more than ${maxSizeMB}MB. The system only accepts files smaller than ${maxSizeMB}MB.`,
    };
  }

  return { isValid: true };
}
