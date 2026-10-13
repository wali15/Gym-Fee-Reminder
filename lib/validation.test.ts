import {
  isValidEmail,
  isValidPhoneNumber,
  isPositiveNumber,
  isValidDate,
  isValidHour,
  isValidDaysBefore,
  isValidCurrency,
  isValidLanguageCode,
  isNonEmptyString
} from './validation'

describe('Validation Library', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('test.email@domain.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('should return false for invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('')).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidEmail(null)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidEmail(undefined)).toBe(false)
    })
  })

  describe('isValidPhoneNumber', () => {
    it('should return true for valid phone numbers', () => {
      expect(isValidPhoneNumber('+1-555-123-4567')).toBe(true)
      expect(isValidPhoneNumber('5551234567')).toBe(true)
      expect(isValidPhoneNumber('(555) 123-4567')).toBe(true)
      expect(isValidPhoneNumber('+91 98765 43210')).toBe(true)
    })

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhoneNumber('123')).toBe(false) // Too short
      expect(isValidPhoneNumber('abc-def-ghij')).toBe(false) // No digits
      expect(isValidPhoneNumber('')).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidPhoneNumber(null)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidPhoneNumber(undefined)).toBe(false)
    })
  })

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true)
      expect(isPositiveNumber(1.5)).toBe(true)
      expect(isPositiveNumber(100)).toBe(true)
      expect(isPositiveNumber('5')).toBe(true)
      expect(isPositiveNumber('3.14')).toBe(true)
    })

    it('should return false for non-positive numbers', () => {
      expect(isPositiveNumber(0)).toBe(false)
      expect(isPositiveNumber(-1)).toBe(false)
      expect(isPositiveNumber('-5')).toBe(false)
      expect(isPositiveNumber('abc')).toBe(false)
      expect(isPositiveNumber('')).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isPositiveNumber(null)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isPositiveNumber(undefined)).toBe(false)
    })
  })

  describe('isValidDate', () => {
    it('should return true for valid dates in YYYY-MM-DD format', () => {
      expect(isValidDate('2023-12-31')).toBe(true)
      expect(isValidDate('2024-02-29')).toBe(true) // Leap year
      expect(isValidDate('2023-06-15')).toBe(true)
    })

    it('should return false for invalid dates', () => {
      expect(isValidDate('2023-13-01')).toBe(false) // Invalid month
      expect(isValidDate('2023-02-30')).toBe(false) // Invalid day
      expect(isValidDate('not-a-date')).toBe(false)
      expect(isValidDate('2023/12/31')).toBe(false) // Wrong format
      expect(isValidDate('')).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidDate(null)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidDate(undefined)).toBe(false)
    })
  })

  describe('isValidHour', () => {
    it('should return true for valid hours (0-23)', () => {
      expect(isValidHour(0)).toBe(true)
      expect(isValidHour(12)).toBe(true)
      expect(isValidHour(23)).toBe(true)
    })

    it('should return false for invalid hours', () => {
      expect(isValidHour(-1)).toBe(false)
      expect(isValidHour(24)).toBe(false)
      expect(isValidHour(25)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidHour('9')).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidHour(null)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidHour(undefined)).toBe(false)
    })
  })

  describe('isValidDaysBefore', () => {
    it('should return true for valid days-before values (0-31)', () => {
      expect(isValidDaysBefore(0)).toBe(true)
      expect(isValidDaysBefore(7)).toBe(true)
      expect(isValidDaysBefore(31)).toBe(true)
    })

    it('should return false for invalid days-before values', () => {
      expect(isValidDaysBefore(-1)).toBe(false)
      expect(isValidDaysBefore(32)).toBe(false)
      expect(isValidDaysBefore(100)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidDaysBefore('5')).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidDaysBefore(null)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidDaysBefore(undefined)).toBe(false)
    })
  })

  describe('isValidCurrency', () => {
    it('should return true for valid currency codes', () => {
      expect(isValidCurrency('USD')).toBe(true)
      expect(isValidCurrency('EUR')).toBe(true)
      expect(isValidCurrency('INR')).toBe(true)
      expect(isValidCurrency('GBP')).toBe(true)
    })

    it('should return false for invalid currency codes', () => {
      expect(isValidCurrency('usd')).toBe(false) // Lowercase
      expect(isValidCurrency('US')).toBe(false) // Too short
      expect(isValidCurrency('USDD')).toBe(false) // Too long
      expect(isValidCurrency('')).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidCurrency(null)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidCurrency(undefined)).toBe(false)
    })
  })

  describe('isValidLanguageCode', () => {
    it('should return true for valid language codes', () => {
      expect(isValidLanguageCode('en')).toBe(true)
      expect(isValidLanguageCode('es')).toBe(true)
      expect(isValidLanguageCode('fr')).toBe(true)
      expect(isValidLanguageCode('de')).toBe(true)
    })

    it('should return false for invalid language codes', () => {
      expect(isValidLanguageCode('EN')).toBe(false) // Uppercase
      expect(isValidLanguageCode('eng')).toBe(false) // Too long
      expect(isValidLanguageCode('e')).toBe(false) // Too short
      expect(isValidLanguageCode('')).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidLanguageCode(null)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isValidLanguageCode(undefined)).toBe(false)
    })
  })

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true)
      expect(isNonEmptyString('  hello  ')).toBe(true)
      expect(isNonEmptyString('a')).toBe(true)
    })

    it('should return false for empty or whitespace-only strings', () => {
      expect(isNonEmptyString('')).toBe(false)
      expect(isNonEmptyString('   ')).toBe(false)
      expect(isNonEmptyString('\t\n')).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isNonEmptyString(null)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isNonEmptyString(undefined)).toBe(false)
      // @ts-expect-error - Testing invalid input
      expect(isNonEmptyString(123)).toBe(false)
    })
  })
})