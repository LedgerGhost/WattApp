/**
 * ChargingSession Model Tests
 * Tests for charging session schema validation and methods
 */

const mongoose = require('mongoose');
const ChargingSession = require('../models/ChargingSession');
const {
  formatTimestamp,
  parseTimestamp,
  parseDateYYYYMMDD
} = require('../models/ChargingSession');

describe('ChargingSession Model', () => {
  // =========================================================================
  // Schema Validation Tests
  // =========================================================================
  describe('Schema Validation', () => {
    const validSessionData = {
      pointid: 'P001',
      starttime: new Date(2025, 10, 10, 14, 0),
      endtime: new Date(2025, 10, 10, 16, 30),
      startsoc: 20,
      endsoc: 80,
      totalkwh: 25.5,
      kwhprice: 0.35,
      amount: 8.93
    };

    test('should require pointid', () => {
      const session = new ChargingSession({
        ...validSessionData,
        pointid: undefined
      });
      const validation = session.validateSync();
      expect(validation.errors.pointid).toBeDefined();
    });

    test('should require starttime', () => {
      const session = new ChargingSession({
        ...validSessionData,
        starttime: undefined
      });
      const validation = session.validateSync();
      expect(validation.errors.starttime).toBeDefined();
    });

    test('should require endtime', () => {
      const session = new ChargingSession({
        ...validSessionData,
        endtime: undefined
      });
      const validation = session.validateSync();
      expect(validation.errors.endtime).toBeDefined();
    });

    test('should validate endtime is after starttime', () => {
      const session = new ChargingSession({
        ...validSessionData,
        starttime: new Date(2025, 10, 10, 16, 0),
        endtime: new Date(2025, 10, 10, 14, 0) // Before starttime
      });
      const validation = session.validateSync();
      expect(validation.errors.endtime).toBeDefined();
    });

    test('should validate startsoc range (0-100)', () => {
      let session = new ChargingSession({
        ...validSessionData,
        startsoc: -10
      });
      expect(session.validateSync().errors.startsoc).toBeDefined();

      session = new ChargingSession({
        ...validSessionData,
        startsoc: 110
      });
      expect(session.validateSync().errors.startsoc).toBeDefined();
    });

    test('should validate endsoc range (0-100)', () => {
      let session = new ChargingSession({
        ...validSessionData,
        endsoc: -10
      });
      expect(session.validateSync().errors.endsoc).toBeDefined();

      session = new ChargingSession({
        ...validSessionData,
        endsoc: 110
      });
      expect(session.validateSync().errors.endsoc).toBeDefined();
    });

    test('should validate endsoc >= startsoc', () => {
      const session = new ChargingSession({
        ...validSessionData,
        startsoc: 80,
        endsoc: 20 // Less than startsoc
      });
      const validation = session.validateSync();
      expect(validation.errors.endsoc).toBeDefined();
    });

    test('should require positive totalkwh', () => {
      const session = new ChargingSession({
        ...validSessionData,
        totalkwh: -5
      });
      const validation = session.validateSync();
      expect(validation.errors.totalkwh).toBeDefined();
    });

    test('should require positive kwhprice', () => {
      const session = new ChargingSession({
        ...validSessionData,
        kwhprice: -0.5
      });
      const validation = session.validateSync();
      expect(validation.errors.kwhprice).toBeDefined();
    });

    test('should require positive amount', () => {
      const session = new ChargingSession({
        ...validSessionData,
        amount: -10
      });
      const validation = session.validateSync();
      expect(validation.errors.amount).toBeDefined();
    });

    test('should pass validation with valid data', () => {
      const session = new ChargingSession(validSessionData);
      const validation = session.validateSync();
      expect(validation).toBeUndefined();
    });

    test('should allow startsoc of 0', () => {
      const session = new ChargingSession({
        ...validSessionData,
        startsoc: 0
      });
      const validation = session.validateSync();
      expect(validation?.errors?.startsoc).toBeUndefined();
    });

    test('should allow endsoc of 100', () => {
      const session = new ChargingSession({
        ...validSessionData,
        endsoc: 100
      });
      const validation = session.validateSync();
      expect(validation?.errors?.endsoc).toBeUndefined();
    });
  });

  // =========================================================================
  // Instance Method Tests
  // =========================================================================
  describe('Instance Methods', () => {
    let session;

    beforeEach(() => {
      session = new ChargingSession({
        pointid: 'P001',
        starttime: new Date(2025, 10, 7, 9, 10),
        endtime: new Date(2025, 10, 7, 10, 20),
        startsoc: 20,
        endsoc: 70,
        totalkwh: 18.4,
        kwhprice: 0.29,
        amount: 5.34
      });
    });

    test('toSessionResponse should return correct format', () => {
      const result = session.toSessionResponse();
      expect(result).toEqual({
        starttime: '2025-11-07 09:10',
        endtime: '2025-11-07 10:20',
        startsoc: 20,
        endsoc: 70,
        totalkwh: 18.4,
        kwhprice: 0.29,
        amount: 5.34
      });
    });

    test('toCSVRow should return comma-separated values', () => {
      const result = session.toCSVRow();
      expect(result).toBe(
          '2025-11-07 09:10,2025-11-07 10:20,20,70,18.4,0.29,5.34'
      );
    });
  });

  // =========================================================================
  // Virtual Properties Tests
  // =========================================================================
  describe('Virtual Properties', () => {
    let session;

    beforeEach(() => {
      session = new ChargingSession({
        pointid: 'P001',
        starttime: new Date(2025, 10, 10, 10, 0),
        endtime: new Date(2025, 10, 10, 11, 30),
        startsoc: 20,
        endsoc: 80,
        totalkwh: 30,
        kwhprice: 0.30,
        amount: 9.0
      });
    });

    test('durationMinutes should calculate correct duration', () => {
      expect(session.durationMinutes).toBe(90);
    });

    test('avgPower should calculate average power', () => {
      // 30 kWh over 1.5 hours = 20 kW
      expect(session.avgPower).toBe(20);
    });

    test('socGain should calculate SOC difference', () => {
      expect(session.socGain).toBe(60); // 80 - 20
    });
  });

  // =========================================================================
  // Static Method Tests
  // =========================================================================
  describe('Static Methods', () => {
    test('formatTimestamp should format dates correctly', () => {
      const date = new Date(2025, 10, 10, 18, 30);
      expect(ChargingSession.formatTimestamp(date)).toBe('2025-11-10 18:30');
    });

    test('parseTimestamp should parse API format', () => {
      const result = ChargingSession.parseTimestamp('2025-11-10 18:30');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(10);
      expect(result.getDate()).toBe(10);
      expect(result.getHours()).toBe(18);
      expect(result.getMinutes()).toBe(30);
    });

    test('parseDateYYYYMMDD should parse YYYYMMDD format', () => {
      const result = ChargingSession.parseDateYYYYMMDD('20251110');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(10);
      expect(result.getDate()).toBe(10);
    });

    test('parseDateYYYYMMDD should handle end of day', () => {
      const result = ChargingSession.parseDateYYYYMMDD('20251110', true);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  // =========================================================================
  // Exported Helper Tests
  // =========================================================================
  describe('Exported Helpers', () => {
    test('formatTimestamp should format correctly', () => {
      const date = new Date(2025, 10, 10, 18, 30);
      expect(formatTimestamp(date)).toBe('2025-11-10 18:30');
    });

    test('parseTimestamp should parse correctly', () => {
      const result = parseTimestamp('2025-11-10 18:30');
      expect(result.getFullYear()).toBe(2025);
    });

    test('parseDateYYYYMMDD should parse correctly', () => {
      const result = parseDateYYYYMMDD('20251110');
      expect(result.getFullYear()).toBe(2025);
    });
  });

  // =========================================================================
  // Schema Configuration Tests
  // =========================================================================
  describe('Schema Configuration', () => {
    test('should have timestamps enabled', () => {
      expect(ChargingSession.schema.options.timestamps).toBe(true);
    });

    test('should use charging_sessions collection', () => {
      expect(ChargingSession.schema.options.collection).toBe(
          'charging_sessions'
      );
    });
  });

  // =========================================================================
  // Edge Cases Tests
  // =========================================================================
  describe('Edge Cases', () => {
    test('should handle zero duration session', () => {
      const sameTime = new Date(2025, 10, 10, 10, 0);
      const session = new ChargingSession({
        pointid: 'P001',
        starttime: sameTime,
        endtime: new Date(sameTime.getTime() + 1), // 1ms later
        startsoc: 50,
        endsoc: 50,
        totalkwh: 0,
        kwhprice: 0.30,
        amount: 0
      });
      const validation = session.validateSync();
      expect(validation).toBeUndefined();
    });

    test('should handle full charge session (0 to 100)', () => {
      const session = new ChargingSession({
        pointid: 'P001',
        starttime: new Date(2025, 10, 10, 10, 0),
        endtime: new Date(2025, 10, 10, 18, 0),
        startsoc: 0,
        endsoc: 100,
        totalkwh: 85,
        kwhprice: 0.30,
        amount: 25.5
      });
      const validation = session.validateSync();
      expect(validation).toBeUndefined();
    });

    test('should handle overnight session', () => {
      const session = new ChargingSession({
        pointid: 'P001',
        starttime: new Date(2025, 10, 10, 22, 0),
        endtime: new Date(2025, 10, 11, 6, 0), // Next day
        startsoc: 10,
        endsoc: 90,
        totalkwh: 50,
        kwhprice: 0.25,
        amount: 12.5
      });
      const validation = session.validateSync();
      expect(validation).toBeUndefined();
    });
  });
});
