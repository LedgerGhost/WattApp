/**
 * Reservation Model Tests
 * Tests for reservation schema validation and methods
 */

const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const { formatTimestamp } = require('../models/Reservation');

describe('Reservation Model', () => {
  // Helper to create a valid ObjectId
  const createObjectId = () => new mongoose.Types.ObjectId();

  // =========================================================================
  // Schema Validation Tests
  // =========================================================================
  describe('Schema Validation', () => {
    const validReservationData = {
      pointid: 'P001',
      userId: createObjectId(),
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later
      durationMinutes: 30
    };

    test('should require pointid', () => {
      const reservation = new Reservation({
        ...validReservationData,
        pointid: undefined
      });
      const validation = reservation.validateSync();
      expect(validation.errors.pointid).toBeDefined();
    });

    test('should require userId', () => {
      const reservation = new Reservation({
        ...validReservationData,
        userId: undefined
      });
      const validation = reservation.validateSync();
      expect(validation.errors.userId).toBeDefined();
    });

    test('should require endTime', () => {
      const reservation = new Reservation({
        ...validReservationData,
        endTime: undefined
      });
      const validation = reservation.validateSync();
      expect(validation.errors.endTime).toBeDefined();
    });

    test('should validate durationMinutes minimum (1)', () => {
      const reservation = new Reservation({
        ...validReservationData,
        durationMinutes: 0
      });
      const validation = reservation.validateSync();
      expect(validation.errors.durationMinutes).toBeDefined();
    });

    test('should validate durationMinutes maximum (60)', () => {
      const reservation = new Reservation({
        ...validReservationData,
        durationMinutes: 61
      });
      const validation = reservation.validateSync();
      expect(validation.errors.durationMinutes).toBeDefined();
    });

    test('should validate status enum', () => {
      const reservation = new Reservation({
        ...validReservationData,
        status: 'invalid_status'
      });
      const validation = reservation.validateSync();
      expect(validation.errors.status).toBeDefined();
    });

    test('should accept all valid statuses', () => {
      ['active', 'completed', 'cancelled', 'expired', 'converted'].forEach(
          (status) => {
            const reservation = new Reservation({
              ...validReservationData,
              status
            });
            const validation = reservation.validateSync();
            expect(validation?.errors?.status).toBeUndefined();
          }
      );
    });

    test('should pass validation with valid data', () => {
      const reservation = new Reservation(validReservationData);
      const validation = reservation.validateSync();
      expect(validation).toBeUndefined();
    });

    test('should validate cancelReason max length', () => {
      const reservation = new Reservation({
        ...validReservationData,
        cancelReason: 'a'.repeat(256) // Over 255 limit
      });
      const validation = reservation.validateSync();
      expect(validation.errors.cancelReason).toBeDefined();
    });
  });

  // =========================================================================
  // Default Values Tests
  // =========================================================================
  describe('Default Values', () => {
    test('status should default to active', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 30 * 60 * 1000)
      });
      expect(reservation.status).toBe('active');
    });

    test('durationMinutes should default to 30', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 30 * 60 * 1000)
      });
      expect(reservation.durationMinutes).toBe(30);
    });

    test('startTime should default to now', () => {
      const before = Date.now();
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 30 * 60 * 1000)
      });
      const after = Date.now();
      expect(reservation.startTime.getTime()).toBeGreaterThanOrEqual(before);
      expect(reservation.startTime.getTime()).toBeLessThanOrEqual(after);
    });

    test('sessionId should default to null', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 30 * 60 * 1000)
      });
      expect(reservation.sessionId).toBeNull();
    });

    test('cancelledAt should default to null', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 30 * 60 * 1000)
      });
      expect(reservation.cancelledAt).toBeNull();
    });
  });

  // =========================================================================
  // Instance Method Tests
  // =========================================================================
  describe('Instance Methods', () => {
    let reservation;

    beforeEach(() => {
      reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later
        durationMinutes: 30,
        status: 'active'
      });
    });

    test('isActive should return true for active non-expired reservation', () => {
      expect(reservation.isActive()).toBe(true);
    });

    test('isActive should return false for non-active status', () => {
      reservation.status = 'cancelled';
      expect(reservation.isActive()).toBe(false);
      reservation.status = 'completed';
      expect(reservation.isActive()).toBe(false);
      reservation.status = 'expired';
      expect(reservation.isActive()).toBe(false);
    });

    test('isActive should return false for expired reservation', () => {
      reservation.endTime = new Date(Date.now() - 60000); // 1 minute ago
      expect(reservation.isActive()).toBe(false);
    });

    test('toActiveResponse should return correct format', () => {
      reservation.endTime = new Date(2025, 10, 10, 19, 0);
      const result = reservation.toActiveResponse();
      expect(result).toEqual({
        pointid: 'P001',
        reservationendtime: '2025-11-10 19:00'
      });
    });
  });

  // =========================================================================
  // Virtual Properties Tests
  // =========================================================================
  describe('Virtual Properties', () => {
    test('isExpired should return true for past end time with active status', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() - 60000), // 1 minute ago
        status: 'active'
      });
      expect(reservation.isExpired).toBe(true);
    });

    test('isExpired should return false for future end time', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 60000), // 1 minute from now
        status: 'active'
      });
      expect(reservation.isExpired).toBe(false);
    });

    test('remainingMinutes should calculate correctly', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        status: 'active'
      });
      const remaining = reservation.remainingMinutes;
      expect(remaining).toBeGreaterThanOrEqual(14);
      expect(remaining).toBeLessThanOrEqual(15);
    });

    test('remainingMinutes should return 0 for non-active status', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 15 * 60 * 1000),
        status: 'cancelled'
      });
      expect(reservation.remainingMinutes).toBe(0);
    });

    test('remainingMinutes should return 0 for past end time', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() - 60000),
        status: 'active'
      });
      expect(reservation.remainingMinutes).toBe(0);
    });
  });

  // =========================================================================
  // Static Method Tests
  // =========================================================================
  describe('Static Methods', () => {
    test('formatTimestamp should format date correctly', () => {
      const date = new Date(2025, 10, 10, 19, 0);
      expect(Reservation.formatTimestamp(date)).toBe('2025-11-10 19:00');
    });
  });

  // =========================================================================
  // Exported Helper Tests
  // =========================================================================
  describe('Exported Helpers', () => {
    test('formatTimestamp should format correctly', () => {
      const date = new Date(2025, 10, 10, 19, 0);
      expect(formatTimestamp(date)).toBe('2025-11-10 19:00');
    });
  });

  // =========================================================================
  // Schema Configuration Tests
  // =========================================================================
  describe('Schema Configuration', () => {
    test('should have timestamps enabled', () => {
      expect(Reservation.schema.options.timestamps).toBe(true);
    });

    test('should use reservations collection', () => {
      expect(Reservation.schema.options.collection).toBe('reservations');
    });
  });

  // =========================================================================
  // Business Logic Tests
  // =========================================================================
  describe('Business Logic', () => {
    test('valid duration should be between 1 and 60 minutes', () => {
      [1, 15, 30, 45, 60].forEach((duration) => {
        const reservation = new Reservation({
          pointid: 'P001',
          userId: createObjectId(),
          endTime: new Date(Date.now() + duration * 60 * 1000),
          durationMinutes: duration
        });
        const validation = reservation.validateSync();
        expect(validation?.errors?.durationMinutes).toBeUndefined();
      });
    });

    test('reservation can reference a session', () => {
      const sessionId = createObjectId();
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        sessionId
      });
      expect(reservation.sessionId).toEqual(sessionId);
    });

    test('cancellation details can be stored', () => {
      const reservation = new Reservation({
        pointid: 'P001',
        userId: createObjectId(),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'User requested cancellation'
      });
      const validation = reservation.validateSync();
      expect(validation).toBeUndefined();
      expect(reservation.cancelReason).toBe('User requested cancellation');
    });
  });
});
