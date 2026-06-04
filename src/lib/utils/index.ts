/**
 * Utilities Module
 * 
 * Core utility functions for the Finance Tracker app.
 * All utilities are framework-light and testable.
 */

// UUID utilities
export { generateUUID, isValidUUID } from './uuid';

// Date utilities
export {
  getCurrentTimestamp,
  toISOString,
  fromISOString,
  getMonthRange,
  getCurrentMonthRange,
  formatIndonesianDate,
  formatIndonesianDateTime,
  formatShortDate,
  isToday,
  getTodayStart,
} from './date';

// Money utilities
export {
  formatRupiah,
  formatRupiahCompact,
  formatAmountOnly,
  parseRupiahInput,
  validateAndParseAmount,
  isValidAmount,
} from './money';

// Logger utilities
export { logger } from './logger';
export type { default as Logger } from './logger';
