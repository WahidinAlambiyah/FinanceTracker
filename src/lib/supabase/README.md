# Supabase Integration

This directory contains the Supabase client configuration and secure session storage for the Finance Tracker app.

## Files

### `client.ts`
- Supabase client singleton instance
- Configured with secure session storage
- Auto-refresh for expired tokens
- Environment variable validation

### `session-storage.ts`
- Secure storage adapter using `expo-secure-store`
- Encrypts auth tokens on device
- Implements Supabase storage interface
- Handles session persistence across app restarts

## Setup

### 1. Environment Configuration

Create a `.env` file in the project root (copy from `.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Never commit `.env` to version control!

### 2. Supabase Project Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from Settings → API
3. Add them to your `.env` file

### 3. Row Level Security (Phase 9+)

Remote financial tables must use the custom `financetracker` schema, not `public`.
Supabase Auth remains managed in the default `auth` schema.

Phase 9B SQL draft:

- `docs/sql/phase9b_financetracker_schema_rls.sql`
- Draft only; it has not been executed in Supabase.
- Review manually before applying.

Planned application tables:

- `financetracker.profiles`
- `financetracker.wallets`
- `financetracker.categories`
- `financetracker.transactions`

When implementing remote schema/RLS, enable RLS on all user-owned application tables:

```sql
ALTER TABLE financetracker.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financetracker.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financetracker.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financetracker.transactions ENABLE ROW LEVEL SECURITY;
```

Policies must ensure users can only select, insert, update, or delete their own rows. For inserts and updates, use `WITH CHECK (auth.uid() = user_id)` on user-owned tables.

Important Phase 9 boundary:

- Do not push or pull financial data during schema/RLS setup.
- Do not process `sync_queue` until Phase 10.
- Keep runtime reads and writes SQLite-first.

## Security

### Token Storage

- **Encrypted**: Auth tokens stored using `expo-secure-store`
- **Hardware-backed**: Uses device keychain/keystore on modern devices
- **Isolated**: Not accessible to other apps
- **Automatic cleanup**: Cleared on app uninstall

### Token Lifecycle

1. **Login**: Supabase Auth validates credentials → Returns session → Stored encrypted
2. **App Restart**: Session loaded from secure storage → Auto-validated
3. **Token Refresh**: Supabase auto-refreshes expired access tokens using refresh token
4. **Logout**: Session cleared from secure storage + Supabase

### Offline Behavior

- **First Login**: Requires internet connection (Supabase validation)
- **Subsequent Access**: Works offline if session token valid
- **Token Expiration**: 
  - Access token: ~1 hour (auto-refreshed when online)
  - Refresh token: ~30-60 days
  - If offline and expired: User must go online to refresh

## Usage

### Import the Client

```typescript
import { supabase } from '@/lib/supabase/client';
```

### Authentication

```typescript
// Register
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
});

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password',
});

// Logout
const { error } = await supabase.auth.signOut();

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Auth State Listener

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // User logged in
  } else if (event === 'SIGNED_OUT') {
    // User logged out
  }
});
```

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- Project `requirements.md` - REQ-AUTH-* and REQ-SEC-* requirements
- Project `design.md` - Authentication design decisions
