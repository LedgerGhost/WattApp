/**
 * User Model Tests
 * Tests for user schema validation and methods
 */

const mongoose = require('mongoose');
const User = require('../models/User');

describe('User Model', () => {
  // =========================================================================
  // Schema Validation Tests
  // =========================================================================
  describe('Schema Validation', () => {
    test('should require username', () => {
      const user = new User({
        password: 'secret123'
      });
      const validation = user.validateSync();
      expect(validation.errors.username).toBeDefined();
    });

    test('should require password', () => {
      const user = new User({
        username: 'testuser'
      });
      const validation = user.validateSync();
      expect(validation.errors.password).toBeDefined();
    });

    test('should enforce minimum username length', () => {
      const user = new User({
        username: 'ab', // 2 chars, min is 3
        password: 'secret123'
      });
      const validation = user.validateSync();
      expect(validation.errors.username).toBeDefined();
      expect(validation.errors.username.message).toContain('at least 3');
    });

    test('should enforce maximum username length', () => {
      const user = new User({
        username: 'a'.repeat(51), // 51 chars, max is 50
        password: 'secret123'
      });
      const validation = user.validateSync();
      expect(validation.errors.username).toBeDefined();
      expect(validation.errors.username.message).toContain('50');
    });

    test('should enforce minimum password length', () => {
      const user = new User({
        username: 'testuser',
        password: '12345' // 5 chars, min is 6
      });
      const validation = user.validateSync();
      expect(validation.errors.password).toBeDefined();
      expect(validation.errors.password.message).toContain('at least 6');
    });

    test('should validate role enum', () => {
      const user = new User({
        username: 'testuser',
        password: 'secret123',
        role: 'invalid_role'
      });
      const validation = user.validateSync();
      expect(validation.errors.role).toBeDefined();
    });

    test('should accept all valid roles', () => {
      ['user', 'admin', 'operator'].forEach((role) => {
        const user = new User({
          username: 'testuser',
          password: 'secret123',
          role
        });
        const validation = user.validateSync();
        expect(validation?.errors?.role).toBeUndefined();
      });
    });

    test('should pass validation with valid data', () => {
      const user = new User({
        username: 'testuser',
        password: 'secret123'
      });
      const validation = user.validateSync();
      expect(validation).toBeUndefined();
    });

    test('should convert username to lowercase', () => {
      const user = new User({
        username: 'TestUser',
        password: 'secret123'
      });
      expect(user.username).toBe('testuser');
    });

    test('should trim username', () => {
      const user = new User({
        username: ' testuser ',
        password: 'secret123'
      });
      expect(user.username).toBe('testuser');
    });
  });

  // =========================================================================
  // Default Values Tests
  // =========================================================================
  describe('Default Values', () => {
    test('role should default to user', () => {
      const user = new User({
        username: 'testuser',
        password: 'secret123'
      });
      expect(user.role).toBe('user');
    });

    test('isActive should default to true', () => {
      const user = new User({
        username: 'testuser',
        password: 'secret123'
      });
      expect(user.isActive).toBe(true);
    });

    test('activeReservation should default to null', () => {
      const user = new User({
        username: 'testuser',
        password: 'secret123'
      });
      expect(user.activeReservation).toBeNull();
    });
  });

  // =========================================================================
  // Instance Method Tests
  // =========================================================================
  describe('Instance Methods', () => {
    let user;

    beforeEach(() => {
      user = new User({
        username: 'testuser',
        password: 'secret123',
        role: 'user'
      });
    });

    test('isAdmin should return true for admin role', () => {
      user.role = 'admin';
      expect(user.isAdmin()).toBe(true);
    });

    test('isAdmin should return false for non-admin roles', () => {
      user.role = 'user';
      expect(user.isAdmin()).toBe(false);
      user.role = 'operator';
      expect(user.isAdmin()).toBe(false);
    });

    test('isOperator should return true for operator role', () => {
      user.role = 'operator';
      expect(user.isOperator()).toBe(true);
    });

    test('isOperator should return true for admin role', () => {
      user.role = 'admin';
      expect(user.isOperator()).toBe(true);
    });

    test('isOperator should return false for user role', () => {
      user.role = 'user';
      expect(user.isOperator()).toBe(false);
    });

    test('toJSON should exclude password', () => {
      user.password = 'hashedpassword123';
      const json = user.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.username).toBe('testuser');
    });

    test('toJSON should exclude __v', () => {
      user.__v = 0;
      const json = user.toJSON();
      expect(json.__v).toBeUndefined();
    });
  });

  // =========================================================================
  // Schema Configuration Tests
  // =========================================================================
  describe('Schema Configuration', () => {
    test('should have timestamps enabled', () => {
      expect(User.schema.options.timestamps).toBe(true);
    });

    test('should use users collection', () => {
      expect(User.schema.options.collection).toBe('users');
    });

    test('should have username index', () => {
      const indexes = User.schema.indexes();
      const usernameIndex = indexes.find(([fields]) => fields.username === 1);
      expect(usernameIndex).toBeDefined();
    });
  });

  // =========================================================================
  // Role Hierarchy Tests
  // =========================================================================
  describe('Role Hierarchy', () => {
    test('admin should have highest privileges', () => {
      const admin = new User({
        username: 'admin',
        password: 'secret123',
        role: 'admin'
      });
      expect(admin.isAdmin()).toBe(true);
      expect(admin.isOperator()).toBe(true);
    });

    test('operator should have middle privileges', () => {
      const operator = new User({
        username: 'operator',
        password: 'secret123',
        role: 'operator'
      });
      expect(operator.isAdmin()).toBe(false);
      expect(operator.isOperator()).toBe(true);
    });

    test('user should have lowest privileges', () => {
      const user = new User({
        username: 'user',
        password: 'secret123',
        role: 'user'
      });
      expect(user.isAdmin()).toBe(false);
      expect(user.isOperator()).toBe(false);
    });
  });
});
