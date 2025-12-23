/**
 * Date parsing utilities for API endpoints
 * Handles YYYYMMDD format from path parameters
 */

/**
 * Parse date string in YYYYMMDD format to Date object
 * @param {string} dateStr - Date string in format YYYYMMDD (e.g., "20251125")
 * @returns {Date|null} - Date object or null if invalid
 * 
 * @example
 * parseDate("20251125")  // Returns: Date object for Nov 25, 2025
 * parseDate("20250229")  // Returns: null (invalid date - not leap year)
 * parseDate("2025-11-25") // Returns: null (wrong format)
 */
function parseDate(dateStr) {
    // Validate format: exactly 8 digits
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }
    
    if (!/^\d{8}$/.test(dateStr)) {
        return null;
    }
    
    // Extract year, month, day
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // JS months: 0-11
    const day = parseInt(dateStr.substring(6, 8), 10);
    
    // Create date object
    const date = new Date(year, month, day);
    
    // Validate it's a real date (handles invalid dates like Feb 30, Month 13, etc.)
    if (date.getFullYear() !== year || 
        date.getMonth() !== month || 
        date.getDate() !== day) {
        return null;
    }
    
    return date;
}

/**
 * Parse date string and set time to start of day (00:00:00.000)
 * Useful for "from" date in ranges
 * @param {string} dateStr - Date string in format YYYYMMDD
 * @returns {Date|null} - Date object with time set to 00:00:00.000 or null if invalid
 */
function parseDateStartOfDay(dateStr) {
    const date = parseDate(dateStr);
    if (!date) return null;
    
    date.setHours(0, 0, 0, 0);
    return date;
}

/**
 * Parse date string and set time to end of day (23:59:59.999)
 * Useful for "to" date in ranges
 * @param {string} dateStr - Date string in format YYYYMMDD
 * @returns {Date|null} - Date object with time set to 23:59:59.999 or null if invalid
 */
function parseDateEndOfDay(dateStr) {
    const date = parseDate(dateStr);
    if (!date) return null;
    
    date.setHours(23, 59, 59, 999);
    return date;
}

/**
 * Validate if fromDate is before or equal to toDate
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {boolean} - True if valid range, false otherwise
 */
function isValidDateRange(fromDate, toDate) {
    if (!fromDate || !toDate) return false;
    return fromDate <= toDate;
}

/**
 * Check if a date falls within a range (inclusive)
 * @param {Date} date - Date to check
 * @param {Date} fromDate - Start of range
 * @param {Date} toDate - End of range
 * @returns {boolean} - True if date is within range
 */
function isDateInRange(date, fromDate, toDate) {
    if (!date || !fromDate || !toDate) return false;
    return date >= fromDate && date <= toDate;
}

// Export all functions
module.exports = {
    parseDate,
    parseDateStartOfDay,
    parseDateEndOfDay,
    isValidDateRange,
    isDateInRange
};