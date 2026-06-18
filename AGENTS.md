# AGENTS.md

# AI Agent & Developer Guide

This document guides Kiro AI Agent, future AI agents, and human developers to maintain architectural consistency, coding standards, and UI/UX design coherence throughout the Finance Tracker Mobile project.

---

## Project Mission

Build a serious **offline-first mobile financial tracking application** using Expo React Native.

### Core Objectives

1. **Offline-First Architecture**: App must work fully offline. Local SQLite is the primary runtime data source.
2. **Expo React Native + TypeScript**: Modern, type-safe mobile development.
3. **SQLite as Source of Truth**: All financial data lives locally first.
4. **Supabase for Backend**: Used for authentication, backup, and multi-device sync only.
5. **Platform Priority**: Android first (MVP target), iOS-ready architecture for future release.
6. **User-Centric**: Simple, fast, mobile-optimized financial tracking for daily use.

---

## Non-Negotiable Architecture Rules

These rules **MUST NOT** be violated. They are foundational to the offline-first design.

### 1. All Financial Writes Go to SQLite First

- **NEVER** write wallet, category, or transaction data directly to Supabase.
- **ALWAYS** write to local SQLite first, then add to `sync_queue`.
- Sync to Supabase happens asynchronously through the approved manual sync flow.
- If sync fails, data remains local and is retried later.

### 2. Never Bypass SQLite

- Do not store financial records only in memory (Zustand/Context/state).
- Do not cache financial data in a way that bypasses SQLite as the source of truth.
- UI must always read from SQLite (via repositories).

### 3. Client-Generated UUIDs

- All records (wallets, categories, transactions) must use client-generated UUIDs.
- Use `src/lib/utils/uuid.ts` `generateUUID()` function.
- UUIDs enable offline record creation without server coordination.

### 4. Store Money as INTEGER Rupiah

- **NEVER** use floating-point numbers for money.
- Store amounts as integers in minor units (Rupiah has no cents).
- Example: Rp 10.000 is stored as `10000`.
- Use `src/lib/utils/money.ts` for formatting and parsing.

### 5. Use ISO Timestamps

- All dates/times must be stored as ISO 8601 strings.
- Use `src/lib/utils/date.ts` `getCurrentTimestamp()` for consistency.
- Timezone behavior: Store in UTC-based ISO, display in local time.

### 6. Soft Delete via `deleted_at`

- **NEVER** hard-delete records from SQLite.
- Mark records as deleted using `deleted_at` timestamp.
- Soft deletes enable sync reconciliation and conflict resolution.

### 7. Use `sync_queue` for Offline Changes

- Every create/update/delete operation must add an entry to `sync_queue`.
- Sync service processes the queue when online.
- Failed sync attempts remain in queue for retry.

### 8. Keep Supabase Sync Asynchronous and Retryable

- Sync must not block user actions.
- Failed syncs must not lose data.
- Sync errors must be logged, not shown as blocking errors to users.

### 9. Do Not Add Advanced Features Before MVP Foundations

- Finish MVP acceptance criteria before adding:
  - Recurring transactions
  - Budgeting
  - Receipt OCR
  - Family/shared finance
  - Investment tracking
  - Advanced conflict resolution UI
- Keep MVP **simple, stable, and complete**.

### 10. Supabase Custom Schema for Application Tables

- **All application tables use custom schema**: `financetracker`
- **Supabase Auth remains in default**: `auth.users` (managed by Supabase)
- **Application table structure** (implemented from Phase 9+):
  - `financetracker.profiles`
  - `financetracker.wallets`
  - `financetracker.categories`
  - `financetracker.transactions`
- **Benefits**:
  - Clean separation from Supabase managed tables
  - Easier migrations and schema management
  - Clear ownership and namespace isolation
- **Implementation**: Phase 9 (Supabase Remote Schema and RLS), followed by Phase 10 manual sync.
- **Current Phase**: Phase 11E release-readiness cleanup. Phase 10 Full Sync MVP is closed; Phase 11D still has deferred checks for two-device convergence and expired-session behavior.

---

## Code Organization Rules

Follow the established folder structure strictly.

### Folder Structure

