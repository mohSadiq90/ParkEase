/**
 * Client-side mirror of backend PasswordPolicyValidator (KD-SL-17).
 * Server remains authoritative.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * @param {string} password
 * @returns {string|null} first validation error message, or null if ok
 */
export function validatePasswordPolicy(password) {
  if (!password) return 'Password is required';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > 100) return 'Password must not exceed 100 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit';
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
}

export const PASSWORD_POLICY_HINT =
  'At least 8 characters, with uppercase, lowercase, a digit, and a special character';
