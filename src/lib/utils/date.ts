/**
 * Date Utility
 * 
 * Provides date handling functions for the offline-first finance tracker.
 * All dates are stored as ISO 8601 strings in SQLite for consistency and timezone safety.
 * 
 * TIMEZONE BEHAVIOR:
 * - ISO timestamps are stored in UTC (with 'Z' suffix)
 * - Month ranges use local timezone boundaries (user's calendar month)
 * - Display functions use local timezone (Intl.DateTimeFormat)
 * - This is intentional: users think in local time, but storage is UTC-based
 * 
 * Example: User in Jakarta (UTC+7) creates transaction "today"
 * - Transaction date stored as: "2024-06-04T00:00:00.000+07:00" (or UTC equivalent)
 * - Month range for June 2024: June 1 00:00 local to June 30 23:59 local (converted to ISO)
 * 
 * Uses native JavaScript Date and Intl APIs - no external dependencies needed.
 */

/**
 * Get current timestamp as ISO 8601 string
 * 
 * Used for created_at, updated_at, and other timestamp fields in the database.
 * Format: "YYYY-MM-DDTHH:mm:ss.sssZ"
 * 
 * @returns Current timestamp in ISO format
 * 
 * @example
 * ```typescript
 * const now = getCurrentTimestamp();
 * // "2024-06-04T10:30:45.123Z"
 * ```
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Convert a Date object to ISO 8601 string
 * 
 * @param date - The Date object to convert
 * @returns ISO 8601 formatted string
 * 
 * @example
 * ```typescript
 * const date = new Date(2024, 5, 4); // June 4, 2024
 * const iso = toISOString(date);
 * // "2024-06-04T00:00:00.000Z"
 * ```
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO 8601 string to Date object
 * 
 * @param isoString - ISO 8601 formatted date string
 * @returns Date object, or null if invalid
 * 
 * @example
 * ```typescript
 * const date = fromISOString("2024-06-04T10:30:45.123Z");
 * // Date object for June 4, 2024, 10:30:45 UTC
 * ```
 */
export function fromISOString(isoString: string): Date | null {
  if (!isoString || typeof isoString !== 'string') {
    return null;
  }
  
  const date = new Date(isoString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}

/**
 * Get the start and end ISO timestamps for a given month
 * 
 * IMPORTANT: Returns ISO timestamps based on LOCAL TIMEZONE month boundaries.
 * This is intentional - users think in their local calendar month.
 * 
 * Useful for querying transactions within a specific month.
 * Times are set to start of day (00:00:00.000) and end of day (23:59:59.999) in local time,
 * then converted to ISO (which may show UTC offset depending on timezone).
 * 
 * @param year - Full year (e.g., 2024)
 * @param month - Month (1-12, where 1 is January)
 * @returns Object with startDate and endDate as ISO strings (local month boundaries)
 * 
 * @example
 * ```typescript
 * // User in Jakarta (UTC+7):
 * const range = getMonthRange(2024, 6); // June 2024 LOCAL
 * // {
 * //   startDate: "2024-05-31T17:00:00.000Z" (June 1, 00:00 Jakarta time)
 * //   endDate: "2024-06-30T16:59:59.999Z" (June 30, 23:59 Jakarta time)
 * // }
 * 
 * // Use these timestamps to query SQLite for "June transactions" in user's local context
 * ```
 */
export function getMonthRange(year: number, month: number): {
  startDate: string;
  endDate: string;
} {
  // JavaScript Date months are 0-indexed (0 = January)
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  
  // Get last day of month by using day 0 of next month
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Get the current month range (start and end of current month)
 * 
 * @returns Object with startDate and endDate as ISO strings for current month
 * 
 * @example
 * ```typescript
 * const range = getCurrentMonthRange();
 * // Returns range for current month
 * ```
 */
export function getCurrentMonthRange(): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth() + 1);
}

/**
 * Format a date for display in Indonesian locale
 * 
 * Uses native Intl.DateTimeFormat with Indonesian locale.
 * Format: "4 Juni 2024" (day month year)
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string in Indonesian
 * 
 * @example
 * ```typescript
 * formatIndonesianDate(new Date(2024, 5, 4));
 * // "4 Juni 2024"
 * 
 * formatIndonesianDate("2024-06-04T10:30:45.123Z");
 * // "4 Juni 2024"
 * ```
 */
export function formatIndonesianDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? fromISOString(date) : date;
  
  if (!dateObj) {
    return '';
  }
  
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Format a date for display in Indonesian locale with time
 * 
 * Format: "4 Juni 2024, 10:30"
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date and time string in Indonesian
 * 
 * @example
 * ```typescript
 * formatIndonesianDateTime(new Date(2024, 5, 4, 10, 30));
 * // "4 Juni 2024, 10:30"
 * ```
 */
export function formatIndonesianDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? fromISOString(date) : date;
  
  if (!dateObj) {
    return '';
  }
  
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format a date for short display (dd/MM/yyyy)
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "04/06/2024")
 * 
 * @example
 * ```typescript
 * formatShortDate(new Date(2024, 5, 4));
 * // "04/06/2024"
 * ```
 */
export function formatShortDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? fromISOString(date) : date;
  
  if (!dateObj) {
    return '';
  }
  
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Check if a date string is today
 * 
 * @param isoString - ISO date string to check
 * @returns true if the date is today (same calendar day)
 * 
 * @example
 * ```typescript
 * isToday(getCurrentTimestamp()); // true
 * isToday("2024-01-01T10:30:00.000Z"); // false (unless today is Jan 1, 2024)
 * ```
 */
export function isToday(isoString: string): boolean {
  const date = fromISOString(isoString);
  if (!date) {
    return false;
  }
  
  const today = new Date();
  
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get today's date at start of day (00:00:00.000)
 * 
 * Useful for setting transaction_date to "today".
 * 
 * @returns ISO string for today at midnight
 * 
 * @example
 * ```typescript
 * const todayStart = getTodayStart();
 * // "2024-06-04T00:00:00.000Z"
 * ```
 */
export function getTodayStart(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}