```
src/
├── app/                    # Expo Router screens/pages
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home/entry screen
│   ├── (auth)/            # Auth group (login, register)
│   └── (tabs)/            # Main tabs (dashboard, transactions, etc.)
│
├── components/            # Reusable UI components
│   ├── ui/               # Generic UI components (buttons, cards, inputs)
│   └── finance/          # Finance-specific components (AmountInput, TransactionCard)
│
├── features/             # Feature modules (business logic)
│   ├── auth/            # Authentication logic
│   ├── wallets/         # Wallet management
│   ├── categories/      # Category management
│   ├── transactions/    # Transaction management
│   ├── dashboard/       # Dashboard logic
│   ├── reports/         # Reports logic
│   └── sync/            # Sync orchestration
│
├── lib/                  # Core infrastructure
│   ├── db/              # SQLite (connection, migrations, schema)
│   ├── supabase/        # Supabase client and session storage
│   ├── network/         # Network status detection
│   ├── config/          # Environment configuration
│   └── utils/           # Framework-light utilities (UUID, date, money, logger)
│
└── tests/               # Test files
    ├── unit/
    └── integration/
```

### Rules

1. **Do NOT put business logic directly inside screen files** (`src/app/*`).
   - Screens are for UI and navigation only.
   - Logic goes in `src/features/*` (services, repositories, models).

2. **Keep repositories, services, models, and utilities separated**.
   - Repository: SQLite data access layer.
   - Service: Business logic and orchestration.
   - Model: TypeScript types/interfaces.
   - Utility: Pure helper functions.

3. **Prefer small targeted changes over large rewrites**.
   - Incremental improvements are safer.
   - Do not rewrite entire modules unless absolutely necessary.

4. **Use feature-based organization** (`src/features/*`).
   - Each feature owns its own models, repositories, services, schemas.
   - Example: `src/features/wallets/wallet.repository.ts`, `wallet.service.ts`, `wallet.model.ts`.

---

## Dependency Rules

Minimize dependencies. Prefer native APIs.

### Rules

1. **Do NOT add new dependencies unless clearly justified**.
   - Explain why the dependency is necessary.
   - Consider bundle size impact.
   - Prefer native JavaScript/React Native APIs when sufficient.

2. **Prefer native Date/Intl APIs unless complexity requires a library**.
   - Current utilities use native APIs (zero dependencies).
   - Add `date-fns` only if complex date operations are needed (e.g., date arithmetic, relative time).

3. **Prefer `npx expo install` for Expo-managed packages**.
   - Expo manages SDK compatibility.
   - Using `npm install` directly can cause version conflicts.

4. **Do NOT run `npm audit fix` automatically**.
   - It can break Expo dependency compatibility.
   - Only run with user approval after reviewing changes.

5. **Current approved dependencies** (as of Phase 2):
   - `expo` and Expo SDK packages
   - `expo-sqlite` (local database)
   - `@supabase/supabase-js` (backend client)
   - `expo-secure-store` (secure storage)
   - `expo-crypto` (UUID generation)
   - `react-native` and related packages
   - TypeScript and type definitions

6. **Future dependencies** (not yet added):
   - React Hook Form (forms)
   - Zod (validation)
   - Optional: NativeWind or Tamagui (UI styling)
   - Optional: date-fns (if native Date is insufficient)

---

## Security Rules

Security is non-negotiable. Follow these rules strictly.

### 1. Never Commit `.env`

- `.env` file must be in `.gitignore`.
- Only commit `.env.example` with placeholder values.
- Real Supabase URL, anon key, and secrets must not be committed.

### 2. Never Log Sensitive Data

**Prohibited in logs:**
- Passwords
- Tokens (access, refresh, API keys)
- Auth sessions
- Authorization headers
- Secrets or private keys
- Full financial transaction payloads in production

**Use `src/lib/utils/logger.ts`:**
- Object fields are auto-sanitized.
- Message strings are pattern-sanitized.
- Stack traces only logged in `__DEV__` mode.

**Examples:**
```typescript
// ✅ GOOD
logger.info('User authenticated', { userId: '123' });

// ❌ BAD - token in message
logger.info(`Token: ${token}`);

// ❌ BAD - password in object (will be redacted, but still bad practice)
logger.info('User data', { email, password }); // Don't do this!
```

### 3. Do Not Display Raw Technical Errors to Users

- Show generic user-friendly messages.
- Log technical details for developers (console/monitoring).
- Example: "Failed to initialize local database. Please restart the app."

### 4. Supabase RLS Must Not Be Disabled

- Row Level Security (RLS) must be enabled on all user tables.
- Users must only access their own data.
- Policies: users can select/insert/update/delete only their own records.

### 5. Future Database Writes Must Use Parameterized APIs

