/**
 * Date Utilities Tests
 * Tests for YYYYMMDD and timestamp format conversions
 */

const {
  parseDateYYYYMMDD,
  formatDateYYYYMMDD,
  parseTimestamp,
  formatTimestamp,
  isValidYYYYMMDD,
  validateDateRange,
  getUnixEpoch,
  addMinutes,
  isPast,
  isFuture,
  getCurrentTimestamp,
  getTodayYYYYMMDD,
  getDurationMinutes,
  formatDuration
} = require('../utils/dateUtils');

describe('Date Utilities', () => {
  // parseDateYYYYMMDD
  describe('parseDateYYYYMMDD', () => {
    test('should parse valid YYYYMMDD date', () => {
      const result = parseDateYYYYMMDD('20251110');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(10);
      expect(result.getDate()).toBe(10);
    });

    test('should parse date with endOfDay flag', () => {
      const result = parseDateYYYYMMDD('20251110', true);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });

    test('should parse date without endOfDay flag to start of day', () => {
      const result = parseDateYYYYMMDD('20251110', false);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    test('should return null for invalid format', () => {
      expect(parseDateYYYYMMDD('2025-11-10')).toBeNull();
      expect(parseDateYYYYMMDD('25111010')).toBeNull();
      expect(parseDateYYYYMMDD('invalid')).toBeNull();
      expect(parseDateYYYYMMDD('')).toBeNull();
      expect(parseDateYYYYMMDD('1234567')).toBeNull();
      expect(parseDateYYYYMMDD('123456789')).toBeNull();
    });

    test('should return null for invalid month', () => {
      expect(parseDateYYYYMMDD('20251310')).toBeNull();
      expect(parseDateYYYYMMDD('20250010')).toBeNull();
    });

    test('should return null for invalid day', () => {
      expect(parseDateYYYYMMDD('20251132')).toBeNull();
      expect(parseDateYYYYMMDD('20251100')).toBeNull();
    });

    test('should handle edge cases for months', () => {
      const jan = parseDateYYYYMMDD('20250115');
      expect(jan.getMonth()).toBe(0);
      const dec = parseDateYYYYMMDD('20251215');
      expect(dec.getMonth()).toBe(11);
    });
  });

  // formatDateYYYYMMDD
  describe('formatDateYYYYMMDD', () => {
    test('should format date to YYYYMMDD', () => {
      const date = new Date(2025, 10, 10);
      expect(formatDateYYYYMMDD(date)).toBe('20251110');
    });

    test('should pad single digit months and days', () => {
      const date = new Date(2025, 0, 5);
      expect(formatDateYYYYMMDD(date)).toBe('20250105');
    });

    test('should handle December correctly', () => {
      const date = new Date(2025, 11, 25);
      expect(formatDateYYYYMMDD(date)).toBe('20251225');
    });
  });

  // parseTimestamp
  describe('parseTimestamp', () => {
    test('should parse "YYYY-MM-DD hh:mm" format', () => {
      const result = parseTimestamp('2025-11-10 18:30');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(10);
      expect(result.getDate()).toBe(10);
      expect(result.getHours()).toBe(18);
      expect(result.getMinutes()).toBe(30);
    });

    test('should return Date object unchanged', () => {
      const input = new Date(2025, 10, 10, 18, 30);
      const result = parseTimestamp(input);
      expect(result).toBe(input);
    });

    test('should handle ISO format', () => {
      const result = parseTimestamp('2025-11-10T18:30:00');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
    });

    test('should handle midnight', () => {
      const result = parseTimestamp('2025-11-10 00:00');
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    test('should handle end of day', () => {
      const result = parseTimestamp('2025-11-10 23:59');
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });
  });

  // formatTimestamp
  describe('formatTimestamp', () => {
    test('should format date to "YYYY-MM-DD hh:mm"', () => {
      const date = new Date(2025, 10, 10, 18, 30);
      expect(formatTimestamp(date)).toBe('2025-11-10 18:30');
    });

    test('should pad single digits', () => {
      const date = new Date(2025, 0, 5, 8, 5);
      expect(formatTimestamp(date)).toBe('2025-01-05 08:05');
    });

    test('should handle midnight', () => {
      const date = new Date(2025, 10, 10, 0, 0);
      expect(formatTimestamp(date)).toBe('2025-11-10 00:00');
    });

    test('should throw error for invalid date', () => {
      expect(() => formatTimestamp('invalid')).toThrow('Invalid date');
    });
  });

  // isValidYYYYMMDD
  describe('isValidYYYYMMDD', () => {
    test('should return true for valid dates', () => {
      expect(isValidYYYYMMDD('20251110')).toBe(true);
      expect(isValidYYYYMMDD('20250101')).toBe(true);
      expect(isValidYYYYMMDD('20251231')).toBe(true);
    });

    test('should return false for invalid dates', () => {
      expect(isValidYYYYMMDD('2025-11-10')).toBe(false);
      expect(isValidYYYYMMDD('invalid')).toBe(false);
      expect(isValidYYYYMMDD('')).toBe(false);
      expect(isValidYYYYMMDD('20251310')).toBe(false);
    });
  });

  // validateDateRange
  describe('validateDateRange', () => {
    test('should validate correct date range', () => {
      const result = validateDateRange('20251101', '20251130');
      expect(result.valid).toBe(true);
      expect(result.fromDate).toBeInstanceOf(Date);
      expect(result.toDate).toBeInstanceOf(Date);
    });

    test('should accept same from and to date', () => {
      const result = validateDateRange('20251110', '20251110');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid from date', () => {
      const result = validateDateRange('invalid', '20251130');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('from');
    });

    test('should reject invalid to date', () => {
      const result = validateDateRange('20251101', 'invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('to');
    });

    test('should reject from > to', () => {
      const result = validateDateRange('20251130', '20251101');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('before');
    });
  });

  // getUnixEpoch
  describe('getUnixEpoch', () => {
    test('should return Unix epoch timestamp', () => {
      expect(getUnixEpoch()).toBe('1970-01-01 00:00');
    });
  });

  // addMinutes
  describe('addMinutes', () => {
    test('should add minutes to date', () => {
      const date = new Date(2025, 10, 10, 10, 0);
      const result = addMinutes(date, 30);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(30);
    });

    test('should handle hour overflow', () => {
      const date = new Date(2025, 10, 10, 10, 45);
      const result = addMinutes(date, 30);
      expect(result.getHours()).toBe(11);
      expect(result.getMinutes()).toBe(15);
    });

    test('should handle day overflow', () => {
      const date = new Date(2025, 10, 10, 23, 45);
      const result = addMinutes(date, 30);
      expect(result.getDate()).toBe(11);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(15);
    });
  });

  // isPast / isFuture
  describe('isPast and isFuture', () => {
    test('isPast should return true for past dates', () => {
      const pastDate = new Date(2020, 0, 1);
      expect(isPast(pastDate)).toBe(true);
    });

    test('isPast should return false for future dates', () => {
      const futureDate = new Date(2030, 0, 1);
      expect(isPast(futureDate)).toBe(false);
    });

    test('isFuture should return true for future dates', () => {
      const futureDate = new Date(2030, 0, 1);
      expect(isFuture(futureDate)).toBe(true);
    });

    test('isFuture should return false for past dates', () => {
      const pastDate = new Date(2020, 0, 1);
      expect(isFuture(pastDate)).toBe(false);
    });
  });

  // getCurrentTimestamp
  describe('getCurrentTimestamp', () => {
    test('should return current time in correct format', () => {
      const result = getCurrentTimestamp();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });
  });

  // getTodayYYYYMMDD
  describe('getTodayYYYYMMDD', () => {
    test('should return today in YYYYMMDD format', () => {
      const result = getTodayYYYYMMDD();
      expect(result).toMatch(/^\d{8}$/);
      const today = new Date();
      const expected = formatDateYYYYMMDD(today);
      expect(result).toBe(expected);
    });
  });

  // getDurationMinutes
  describe('getDurationMinutes', () => {
    test('should calculate duration in minutes', () => {
      const start = new Date(2025, 10, 10, 10, 0);
      const end = new Date(2025, 10, 10, 11, 30);
      expect(getDurationMinutes(start, end)).toBe(90);
    });

    test('should handle same time', () => {
      const date = new Date(2025, 10, 10, 10, 0);
      expect(getDurationMinutes(date, date)).toBe(0);
    });

    test('should handle multi-day duration', () => {
      const start = new Date(2025, 10, 10, 10, 0);
      const end = new Date(2025, 10, 11, 10, 0);
      expect(getDurationMinutes(start, end)).toBe(24 * 60);
    });
  });

  // formatDuration
  describe('formatDuration', () => {
    test('should format minutes under an hour', () => {
      expect(formatDuration(30)).toBe('30 min');
      expect(formatDuration(45)).toBe('45 min');
    });

    test('should format exact hours', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(120)).toBe('2h');
    });

    test('should format hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30min');
      expect(formatDuration(150)).toBe('2h 30min');
    });
  });
});
