/**
 * CSV Utilities Tests
 * Tests for CSV generation and parsing
 */

const {
  toCSV,
  escapeCSVField,
  parseCSV,
  parseCSVLine,
  pointsToCSV,
  sessionsToCSV,
  statusHistoryToCSV,
  CSV_HEADERS
} = require('../utils/csvUtils');

describe('CSV Utilities', () => {
  // escapeCSVField
  describe('escapeCSVField', () => {
    test('should return simple values unchanged', () => {
      expect(escapeCSVField('hello')).toBe('hello');
      expect(escapeCSVField('123')).toBe('123');
      expect(escapeCSVField('available')).toBe('available');
    });

    test('should escape values containing commas', () => {
      expect(escapeCSVField('hello,world')).toBe('"hello,world"');
    });

    test('should escape values containing quotes', () => {
      expect(escapeCSVField('say "hello"')).toBe('"say ""hello"""');
    });

    test('should escape values containing newlines', () => {
      expect(escapeCSVField('line1\nline2')).toBe('"line1\nline2"');
    });

    test('should handle null and undefined', () => {
      expect(escapeCSVField(null)).toBe('');
      expect(escapeCSVField(undefined)).toBe('');
    });

    test('should convert numbers to strings', () => {
      expect(escapeCSVField(123)).toBe('123');
      expect(escapeCSVField(45.67)).toBe('45.67');
    });
  });

  // toCSV
  describe('toCSV', () => {
    test('should convert array of objects to CSV', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      const result = toCSV(data);
      expect(result).toBe('name,age\nJohn,30\nJane,25');
    });

    test('should use provided column headers', () => {
      const data = [
        { name: 'John', age: 30, city: 'NYC' },
        { name: 'Jane', age: 25, city: 'LA' }
      ];
      const result = toCSV(data, ['name', 'city']);
      expect(result).toBe('name,city\nJohn,NYC\nJane,LA');
    });

    test('should return empty string for empty array', () => {
      expect(toCSV([])).toBe('');
    });

    test('should return empty string for null/undefined', () => {
      expect(toCSV(null)).toBe('');
      expect(toCSV(undefined)).toBe('');
    });

    test('should escape special characters in values', () => {
      const data = [{ name: 'John, Jr.', note: 'said "hello"' }];
      const result = toCSV(data);
      expect(result).toContain('"John, Jr."');
      expect(result).toContain('"said ""hello"""');
    });
  });

  // parseCSVLine
  describe('parseCSVLine', () => {
    test('should parse simple CSV line', () => {
      const result = parseCSVLine('a,b,c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    test('should parse quoted fields', () => {
      const result = parseCSVLine('"hello, world",test');
      expect(result).toEqual(['hello, world', 'test']);
    });

    test('should handle escaped quotes', () => {
      const result = parseCSVLine('"say ""hello""",test');
      expect(result).toEqual(['say "hello"', 'test']);
    });

    test('should handle empty fields', () => {
      const result = parseCSVLine('a,,c');
      expect(result).toEqual(['a', '', 'c']);
    });

    test('should handle custom delimiter', () => {
      const result = parseCSVLine('a;b;c', ';');
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  // parseCSV
  describe('parseCSV', () => {
    test('should parse CSV string with headers', () => {
      const csv = 'name,age\nJohn,30\nJane,25';
      const result = parseCSV(csv);
      expect(result).toEqual([
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' }
      ]);
    });

    test('should parse CSV without headers', () => {
      const csv = 'John,30\nJane,25';
      const result = parseCSV(csv, { hasHeader: false });
      expect(result).toEqual([
        { column0: 'John', column1: '30' },
        { column0: 'Jane', column1: '25' }
      ]);
    });

    test('should handle empty CSV', () => {
      expect(parseCSV('')).toEqual([]);
    });

    test('should trim field values', () => {
      const csv = 'name , age\n John , 30 ';
      const result = parseCSV(csv);
      expect(result[0].name).toBe('John');
      expect(result[0].age).toBe('30');
    });

    test('should handle Windows line endings', () => {
      const csv = 'name,age\r\nJohn,30\r\nJane,25';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
    });
  });

  // pointsToCSV
  describe('pointsToCSV', () => {
    test('should format points list correctly', () => {
      const points = [
        {
          providerName: 'WattApp',
          pointid: 'POINT001',
          lon: '23.7345',
          lat: '37.9838',
          status: 'available',
          cap: 50
        },
        {
          providerName: 'WattApp',
          pointid: 'POINT002',
          lon: '23.7275',
          lat: '37.9755',
          status: 'charging',
          cap: 22
        }
      ];
      const result = pointsToCSV(points);
      const lines = result.split('\n');
      expect(lines[0]).toBe('providerName,pointid,lon,lat,status,cap');
      expect(lines[1]).toBe('WattApp,POINT001,23.7345,37.9838,available,50');
      expect(lines[2]).toBe('WattApp,POINT002,23.7275,37.9755,charging,22');
    });
  });

  // sessionsToCSV
  describe('sessionsToCSV', () => {
    test('should format sessions list correctly', () => {
      const sessions = [
        {
          starttime: '2025-11-07 09:10',
          endtime: '2025-11-07 10:20',
          startsoc: 20,
          endsoc: 70,
          totalkwh: 18.4,
          kwhprice: 0.29,
          amount: 5.34
        }
      ];
      const result = sessionsToCSV(sessions);
      const lines = result.split('\n');
      expect(lines[0]).toBe(
          'starttime,endtime,startsoc,endsoc,totalkwh,kwhprice,amount'
      );
      expect(lines[1]).toBe(
          '2025-11-07 09:10,2025-11-07 10:20,20,70,18.4,0.29,5.34'
      );
    });
  });

  // statusHistoryToCSV
  describe('statusHistoryToCSV', () => {
    test('should format status history correctly', () => {
      const history = [
        {
          timeref: '2025-11-02 08:55',
          old_state: 'available',
          new_state: 'charging'
        },
        {
          timeref: '2025-11-02 10:25',
          old_state: 'charging',
          new_state: 'available'
        }
      ];
      const result = statusHistoryToCSV(history);
      const lines = result.split('\n');
      expect(lines[0]).toBe('timeref,old_state,new_state');
      expect(lines[1]).toBe('2025-11-02 08:55,available,charging');
      expect(lines[2]).toBe('2025-11-02 10:25,charging,available');
    });
  });

  // CSV_HEADERS
  describe('CSV_HEADERS', () => {
    test('should have correct headers for points', () => {
      expect(CSV_HEADERS.points).toBe('providerName,pointid,lon,lat,status,cap');
    });

    test('should have correct headers for sessions', () => {
      expect(CSV_HEADERS.sessions).toBe(
          'starttime,endtime,startsoc,endsoc,totalkwh,kwhprice,amount'
      );
    });

    test('should have correct headers for pointstatus', () => {
      expect(CSV_HEADERS.pointstatus).toBe('timeref,old_state,new_state');
    });
  });
});