- **NEVER** use string interpolation for SQL with user input.
- Current migration runner uses `execAsync()` for static schema SQL only (safe).
- Future repositories must use:
  - `runAsync(sql, params)` - parameterized queries
  - `prepareAsync(sql)` - prepared statements
  - `getFirstAsync(sql, params)` - safe single-row query
  - `getAllAsync(sql, params)` - safe multi-row query

**Example:**
```typescript
// ✅ GOOD - parameterized
await db.runAsync('INSERT INTO wallets (id, name) VALUES (?, ?)', [id, name]);

// ❌ BAD - string interpolation (SQL injection risk)
await db.execAsync(`INSERT INTO wallets (id, name) VALUES ('${id}', '${name}')`);
```

---

## Kiro AI Agent Usage/Credit Rules

Optimize AI agent usage to minimize unnecessary credit consumption.

### Rules

1. **Do NOT run terminal commands automatically unless explicitly asked**.
   - Do not run `npx tsc --noEmit` automatically.
   - Do not run `npx expo start` automatically.
   - Do not run `npm test` or `npm run lint` automatically.

2. **Do NOT run repeated run-fix-run loops**.
   - Make changes, then provide manual verification commands.
   - Let the user run commands manually.
   - If there's an error, user will paste it back.

3. **Provide manual verification commands instead**.
   - After making changes, list commands for the user to run.
   - Example:
     ```bash
     npx tsc --noEmit
     npx expo start --port 8082
     git status
     ```

4. **Let the user run commands manually and paste errors back**.
   - Do not assume commands pass.
   - Wait for user feedback on errors before attempting fixes.

---

## Documentation Rules

Keep documentation synchronized with code.

### Rules

1. **Keep `tasks.md` updated after every completed task**.
   - Mark tasks as `[x]` when completed.
   - Leave tasks as `[ ]` when not done.

2. **If extra work is done outside the checklist, add it under "Additional Completed Tasks"**.
   - Do not silently do work without documenting it.
   - Add a new section in `tasks.md` for extra tasks.

3. **Update README or phase summary docs when status changes**.
   - Update completion status after each phase.
   - Keep installation instructions accurate.

4. **Do NOT claim Android runtime success unless tested on a real device or emulator**.
   - It's okay to say: "Expo dev server starts successfully and TypeScript passes."
   - Only say "Tested on Android device" if actually tested.

5. **Document architectural decisions**.
   - If you deviate from `design.md`, explain why and update the document.
   - If you add a new pattern, document it.

---

## UI/UX Design System

All screens must share a consistent visual language. Do not create screens with random colors or layouts.

### Theme

**Primary Theme Color: Blue**
- Use a calm, professional finance/productivity feel.
- Avoid bright neon colors.
- Avoid random colors per screen (e.g., green dashboard, red transactions screen).

### Color Palette

Use these colors consistently across all screens:

| Color Purpose       | Hex Code | Usage |
|---------------------|----------|-------|
| **Primary Blue**    | `#2563EB` | Primary actions, active states, primary buttons |
| **Dark Blue**       | `#1E40AF` | Hover states, pressed states, emphasis |
| **Light Blue BG**   | `#EFF6FF` | Subtle backgrounds, info badges |
| **Surface/Card**    | `#FFFFFF` | Cards, modals, elevated surfaces |
| **App Background**  | `#F8FAFC` | Screen backgrounds (light gray) |
| **Text Primary**    | `#0F172A` | Main text, headings |
| **Text Secondary**  | `#64748B` | Helper text, labels, subtitles |
| **Success (Income)**| `#16A34A` | Income transactions, success states |
| **Warning**         | `#F59E0B` | Pending sync, warnings |
| **Danger (Expense)**| `#DC2626` | Expense transactions, errors, deletes |

### Layout Rules

**Mobile-First Design:**
- Optimize for one-handed use.
- Use consistent screen padding: **16px or 20px**.
- Use cards for grouped information.
- Use rounded corners consistently: **8px or 12px**.
- Use clear empty states with helpful messages.
- Main action should be obvious (e.g., "Add Transaction" FAB).

**Screen Structure:**
```
┌─────────────────────────────────┐
│  [Header/Title]                 │  ← Padding: 16-20px
│                                 │
│  ┌───────────────────────────┐ │
│  │  Card 1                   │ │  ← Card with padding
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Card 2                   │ │
│  └───────────────────────────┘ │
│                                 │
│             [FAB +]             │  ← Floating Action Button
└─────────────────────────────────┘
```

### Typography Rules

Use consistent font sizes and hierarchy:

