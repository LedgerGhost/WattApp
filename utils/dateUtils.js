function parseDateYYYYMMDD(dateStr, endOfDay = false) {
  const match = String(dateStr).match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;

  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  const yearNum = parseInt(year, 10);

  if (monthNum < 1 || monthNum > 12) return null;
  if (dayNum < 1 || dayNum > 31) return null;
  if (yearNum < 1970 /*|| yearNum > 2100*/) return null;

  if (endOfDay) {
    return new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59, 999);
  }
  return new Date(yearNum, monthNum - 1, dayNum, 0, 0, 0, 0);
}

function formatDateYYYYMMDD(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function parseTimestamp(timestamp) {
  if (timestamp instanceof Date) return timestamp;
  const match = String(timestamp).match(
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/
  );
  if (match) {
    const [, year, month, day, hours, minutes] = match;
    return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10)
    );
  }
  const isoMatch = String(timestamp).match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
  );
  if (isoMatch) {
    return new Date(timestamp);
  }
  return new Date(timestamp);
}

function formatTimestamp(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function isValidYYYYMMDD(dateStr) {
  return parseDateYYYYMMDD(dateStr) !== null;
}

function validateDateRange(from, to) {
  const fromDate = parseDateYYYYMMDD(from);
  const toDate = parseDateYYYYMMDD(to, true);
  if (!fromDate) {
    return {
      valid: false,
      error: `Invalid 'from' date format: ${from}. Expected YYYYMMDD`
    };
  }

  if (!toDate) {
    return {
      valid: false,
      error: `Invalid 'to' date format: ${to}. Expected YYYYMMDD`
    };
  }

  if (fromDate > toDate) {
    return {
      valid: false,
      error: `'from' date (${from}) must be before or equal to 'to' date (${to})`
    };
  }

  return {
    valid: true,
    fromDate,
    toDate
  };
}

function getUnixEpoch() {
  return '1970-01-01 00:00';
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isPast(date) {
  return new Date(date) < new Date();
}

function isFuture(date) {
  return new Date(date) > new Date();
}

function getCurrentTimestamp() {
  return formatTimestamp(new Date());
}

function getTodayYYYYMMDD() {
  return formatDateYYYYMMDD(new Date());
}

function getDurationMinutes(start, end) {
  return Math.round((new Date(end) - new Date(start)) / (1000 * 60));
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}min`;
}

module.exports = {
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
};
