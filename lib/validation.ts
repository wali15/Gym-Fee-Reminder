/**
 * Validation utilities for the Gym Fee Reminder app.
 * Contains reusable validation functions for common data types.
 *
 * All validation functions return boolean values indicating whether the input
 * meets the specified criteria. They are designed to be pure functions with
 * no side effects.
 */

/**
 * Validates an email address format.
 *
 * @param email - The email string to validate
 * @returns true if the email is valid, false otherwise
 *
 * @example
 *   isValidEmail('user@example.com') // true
 *   isValidEmail('invalid-email') // false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // Basic but reasonable email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a phone number format.
 * Accepts digits, spaces, hyphens, parentheses, and plus sign.
 *
 * @param phone - The phone string to validate
 * @returns true if the phone number appears valid, false otherwise
 *
 * @example
 *   isValidPhoneNumber('+1-555-123-4567') // true
 *   isValidPhoneNumber('123') // false
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if we have a reasonable number of digits
  // Most phone numbers are between 7-15 digits
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

/**
 * Validates that a value is a positive number.
 *
 * @param value - The value to validate (can be number or string)
 * @returns true if the value is a positive number, false otherwise
 *
 * @example
 *   isPositiveNumber(5) // true
 *   isPositiveNumber('-3') // false
 *   isPositiveNumber(0) // false
 */
export function isPositiveNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && value > 0 && isFinite(value);
  }

  if (typeof value === 'string') {
    const num = Number(value);
    return !isNaN(num) && num > 0 && isFinite(num);
  }

  return false;
}

/**
 * Validates that a value is a valid date string in YYYY-MM-DD format.
 *
 * @param dateStr - The date string to validate
 * @returns true if the date is valid, false otherwise
 *
 * @example
 *   isValidDate('2023-12-31') // true
 *   isValidDate('2023-13-01') // false
 *   isValidDate('not-a-date') // false
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;

  // Basic format check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const date = new Date(dateStr);
  // Check if it's a valid date and not invalid
  // Additionally check that the date components match the input to catch cases like 2023-02-30
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const [inputYear, inputMonth, inputDay] = dateStr.split('-').map(Number);

  return !isNaN(date.getTime()) &&
         year === inputYear &&
         month === inputMonth - 1 && // Month is 0-indexed in JS Date
         day === inputDay;
}

/**
 * Validates that an hour is in the valid range (0-23).
 *
 * @param hour - The hour to validate
 * @returns true if the hour is valid, false otherwise
 *
 * @example
 *   isValidHour(9) // true
 *   isValidHour(25) // false
 *   isValidHour(-1) // false
 */
export function isValidHour(hour: unknown): boolean {
  if (typeof hour !== 'number' || !isFinite(hour)) return false;
  return Number.isInteger(hour) && hour >= 0 && hour <= 23;
}

/**
 * Validates that a days-before value is in a reasonable range (0-31).
 *
 * @param days - The days value to validate
 * @returns true if the days value is valid, false otherwise
 *
 * @example
 *   isValidDaysBefore(7) // true
 *   isValidDaysBefore(32) // false
 *   isValidDaysBefore(-1) // false
 */
export function isValidDaysBefore(days: unknown): boolean {
  if (typeof days !== 'number' || !isFinite(days)) return false;
  return Number.isInteger(days) && days >= 0 && days <= 31;
}

/**
 * Validates that a currency code is valid (basic ISO 4217 check).
 *
 * @param currency - The currency code to validate
 * @returns true if the currency code appears valid, false otherwise
 *
 * @example
 *   isValidCurrency('USD') // true
 *   isValidCurrency('usd') // false
 *   isValidCurrency('US') // false
 */
export function isValidCurrency(currency: string): boolean {
  if (!currency || typeof currency !== 'string') return false;
  // Basic check: 3 uppercase letters
  return /^[A-Z]{3}$/.test(currency);
}

/**
 * Validates that a language code is valid (basic ISO 639-1 check).
 *
 * @param lang - The language code to validate
 * @returns true if the language code appears valid, false otherwise
 *
 * @example
 *   isValidLanguageCode('en') // true
 *   isValidLanguageCode('EN') // false
 *   isValidLanguageCode('english') // false
 */
export function isValidLanguageCode(lang: string): boolean {
  if (!lang || typeof lang !== 'string') return false;
  // Basic check: 2 lowercase letters (ISO 639-1)
  return /^[a-z]{2}$/.test(lang);
}

/**
 * Validates that a string is not empty after trimming.
 *
 * @param value - The string to validate
 * @returns true if the string is non-empty, false otherwise
 *
 * @example
 *   isNonEmptyString('hello') // true
 *   isNonEmptyString('') // false
 *   isNonEmptyString('   ') // false
 */
export function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}
/**
 * Validates that a port number is in the valid range (1-65535).
 *
 * @param port - The port number to validate
 * @returns true if the port is valid, false otherwise
 *
 * @example
 *   isValidPort(80) // true
 *   isValidPort(65535) // true
 *   isValidPort(0) // false
 *   isValidPort(65536) // false
 */
export function isValidPort(port: unknown): boolean {
  if (typeof port !== 'number' || !isFinite(port)) return false;
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}