| Element         | Size    | Weight | Usage |
|-----------------|---------|--------|-------|
| Screen Title    | 24-32px | Bold   | Page heading |
| Section Title   | 18-20px | Semibold | Section headings |
| Body Text       | 14-16px | Regular | Main content |
| Helper Text     | 12-14px | Regular | Labels, captions |

**Rules:**
- Use bold only for hierarchy, not everywhere.
- Avoid all-caps except for small labels.
- Use consistent line-height for readability.

### Component Consistency

**Create reusable components before duplicating UI.**

**Required Reusable Components:**
- `AppScreen` - Screen container with consistent padding
- `AppCard` - Card component with shadow and rounded corners
- `AppButton` - Primary, secondary, text button variants
- `AppTextInput` - Text input with label and error state
- `SyncStatusBadge` - Shows synced/pending/failed state
- `EmptyState` - Consistent empty state with icon and message
- `AmountText` - Formatted Rupiah amount display
- `TransactionCard` - Transaction list item
- `WalletCard` - Wallet display card
- `CategoryIcon` - Category icon display

**Do NOT:**
- Create each screen with unrelated colors/layouts.
- Use different button styles on each screen.
- Use different card designs on each screen.

**Example:**
```typescript
// ✅ GOOD - Consistent
<AppScreen>
  <AppCard>
    <Text>Dashboard</Text>
  </AppCard>
</AppScreen>

// ❌ BAD - Inconsistent
<View style={{ padding: 10 }}>  {/* Different padding */}
  <View style={{ backgroundColor: 'red' }}>  {/* Random color */}
    <Text>Dashboard</Text>
  </View>
</View>
```

### Finance UI Rules

**Color Usage:**
- **Income**: Use success color (`#16A34A` green)
- **Expense**: Use danger color (`#DC2626` red)
- **Transfer**: Use neutral/primary color
- **Pending Sync**: Use warning color (`#F59E0B` amber) with badge
- **Synced State**: Subtle indicator, not visually noisy

**Amount Display:**
- Amounts should be easy to scan.
- Use `formatRupiah()` from `src/lib/utils/money.ts`.
- Right-align amounts in lists.
- Use bold or larger size for primary amounts.

**Dashboard Metrics:**
- Do not overload the dashboard with too many metrics in MVP.
- Show: Total Balance, Monthly Income, Monthly Expense, Net Cashflow.
- Keep it simple and scannable.

### Visual Consistency Across Screens

**All screens must use the same theme:**
- Dashboard: Blue theme with finance metrics
- Wallets: Blue theme with wallet cards
- Transactions: Blue theme with transaction list
- Reports: Blue theme with charts/summaries
- Settings: Blue theme with menu items

**Acceptable variations:**
- Use lighter blue backgrounds for alternate sections.
- Use success/danger colors for income/expense highlights.
- Use warning color for sync status.

**Not acceptable:**
- Dashboard in blue, Wallets in green, Transactions in red.
- Completely different card designs per screen.
- Different button styles per feature.

---

## Phase Discipline

Follow the phase sequence strictly. Do not skip ahead.

### Rules

1. **Do NOT proceed to the next phase without user review**.
   - After completing a phase, wait for user approval.
   - User may request changes or clarifications.

2. **Do NOT implement Phase 3 tasks until Phase 2 is reviewed and approved**.
   - Respect the phase boundaries.
   - Phases ensure incremental, reviewable progress.

3. **Keep MVP small and stable**.
   - Finish MVP acceptance criteria before adding enhancements.
   - MVP acceptance criteria are listed in `requirements.md` Section 9.

4. **Current Phase Status**:
   - Phase 0-10: Complete through Full Sync MVP.
   - Phase 11A-11D: Hardening and manual QA mostly complete, with 11D.3 two-device convergence and 11D.4 expired-session behavior deferred.
   - Phase 11E: Release-readiness cleanup in progress.

5. **Historical Phase Status** (superseded):
   - ✅ Phase 0: Project Setup - Complete
   - ✅ Phase 1: Local Database Foundation - Complete
   - ✅ Phase 2: Core Utilities - Complete
   - ⏸️ Phase 3: Authentication - **NOT STARTED** (awaiting approval)

---

## Related Documentation

- **`requirements.md`**: Product requirements and functional specifications
- **`design.md`**: Technical architecture and design decisions
- **`tasks.md`**: Implementation task checklist
- **`README.md`**: Project overview and setup instructions
- **`PHASE*_SUMMARY.md`**: Phase completion summaries

