# Utilities

Core utility functions for the Finance Tracker app.

## Modules

### UUID (`uuid.ts`)
- `generateUUID()` - Generate RFC 4122 v4 UUIDs for offline records
- `isValidUUID()` - Validate UUID format

### Date (`date.ts`)
- `getCurrentTimestamp()` - Current time as ISO string
- `toISOString()` / `fromISOString()` - Convert between Date and ISO
- `getMonthRange()` / `getCurrentMonthRange()` - Month boundaries for queries
- `formatIndonesianDate()` / `formatIndonesianDateTime()` - Indonesian locale formatting
- `formatShortDate()` - Short date format (dd/MM/yyyy)
- `isToday()` / `getTodayStart()` - Today helpers

### Money (`money.ts`)
- `formatRupiah()` - Format as "Rp 10.000"
- `formatRupiahCompact()` - Compact format "Rp 1,5 Jt"
- `formatAmountOnly()` - Number only (no currency symbol)
- `parseRupiahInput()` - Parse user input (handles "10k", "1.5jt", etc.)
- `validateAndParseAmount()` - Parse + validate in one step
- `isValidAmount()` - Validate amount > 0 and integer

### Logger (`logger.ts`)
- `logger.debug()` - Debug messages (dev only)
- `logger.info()` - Informational messages
- `logger.warn()` - Warnings
- `logger.error()` - Errors
- `logger.financial()` - Safe financial logging (limited data)
- `logger.sanitized()` - Sanitize and log objects
- Automatically redacts: passwords, tokens, secrets, sessions

## Usage Examples

```typescript
import { 
  generateUUID, 
  getCurrentTimestamp, 
  formatRupiah, 
  logger 
} from '@/lib/utils';

// Generate ID
const walletId = generateUUID();

// Get timestamp
const createdAt = getCurrentTimestamp();

// Format money
const display = formatRupiah(150000); // "Rp 150.000"

// Safe logging
logger.info('Wallet created', { id: walletId });
logger.financial('Transaction', 'expense', { id: 'tx123', type: 'expense' });
```

## Design Principles

- ✅ Framework-light (uses native JS/Intl APIs)
- ✅ No external date/formatting libraries
- ✅ Testable pure functions
- ✅ Security-conscious (safe logging)
- ✅ Indonesian locale support
- ✅ Offline-compatible
