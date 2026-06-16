# Finance Tracker Mobile

An offline-first mobile financial tracking application built with Expo React Native. Track income, expenses, transfers, wallets, and categories even without internet. Data syncs to Supabase when connectivity is restored.

## Project Status

✅ **Phase 0 Complete** - Project Setup
- Expo React Native with TypeScript configured
- Expo Router installed and configured
- Folder structure created
- Core dependencies installed
- Environment configuration setup

✅ **Phase 1 Complete** - Local Database Foundation
- SQLite connection implemented
- Migration runner with idempotent execution
- Complete schema with 7 tables and 15 indexes
- Database initialization on app startup
- Offline-first architecture foundations in place

✅ **Phase 2 Complete** - Core Utilities
- UUID utility with validation
- Date utility with ISO timestamps and Indonesian formatting
- Money utility with Rupiah parsing and formatting
- Safe logger utility with auto-sanitization
- Zero external dependencies (uses native APIs)

## Tech Stack

- **Framework**: Expo SDK 56 / React Native 0.85
- **Language**: TypeScript
- **Routing**: Expo Router
- **Local Database**: expo-sqlite
- **Backend**: Supabase (Auth + PostgreSQL)
- **Security**: expo-secure-store

## Prerequisites

- Node.js 18+ installed
- Android Studio (for Android development) or Xcode (for iOS on macOS)
- Physical Android device or Android Emulator

## Installation

1. **Clone the repository**
   ```bash
   cd FinanceTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Running the App

### Start the development server
```bash
npm start
```

Or use a specific port:
```bash
npx expo start --port 8082
```

### Run on Android
```bash
npm run android
```

### Run on iOS (macOS only)
```bash
npm run ios
```

### Run on Web (for testing only - app is designed for mobile)
```bash
npm run web
```

**Note**: The Expo dev server has been verified to start successfully and TypeScript compilation passes. Full Android runtime verification requires testing on a physical device or emulator.

## Project Structure

```
src/
├── app/              # Expo Router pages
├── components/       # Reusable UI components
│   ├── ui/          # Generic UI components
│   └── finance/     # Finance-specific components
├── features/        # Feature modules
│   ├── auth/        # Authentication
│   ├── wallets/     # Wallet management
│   ├── categories/  # Category management
│   ├── transactions/# Transaction management
│   ├── dashboard/   # Dashboard
│   ├── reports/     # Reports
│   └── sync/        # Sync logic
├── lib/             # Core utilities
│   ├── db/          # SQLite database
│   ├── supabase/    # Supabase client
│   ├── network/     # Network detection
│   ├── config/      # Configuration
│   └── utils/       # Utilities
└── tests/           # Test files
    ├── unit/
    └── integration/
```

## Architecture Principles

1. **Offline-First**: Local SQLite is the primary data source
2. **All writes go to SQLite first**, then queued for sync
3. **Client-generated UUIDs** for offline compatibility
4. **Soft deletes** for sync integrity
5. **Asynchronous, retryable sync** to Supabase

## Development Workflow

This project follows a spec-driven development approach:
1. Review `requirements.md` for feature requirements
2. Check `design.md` for architecture decisions
3. Follow `tasks.md` for implementation sequence

## Next Steps

- [x] Phase 0: Project Setup
- [x] Phase 1: Local Database Foundation
- [x] Phase 2: Core Utilities
- [ ] Phase 3: Authentication
- [ ] Phase 4+: Feature implementation

See `tasks.md` for detailed implementation tasks.

## Documentation

- [Requirements](requirements.md) - Product requirements and specifications
- [Design](design.md) - Technical design and architecture
- [Tasks](tasks.md) - Implementation task list

## Security Notes

- Never commit `.env` file to version control
- Store sensitive data only in `expo-secure-store`
- Supabase RLS policies enforce user isolation

## License

See LICENSE file for details.