If this guide becomes too long, consider splitting UI/UX rules into:
- `docs/ui-style-guide.md` - Detailed UI/UX guidelines
- `docs/coding-standards.md` - Detailed coding conventions

For now, this single `AGENTS.md` file is the authoritative guide.

---

## AI Collaboration and Credit Efficiency Rules

This section defines the role split between **User**, **ChatGPT**, and **Kiro** to optimize collaboration and minimize unnecessary AI credit usage.

### User Responsibilities

The **User** should handle:

1. **Terminal Commands**: Running all terminal commands manually (`npx`, `npm`, `git`, etc.)
2. **Manual Testing**: Testing app on device/emulator, checking functionality
3. **Small Markdown Edits**: Minor documentation updates (typo fixes, formatting)
4. **Typo Fixes**: Correcting spelling and grammar errors
5. **Duplicate Line Removal**: Cleaning up duplicate documentation lines
6. **Git Operations**: Commit, push, and branch management
7. **Commit Review**: Sending commit hash for review after implementation
8. **Decision Making**: Final approval for phases, features, and architectural changes

**Why**: These tasks are quick for humans but consume AI credits unnecessarily.

---

### ChatGPT Responsibilities

**ChatGPT** (non-coding AI assistant) should handle:

1. **GitHub Commit Review**: Reviewing commits from GitHub UI, checking file changes
2. **Phase Boundary Checking**: Ensuring phase scope is respected (no Phase 9 work in Phase 8)
3. **Strict Prompt Preparation**: Creating detailed, scoped prompts for Kiro
4. **Kiro Output Review**: Analyzing Kiro's code output for correctness and scope compliance
5. **Log and Error Analysis**: Reviewing error logs, suggesting root cause
6. **Manual Test Checklists**: Creating step-by-step manual testing procedures
7. **Credit Efficiency Decisions**: Deciding whether Kiro is needed or user can handle task
8. **Documentation Review**: Checking documentation for completeness and accuracy

**Why**: ChatGPT can analyze, plan, and review without consuming expensive coding credits.

---

### Kiro Responsibilities

**Kiro** (AI coding agent) should be used **ONLY** for:

1. **Multi-File Coding Implementation**: Complex features spanning multiple files
2. **Complex Debugging**: Issues requiring code analysis across repositories/services
3. **Repository/Service/Screen Implementation**: Creating new feature modules
4. **Test Automation**: Writing tests **when explicitly requested by user**
5. **Refactoring**: Code improvements **only when explicitly requested**
6. **Documentation Updates**: Large documentation tasks **only when explicitly requested and worth the credit**

**Why**: Kiro consumes significant credits. Reserve for tasks requiring code generation and complex analysis.

---

### Kiro Credit-Efficiency Rules

**Do NOT use Kiro for:**

1. **Tiny Documentation Cleanup**:
   - Typo fixes (User handles)
   - Duplicate line removal (User handles)
   - Checklist text changes (User handles)
   - Markdown formatting (User handles)

2. **Unnecessary File Inspection**:
   - Do not read unrelated files unless needed for the task
   - Do not inspect entire repository for small changes
   - Keep file reads focused and minimal

3. **Unsolicited Improvements**:
   - Do not refactor unless explicitly requested
   - Do not improve unrelated code
   - Do not add features beyond the approved scope
   - Do not optimize prematurely

4. **Automatic Operations**:
   - Do not run terminal commands automatically (User runs manually)
   - Do not add dependencies without explicit approval
   - Do not add migrations without explicit approval
   - Do not implement next phase without explicit approval

5. **Verbose Reporting**:
   - Report only relevant changed files
   - Keep verification notes concise
   - Do not repeat entire file contents in summaries
   - Provide manual commands for user to run

**Golden Rule**: If a task takes **User 30 seconds**, do not use Kiro (credits are expensive).

---

### Phase Boundary Rules

These rules ensure incremental, reviewable progress:

1. **Each Phase Must Be Completed Before Moving Forward**:
   - Implementation → Review → Manual Testing → Documentation → Approval
   - User must explicitly approve before proceeding to next phase

2. **Planning the Next Phase**:
   - **Allowed**: Create implementation plan for next phase after current phase completes
   - **NOT Allowed**: Implement next phase without explicit approval

3. **Implementation Restrictions**:
   - Do not implement Phase 9 until Phase 8 is approved
   - Do not implement Phase 10 until Phase 9 is approved
   - Do not skip phases (e.g., jump from Phase 7 to Phase 9)

4. **Offline-First Principle** (Foundational):
   - Runtime data **must** come from local SQLite first
   - Supabase sync/schema/RLS only in approved phases
   - Do not bypass SQLite for financial data

