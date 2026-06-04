/**
 * Money Utility
 * 
 * Handles Indonesian Rupiah (IDR) formatting and parsing.
 * 
 * Storage Strategy:
 * - Database stores money as INTEGER (minor units - no decimal places for Rupiah)
 * - Example: Rp 10.000 is stored as 10000
 * - This avoids floating-point precision issues
 * 
 * Uses native Intl.NumberFormat - no external dependencies needed.
 */

/**
 * Format an integer amount as Indonesian Rupiah currency string
 * 
 * @param amount - Amount in minor units (e.g., 10000 for Rp 10.000)
 * @returns Formatted currency string (e.g., "Rp 10.000")
 * 
 * @example
 * ```typescript
 * formatRupiah(10000);    // "Rp 10.000"
 * formatRupiah(1500000);  // "Rp 1.500.000"
 * formatRupiah(0);        // "Rp 0"
 * formatRupiah(-5000);    // "-Rp 5.000"
 * ```
 */
export function formatRupiah(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Rp 0';
  }
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format an integer amount as compact Indonesian Rupiah (with K, M, B suffix)
 * 
 * Useful for displaying large amounts in limited space.
 * 
 * @param amount - Amount in minor units
 * @returns Compact formatted string (e.g., "Rp 1,5 Jt" for 1.500.000)
 * 
 * @example
 * ```typescript
 * formatRupiahCompact(1500);       // "Rp 1.500"
 * formatRupiahCompact(150000);     // "Rp 150 rb"
 * formatRupiahCompact(1500000);    // "Rp 1,5 Jt"
 * formatRupiahCompact(1500000000); // "Rp 1,5 M"
 * ```
 */
export function formatRupiahCompact(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Rp 0';
  }
  
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  // Less than 1 million - show full amount
  if (absAmount < 1_000_000) {
    return formatRupiah(amount);
  }
  
  // Million (Juta)
  if (absAmount < 1_000_000_000) {
    const millions = absAmount / 1_000_000;
    return `${sign}Rp ${millions.toFixed(1).replace('.', ',')} Jt`;
  }
  
  // Billion (Miliar)
  const billions = absAmount / 1_000_000_000;
  return `${sign}Rp ${billions.toFixed(1).replace('.', ',')} M`;
}

/**
 * Parse user input string to integer amount
 * 
 * Handles various input formats:
 * - "10000" -> 10000
 * - "10.000" -> 10000
 * - "10,000" -> 10000
 * - "Rp 10.000" -> 10000
 * - "10k" or "10rb" -> 10000
 * - "1.5jt" or "1.5m" -> 1500000
 * 
 * @param input - User input string
 * @returns Parsed integer amount, or null if invalid
 * 
 * @example
 * ```typescript
 * parseRupiahInput("10000");      // 10000
 * parseRupiahInput("Rp 10.000");  // 10000
 * parseRupiahInput("10k");        // 10000
 * parseRupiahInput("10rb");       // 10000
 * parseRupiahInput("1.5jt");      // 1500000
 * parseRupiahInput("abc");        // null
 * parseRupiahInput("");           // null
 * ```
 */
export function parseRupiahInput(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  // Remove common currency symbols and whitespace
  let cleaned = input
    .trim()
    .toLowerCase()
    .replace(/rp\.?/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, ''); // Remove commas (English format)
  
  // Handle shorthand suffixes
  let multiplier = 1;
  
  if (cleaned.endsWith('k') || cleaned.endsWith('rb') || cleaned.endsWith('ribu')) {
    multiplier = 1_000;
    cleaned = cleaned.replace(/(k|rb|ribu)$/, '');
  } else if (cleaned.endsWith('jt') || cleaned.endsWith('juta')) {
    multiplier = 1_000_000;
    cleaned = cleaned.replace(/(jt|juta)$/, '');
  } else if (cleaned.endsWith('m') || cleaned.endsWith('miliar')) {
    multiplier = 1_000_000_000;
    cleaned = cleaned.replace(/(m|miliar)$/, '');
  }
  
  // Replace Indonesian decimal separator (.) with standard (.)
  // This handles both "10.000" (Indonesian thousands) and "1.5" (decimal)
  // We need to be careful here - if there are multiple dots, it's thousands separator
  const dotCount = (cleaned.match(/\./g) || []).length;
  
  if (dotCount > 1) {
    // Multiple dots means thousands separator - remove them all
    cleaned = cleaned.replace(/\./g, '');
  } else if (dotCount === 1) {
    // Single dot - could be decimal or thousands
    // If there are digits after the dot and they're <= 2, treat as decimal
    // Otherwise, treat as thousands separator
    const parts = cleaned.split('.');
    if (parts[1] && parts[1].length <= 2) {
      // Treat as decimal (for multiplier input like "1.5jt")
      cleaned = parts[0] + '.' + parts[1];
    } else {
      // Treat as thousands separator
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  // Parse as float (to handle decimal multipliers like "1.5jt")
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    return null;
  }
  
  // Apply multiplier and round to integer
  const result = Math.round(parsed * multiplier);
  
  return result;
}

/**
 * Validate if an amount is valid for a transaction
 * 
 * Rules:
 * - Must be a number
 * - Must be greater than 0
 * - Must be an integer (no decimals in stored value)
 * 
 * @param amount - Amount to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * ```typescript
 * isValidAmount(10000);   // true
 * isValidAmount(0);       // false (must be > 0)
 * isValidAmount(-5000);   // false (must be > 0)
 * isValidAmount(10.5);    // false (must be integer)
 * isValidAmount(NaN);     // false
 * ```
 */
export function isValidAmount(amount: number): boolean {
  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    Number.isInteger(amount) &&
    amount > 0
  );
}

/**
 * Validate and parse user input for transaction amount
 * 
 * Combines parsing and validation in one step.
 * Returns parsed integer amount or null if invalid.
 * 
 * @param input - User input string
 * @returns Validated integer amount, or null if invalid
 * 
 * @example
 * ```typescript
 * validateAndParseAmount("10000");      // 10000
 * validateAndParseAmount("Rp 10.000");  // 10000
 * validateAndParseAmount("0");          // null (amount must be > 0)
 * validateAndParseAmount("-5000");      // null (amount must be > 0)
 * validateAndParseAmount("abc");        // null (invalid format)
 * ```
 */
export function validateAndParseAmount(input: string): number | null {
  const parsed = parseRupiahInput(input);
  
  if (parsed === null || !isValidAmount(parsed)) {
    return null;
  }
  
  return parsed;
}

/**
 * Format amount without currency symbol (just the number)
 * 
 * Useful for input fields that show the currency symbol separately.
 * 
 * @param amount - Amount in minor units
 * @returns Formatted number string (e.g., "10.000" for 10000)
 * 
 * @example
 * ```typescript
 * formatAmountOnly(10000);    // "10.000"
 * formatAmountOnly(1500000);  // "1.500.000"
 * ```
 */
export function formatAmountOnly(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0';
  }
  
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
