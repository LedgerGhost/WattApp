/**
 * Error Utilities Tests
 * Tests for standardized error response formatting per PDF spec
 */

const {
  createErrorResponse,
  getFullUrl,
  getClientIp,
  formatTimestamp,
  ApiError
} = require('../utils/errorUtils');

describe('Error Utilities', () => {
  // Mock Express request object
  const createMockRequest = (overrides = {}) => ({
    protocol: 'http',
    get: (header) => {
      if (header === 'host') return 'localhost:9876';
      return null;
    },
    originalUrl: '/api/point/123',
    url: '/api/point/123',
    ip: '192.168.1.100',
    headers: {},
    connection: { remoteAddress: '192.168.1.100' },
    socket: { remoteAddress: '192.168.1.100' },
    method: 'GET',
    path: '/api/point/123',
    ...overrides
  });

  // =========================================================================
  // createErrorResponse Tests
  // =========================================================================
  describe('createErrorResponse', () => {
    test('should create error response with all required fields', () => {
      const req = createMockRequest();
      const result = createErrorResponse(req, 404, 'Point not found', 'ID: 123');
      expect(result).toHaveProperty('call');
      expect(result).toHaveProperty('timeref');
      expect(result).toHaveProperty('originator');
      expect(result).toHaveProperty('return_code');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('debuginfo');
    });

    test('should include correct status code', () => {
      const req = createMockRequest();
      const result = createErrorResponse(req, 400, 'Bad request');
      expect(result.return_code).toBe(400);
    });

    test('should include error message', () => {
      const req = createMockRequest();
      const result = createErrorResponse(req, 500, 'Internal server error');
      expect(result.error).toBe('Internal server error');
    });

    test('should include debug info when provided', () => {
      const req = createMockRequest();
      const result = createErrorResponse(req, 404, 'Not found', 'Debug details here');
      expect(result.debuginfo).toBe('Debug details here');
    });

    test('should use empty string for debuginfo when not provided', () => {
      const req = createMockRequest();
      const result = createErrorResponse(req, 404, 'Not found');
      expect(result.debuginfo).toBe('');
    });

    test('should format timeref correctly', () => {
      const req = createMockRequest();
      const result = createErrorResponse(req, 404, 'Not found');
      expect(result.timeref).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });
  });

  // =========================================================================
  // getFullUrl Tests
  // =========================================================================
  describe('getFullUrl', () => {
    test('should construct full URL from request', () => {
      const req = createMockRequest();
      const result = getFullUrl(req);
      expect(result).toBe('http://localhost:9876/api/point/123');
    });

    test('should handle HTTPS protocol', () => {
      const req = createMockRequest({ protocol: 'https' });
      const result = getFullUrl(req);
      expect(result).toBe('https://localhost:9876/api/point/123');
    });

    test('should handle different paths', () => {
      const req = createMockRequest({
        originalUrl: '/api/sessions/P001/20251101/20251130'
      });
      const result = getFullUrl(req);
      expect(result).toContain('/api/sessions/P001/20251101/20251130');
    });

    test('should include query parameters', () => {
      const req = createMockRequest({
        originalUrl: '/api/points?status=available&format=json'
      });
      const result = getFullUrl(req);
      expect(result).toContain('status=available');
      expect(result).toContain('format=json');
    });
  });

  // =========================================================================
  // getClientIp Tests
  // =========================================================================
  describe('getClientIp', () => {
    test('should get IP from req.ip', () => {
      const req = createMockRequest({ ip: '10.0.0.1' });
      expect(getClientIp(req)).toBe('10.0.0.1');
    });

    test('should get IP from x-forwarded-for header', () => {
      const req = createMockRequest({
        ip: null,
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' }
      });
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    test('should get IP from connection.remoteAddress', () => {
      const req = createMockRequest({
        ip: null,
        headers: {},
        connection: { remoteAddress: '172.16.0.1' }
      });
      expect(getClientIp(req)).toBe('172.16.0.1');
    });

    test('should return "unknown" when no IP available', () => {
      const req = {
        ip: null,
        headers: {},
        connection: {},
        socket: {}
      };
      expect(getClientIp(req)).toBe('unknown');
    });
  });

  // =========================================================================
  // formatTimestamp Tests
  // =========================================================================
  describe('formatTimestamp', () => {
    test('should format date correctly', () => {
      const date = new Date(2025, 10, 10, 18, 30);
      expect(formatTimestamp(date)).toBe('2025-11-10 18:30');
    });

    test('should pad single digits', () => {
      const date = new Date(2025, 0, 5, 8, 5);
      expect(formatTimestamp(date)).toBe('2025-01-05 08:05');
    });
  });

  // =========================================================================
  // ApiError Class Tests
  // =========================================================================
  describe('ApiError', () => {
    test('should create error with status code', () => {
      const error = new ApiError(404, 'Not found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.name).toBe('ApiError');
    });

    test('should include debug info', () => {
      const error = new ApiError(400, 'Bad request', 'Missing pointid');
      expect(error.debugInfo).toBe('Missing pointid');
    });

    test('badRequest should create 400 error', () => {
      const error = ApiError.badRequest('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    test('unauthorized should create 401 error', () => {
      const error = ApiError.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    test('notFound should create 404 error', () => {
      const error = ApiError.notFound('Point not found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Point not found');
    });

    test('internal should create 500 error', () => {
      const error = ApiError.internal();
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
    });

    test('conflict should create 409 error', () => {
      const error = ApiError.conflict('Username already exists');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Username already exists');
    });

    test('should be instance of Error', () => {
      const error = new ApiError(400, 'Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });
  });
});
