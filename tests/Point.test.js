/**
 * Point Model Tests
 * Tests for charging point schema validation and methods
 */

const mongoose = require('mongoose');
const Point = require('../models/Point');
const {
  VALID_STATUSES,
  ONLINE_STATUSES,
  formatTimestamp
} = require('../models/Point');

describe('Point Model', () => {
  // =========================================================================
  // Schema Validation Tests
  // =========================================================================
  describe('Schema Validation', () => {
    test('should require pointid', async () => {
      const point = new Point({
        providerName: 'WattApp',
        lon: '23.7345',
        lat: '37.9838',
        status: 'available',
        cap: 50,
        kwhprice: 0.35
      });
      const validation = point.validateSync();
      expect(validation.errors.pointid).toBeDefined();
    });

    test('should require providerName', async () => {
      const point = new Point({
        pointid: 'P001',
        lon: '23.7345',
        lat: '37.9838',
        status: 'available',
        cap: 50
      });
      const validation = point.validateSync();
      expect(validation.errors.providerName).toBeDefined();
    });

    test('should require lon and lat', async () => {
      const point = new Point({
        pointid: 'P001',
        providerName: 'WattApp',
        status: 'available',
        cap: 50
      });
      const validation = point.validateSync();
      expect(validation.errors.lon).toBeDefined();
      expect(validation.errors.lat).toBeDefined();
    });

    test('should validate longitude range', async () => {
      const point = new Point({
        pointid: 'P001',
        providerName: 'WattApp',
        lon: '200', // Invalid: > 180
        lat: '37.9838',
        status: 'available',
        cap: 50
      });
      const validation = point.validateSync();
      expect(validation.errors.lon).toBeDefined();
    });

    test('should validate latitude range', async () => {
      const point = new Point({
        pointid: 'P001',
        providerName: 'WattApp',
        lon: '23.7345',
        lat: '100', // Invalid: > 90
        status: 'available',
        cap: 50
      });
      const validation = point.validateSync();
      expect(validation.errors.lat).toBeDefined();
    });

    test('should validate status enum', async () => {
      const point = new Point({
        pointid: 'P001',
        providerName: 'WattApp',
        lon: '23.7345',
        lat: '37.9838',
        status: 'invalid_status',
        cap: 50
      });
      const validation = point.validateSync();
      expect(validation.errors.status).toBeDefined();
    });

    test('should accept all valid statuses', () => {
      VALID_STATUSES.forEach((status) => {
        const point = new Point({
          pointid: 'P001',
          providerName: 'WattApp',
          lon: '23.7345',
          lat: '37.9838',
          status,
          cap: 50,
          kwhprice: 0.35
        });
        const validation = point.validateSync();
        expect(validation?.errors?.status).toBeUndefined();
      });
    });

    test('should require positive capacity', async () => {
      const point = new Point({
        pointid: 'P001',
        providerName: 'WattApp',
        lon: '23.7345',
        lat: '37.9838',
        status: 'available',
        cap: -10
      });
      const validation = point.validateSync();
      expect(validation.errors.cap).toBeDefined();
    });

    test('should pass validation with valid data', () => {
      const point = new Point({
        pointid: 'P001',
        providerName: 'WattApp',
        lon: '23.7345',
        lat: '37.9838',
        status: 'available',
        cap: 50,
        kwhprice: 0.35
      });
      const validation = point.validateSync();
      expect(validation).toBeUndefined();
    });
  });

  // =========================================================================
  // Constants Tests
  // =========================================================================
  describe('Constants', () => {
    test('VALID_STATUSES should contain all required statuses', () => {
      expect(VALID_STATUSES).toContain('available');
      expect(VALID_STATUSES).toContain('charging');
      expect(VALID_STATUSES).toContain('reserved');
      expect(VALID_STATUSES).toContain('malfunction');
      expect(VALID_STATUSES).toContain('offline');
      expect(VALID_STATUSES).toHaveLength(5);
    });

    test('ONLINE_STATUSES should contain first 4 statuses', () => {
      expect(ONLINE_STATUSES).toContain('available');
      expect(ONLINE_STATUSES).toContain('charging');
      expect(ONLINE_STATUSES).toContain('reserved');
      expect(ONLINE_STATUSES).toContain('malfunction');
      expect(ONLINE_STATUSES).not.toContain('offline');
      expect(ONLINE_STATUSES).toHaveLength(4);
    });
  });

  // =========================================================================
  // Instance Method Tests
  // =========================================================================
  describe('Instance Methods', () => {
    let point;

    beforeEach(() => {
      point = new Point({
        pointid: 'P001',
        providerName: 'WattApp',
        lon: '23.7345',
        lat: '37.9838',
        status: 'available',
        cap: 50,
        kwhprice: 0.35
      });
    });

    test('isOnline should return true for online statuses', () => {
      point.status = 'available';
      expect(point.isOnline()).toBe(true);
      point.status = 'charging';
      expect(point.isOnline()).toBe(true);
      point.status = 'reserved';
      expect(point.isOnline()).toBe(true);
      point.status = 'malfunction';
      expect(point.isOnline()).toBe(true);
    });

    test('isOnline should return false for offline status', () => {
      point.status = 'offline';
      expect(point.isOnline()).toBe(false);
    });

    test('isAvailable should return true only for available status', () => {
      point.status = 'available';
      expect(point.isAvailable()).toBe(true);
      point.status = 'charging';
      expect(point.isAvailable()).toBe(false);
    });

    test('isReserved should return true only for reserved status', () => {
      point.status = 'reserved';
      expect(point.isReserved()).toBe(true);
      point.status = 'available';
      expect(point.isReserved()).toBe(false);
    });

    test('toPointsList should return correct format', () => {
      const result = point.toPointsList();
      expect(result).toEqual({
        providerName: 'WattApp',
        pointid: 'P001',
        lon: '23.7345',
        lat: '37.9838',
        status: 'available',
        cap: 50
      });
    });

    test('toPointDetails should return correct format', () => {
      point.kwhprice = 0.35;
      const result = point.toPointDetails();
      expect(result.pointid).toBe('P001');
      expect(result.lon).toBe('23.7345');
      expect(result.lat).toBe('37.9838');
      expect(result.status).toBe('available');
      expect(result.cap).toBe(50);
      expect(result.kwhprice).toBe(0.35);
      expect(result.reservationendtime).toBeDefined();
    });
  });

  // =========================================================================
  // Static Method Tests
  // =========================================================================
  describe('Static Methods', () => {
    test('isValidStatus should validate correct statuses', () => {
      expect(Point.isValidStatus('available')).toBe(true);
      expect(Point.isValidStatus('charging')).toBe(true);
      expect(Point.isValidStatus('reserved')).toBe(true);
      expect(Point.isValidStatus('malfunction')).toBe(true);
      expect(Point.isValidStatus('offline')).toBe(true);
    });

    test('isValidStatus should reject invalid statuses', () => {
      expect(Point.isValidStatus('invalid')).toBe(false);
      expect(Point.isValidStatus('')).toBe(false);
      expect(Point.isValidStatus(null)).toBe(false);
      expect(Point.isValidStatus('AVAILABLE')).toBe(false); // Case sensitive
    });

    test('getValidStatuses should return all valid statuses', () => {
      const statuses = Point.getValidStatuses();
      expect(statuses).toEqual(VALID_STATUSES);
      expect(statuses).toHaveLength(5);
    });

    test('formatTimestamp should format dates correctly', () => {
      const date = new Date(2025, 10, 10, 18, 30);
      expect(Point.formatTimestamp(date)).toBe('2025-11-10 18:30');
    });
  });

  // =========================================================================
  // formatTimestamp Export Tests
  // =========================================================================
  describe('formatTimestamp helper', () => {
    test('should format date to YYYY-MM-DD hh:mm', () => {
      const date = new Date(2025, 10, 10, 18, 30);
      expect(formatTimestamp(date)).toBe('2025-11-10 18:30');
    });

    test('should pad single digit values', () => {
      const date = new Date(2025, 0, 5, 8, 5);
      expect(formatTimestamp(date)).toBe('2025-01-05 08:05');
    });

    test('should handle midnight', () => {
      const date = new Date(2025, 10, 10, 0, 0);
      expect(formatTimestamp(date)).toBe('2025-11-10 00:00');
    });

    test('should handle end of day', () => {
      const date = new Date(2025, 10, 10, 23, 59);
      expect(formatTimestamp(date)).toBe('2025-11-10 23:59');
    });
  });

  // =========================================================================
  // Default Values Tests
  // =========================================================================
  describe('Default Values', () => {
    test('status should default to available', () => {
      expect(Point.schema.path('status').defaultValue).toBe('available');
    });

    test('kwhprice should default to 0.30', () => {
      expect(Point.schema.path('kwhprice').defaultValue).toBe(0.30);
    });

    test('reservationendtime should default to null', () => {
      expect(Point.schema.path('reservationendtime').defaultValue).toBeNull();
    });

    test('reservedBy should default to null', () => {
      expect(Point.schema.path('reservedBy').defaultValue).toBeNull();
    });
  });
});
