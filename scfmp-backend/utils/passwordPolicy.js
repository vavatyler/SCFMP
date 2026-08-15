const PASSWORD_MIN_LENGTH = 8;

const validatePasswordStrength = (password) => {
  const value = String(password || '');
  if (value.length < PASSWORD_MIN_LENGTH) return 'Password must be at least 8 characters';
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    return 'Password must include uppercase, lowercase, and a number';
  }
  return null;
};

module.exports = { PASSWORD_MIN_LENGTH, validatePasswordStrength };
