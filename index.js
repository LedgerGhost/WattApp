// MODELS
const User = require('./models/User');
const Point = require('./models/Point');
const {
  VALID_STATUSES,
  ONLINE_STATUSES,
  formatTimestamp: formatPointTimestamp
} = require('./models/Point');
const ChargingSession = require('./models/ChargingSession');
const {
  formatTimestamp: formatSessionTimestamp,
  parseTimestamp,
  parseDateYYYYMMDD: parseSessionDate
} = require('./models/ChargingSession');
const PointStatusHistory = require('./models/PointStatusHistory');
const {
  VALID_STATUSES: HISTORY_STATUSES,
  formatTimestamp: formatHistoryTimestamp,
  parseDateYYYYMMDD: parseHistoryDate
} = require('./models/PointStatusHistory');
const Reservation = require('./models/Reservation');
const { formatTimestamp: formatReservationTimestamp } = require('./models/Reservation');
const AuthSession = require('./models/AuthSession');

// DATABASE CONFIG
const {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  checkHealth,
  getMongoose,
  getDb
} = require('./config/database');

// UTILITIES
const {
  createErrorResponse,
  errorHandler,
  notFoundHandler,
  ApiError,
  sendError
} = require('./utils/errorUtils');

const {
  parseDateYYYYMMDD,
  formatDateYYYYMMDD,
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
} = require('./utils/dateUtils');

const {
  toCSV,
  parseCSV,
  pointsToCSV,
  sessionsToCSV,
  statusHistoryToCSV,
  CSV_HEADERS,
  sendCSVResponse,
  formatMiddleware,
  sendFormattedResponse
} = require('./utils/csvUtils');

// Named exports (for TS / tooling compatibility if required)
module.exports = {
  // Models
  User,
  Point,
  ChargingSession,
  PointStatusHistory,
  Reservation,
  AuthSession,

  // Database
  connectDB,
  disconnectDB,
  getConnectionStatus,
  checkHealth,
  getMongoose,
  getDb,

  // Error Utilities
  createErrorResponse,
  errorHandler,
  notFoundHandler,
  ApiError,
  sendError,

  // Date Utilities
  parseDateYYYYMMDD,
  formatDateYYYYMMDD,
  formatTimestamp,
  parseTimestamp,
  isValidYYYYMMDD,
  validateDateRange,
  getUnixEpoch,
  addMinutes,
  isPast,
  isFuture,
  getCurrentTimestamp,
  getTodayYYYYMMDD,
  getDurationMinutes,
  formatDuration,

  // CSV Utilities
  toCSV,
  parseCSV,
  pointsToCSV,
  sessionsToCSV,
  statusHistoryToCSV,
  CSV_HEADERS,
  sendCSVResponse,
  formatMiddleware,
  sendFormattedResponse,

  // Constants
  VALID_STATUSES,
  ONLINE_STATUSES,
  HISTORY_STATUSES,

  // Aliased formatters (if you relied on them)
  formatPointTimestamp,
  formatSessionTimestamp,
  parseSessionDate,
  formatHistoryTimestamp,
  parseHistoryDate,
  formatReservationTimestamp
};
