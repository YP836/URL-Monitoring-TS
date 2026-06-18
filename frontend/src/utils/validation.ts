const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return BASIC_EMAIL_PATTERN.test(value.trim());
}