5. **Scope Discipline**:
   - Keep changes minimal and scoped to current phase
   - Do not add "nice-to-have" features beyond phase scope
   - Do not refactor unrelated code during phase implementation

6. **Review and Approval Gate**:
   - After phase completion, user reviews commit in GitHub
   - User manually tests on device/emulator
   - User sends commit hash for final review
   - User provides explicit approval before next phase

**Example Phase Flow**:
```
Phase 7 Complete → User Approves
  ↓
Phase 8 Planning → User Reviews Plan → User Approves Plan
  ↓
Phase 8 Implementation → Kiro Implements
  ↓
Phase 8 Testing → User Tests Manually → Reports Results
  ↓
Phase 8 Documentation → Kiro Updates Docs
  ↓
Phase 8 Review → User Reviews Commit → Sends Hash
  ↓
Phase 8 Approval → User Approves → Phase 8 Closed
  ↓
Phase 9 Planning (repeat cycle)
```

---

### Important Restrictions (Always Enforced)

**Documentation Only vs. Code Changes**:
- When user says "documentation only", do NOT change:
  - Application code (`src/app`, `src/features`, `src/components`, `src/lib`)
  - `package.json` or `package-lock.json`
  - Database migrations
  - Dependencies

**Dependency Management**:
- Do NOT add dependencies without explicit user approval
- Always ask before installing packages
- Document dependency justification in implementation plan

**Migration Management**:
- Do NOT add database migrations without explicit user approval
- Migrations must be reviewed before execution
- Document migration necessity and impact

**Formula and Behavior Preservation**:
- Do NOT change wallet/category/transaction behavior unless explicitly requested
- Do NOT change dashboard/report formulas unless explicitly requested
- Do NOT change sync behavior unless explicitly requested
- Balance calculation must remain derived (never stored, never mutated)

---

### Credit Efficiency Examples

**❌ BAD - Wastes Kiro Credits**:
- User: "Fix typo in AGENTS.md line 42"
- Kiro: Reads entire AGENTS.md, fixes typo, regenerates file
- **Cost**: Expensive (Kiro credits for simple task)
- **Better**: User fixes typo manually in 10 seconds

**✅ GOOD - Efficient**:
- User: "Implement Phase 8 network detection with NetInfo"
- Kiro: Implements network service, expands repositories, creates components
- **Cost**: Justified (complex multi-file implementation)

**❌ BAD - Unnecessary Inspection**:
- User: "Add comment to network.service.ts"
- Kiro: Reads dashboard.tsx, settings.tsx, all repos, all components
- **Cost**: Wasted reads on unrelated files

**✅ GOOD - Focused**:
- User: "Add comment to network.service.ts"
- Kiro: Reads only network.service.ts, adds comment
- **Cost**: Minimal and focused

---

### Collaboration Decision Tree

**Is the task simple?** (Typo fix, small doc edit, markdown formatting)
- → **User handles** (30 seconds for human)

**Is the task analytical?** (Review commit, check phase scope, analyze error log)
- → **ChatGPT handles** (no coding credits needed)

**Is the task complex?** (Multi-file implementation, complex debugging, new feature)
- → **Kiro handles** (coding credits justified)

**Is the task manual?** (Run commands, test on device, commit/push)
- → **User handles** (AI cannot access device/terminal)

---

### Summary

**User**: Manual operations, testing, git, small edits  
**ChatGPT**: Analysis, planning, review, decision support  
**Kiro**: Complex coding, multi-file implementation, debugging  

**Goal**: Minimize AI credit usage while maintaining high code quality and productivity.

---

## How to Use This Guide

### For Kiro AI Agent:
1. Read this guide before starting any new phase.
2. Follow non-negotiable rules strictly.
3. Refer to architecture rules when making design decisions.
4. Use the UI/UX design system for all screen implementations.
5. Respect phase discipline - do not skip phases.

### For Human Developers:
1. Use this as the project's coding and architecture standards.
2. When in doubt, follow this guide over personal preferences.
3. Update this guide if new patterns or rules are established.
4. Ensure all PRs comply with these rules.

### For Future AI Agents:
1. This guide represents the project's established patterns.
2. Do not deviate without explicit user approval.
3. When uncertain, ask the user rather than guessing.
4. Update this document when new patterns are agreed upon.

---

**Last Updated**: Phase 11E Release Readiness Cleanup  
**Status**: Authoritative guide for all contributors (AI and human)
