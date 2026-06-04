/**
 * Safe Logger Utility
 * 
 * Provides logging functions that automatically sanitize sensitive data.
 * 
 * Security Rules:
 * - NEVER log passwords, tokens, auth sessions
 * - NEVER log full financial payloads in production
 * - Sanitize objects before logging
 * - Use log levels appropriately
 * 
 * In production, consider disabling debug/info logs or sending to crash reporting service.
 */

/**
 * List of sensitive field names that should never be logged
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
  'authToken',
  'auth_token',
  'apiKey',
  'api_key',
  'secret',
  'privateKey',
  'private_key',
  'session',
  'sessionId',
  'session_id',
  'cookie',
  'authorization',
];

/**
 * Sanitize an object by removing sensitive fields
 * 
 * Recursively walks through objects and arrays, replacing sensitive values with '[REDACTED]'.
 * 
 * @param obj - Object to sanitize
 * @returns Sanitized copy of the object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Handle non-objects (primitives, Date, etc.)
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }
  
  // Handle regular objects
  const sanitized: any = {};
  
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    
    // Check if field name is sensitive (case-insensitive)
    const isSensitive = SENSITIVE_FIELDS.some(
      field => key.toLowerCase().includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}

/**
 * Format log message with timestamp
 */
function formatMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Log debug message (development only)
 * 
 * Use for detailed debugging information.
 * Should be disabled in production.
 * 
 * @param message - Log message
 * @param data - Optional data to log (will be sanitized)
 * 
 * @example
 * ```typescript
 * logger.debug('Database query executed', { sql: 'SELECT * FROM users', duration: 45 });
 * ```
 */
export function debug(message: string, data?: any): void {
  if (__DEV__) {
    console.log(formatMessage('DEBUG', message));
    if (data !== undefined) {
      console.log(sanitizeObject(data));
    }
  }
}

/**
 * Log info message
 * 
 * Use for general informational messages.
 * 
 * @param message - Log message
 * @param data - Optional data to log (will be sanitized)
 * 
 * @example
 * ```typescript
 * logger.info('User logged in successfully');
 * logger.info('Sync completed', { recordsSynced: 15 });
 * ```
 */
export function info(message: string, data?: any): void {
  console.log(formatMessage('INFO', message));
  if (data !== undefined) {
    console.log(sanitizeObject(data));
  }
}

/**
 * Log warning message
 * 
 * Use for recoverable issues or unexpected conditions.
 * 
 * @param message - Log message
 * @param data - Optional data to log (will be sanitized)
 * 
 * @example
 * ```typescript
 * logger.warn('Sync conflict detected', { entityId: 'abc123', strategy: 'last-write-wins' });
 * ```
 */
export function warn(message: string, data?: any): void {
  console.warn(formatMessage('WARN', message));
  if (data !== undefined) {
    console.warn(sanitizeObject(data));
  }
}

/**
 * Log error message
 * 
 * Use for error conditions that need attention.
 * Errors are always logged, even in production.
 * 
 * @param message - Error message
 * @param error - Error object or data (will be sanitized)
 * 
 * @example
 * ```typescript
 * logger.error('Database query failed', error);
 * logger.error('Sync failed', { entityId: 'abc123', attempt: 3 });
 * ```
 */
export function error(message: string, error?: any): void {
  console.error(formatMessage('ERROR', message));
  if (error !== undefined) {
    // For Error objects, log stack trace if available
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack && __DEV__) {
        console.error(error.stack);
      }
    } else {
      console.error(sanitizeObject(error));
    }
  }
}

/**
 * Log financial data safely
 * 
 * Limits the amount of financial data logged to prevent sensitive information leakage.
 * In production, consider disabling this entirely or sending to secure audit log.
 * 
 * @param message - Log message
 * @param summary - High-level summary (e.g., "Transaction created")
 * @param metadata - Non-sensitive metadata only (e.g., entityId, type)
 * 
 * @example
 * ```typescript
 * // GOOD: Log summary without amounts
 * logger.financial('Transaction created', 'expense', { id: 'tx123', categoryId: 'cat456' });
 * 
 * // BAD: Don't log full transaction payloads
 * // logger.financial('Transaction', transaction); // ❌ Don't do this
 * ```
 */
export function financial(message: string, summary: string, metadata?: any): void {
  if (__DEV__) {
    console.log(formatMessage('FINANCIAL', `${message}: ${summary}`));
    if (metadata !== undefined) {
      // Only log safe metadata (IDs, types, counts)
      const safeMetadata: any = {};
      for (const key in metadata) {
        if (
          key.includes('id') ||
          key.includes('Id') ||
          key === 'type' ||
          key === 'status' ||
          key === 'count'
        ) {
          safeMetadata[key] = metadata[key];
        }
      }
      console.log(sanitizeObject(safeMetadata));
    }
  }
}

/**
 * Sanitize and log an object (useful for debugging)
 * 
 * This function explicitly sanitizes the object before logging.
 * Use when you need to log user data but want to ensure it's safe.
 * 
 * @param label - Label for the log
 * @param obj - Object to sanitize and log
 * 
 * @example
 * ```typescript
 * logger.sanitized('User profile', userProfile);
 * // Sensitive fields will be redacted
 * ```
 */
export function sanitized(label: string, obj: any): void {
  console.log(formatMessage('DATA', label));
  console.log(sanitizeObject(obj));
}

/**
 * Logger namespace export
 * 
 * Provides a clean API: `logger.info()`, `logger.error()`, etc.
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  financial,
  sanitized,
};

// Default export
export default logger;
