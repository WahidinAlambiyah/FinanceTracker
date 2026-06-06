# Phase 8 Implementation Plan — Network and Sync Foundation

**Status**: ⏸️ Planning (Awaiting Approval)  
**Date**: Phase 8 Planning  
**Dependencies**: Phase 7 Complete ✅

---

## Executive Summary

Phase 8 implements **local sync foundation and network detection only**. This phase prepares the infrastructure for future remote sync (Phase 10+) but does NOT push or pull data from Supabase yet. The app behavior remains unchanged from user perspective - fully offline-first.

**Core Principles:**
- Detect network online/offline state
- Expand sync queue repository with query/update methods
- Implement sync metadata repository for tracking sync state
- Create sync status badge UI component
- Display sync status in dashboard/settings (visual only)
- **NO remote sync processing** (deferred to Phase 10)
- **NO Supabase schema/RLS** (deferred to Phase 9)
- **NO data push/pull** (deferred to Phase 10/11)
- All data remains local SQLite only

---

## Phase 8 Implementation Rules (Non-Negotiable)

These rules **MUST** be followed during Phase 8 implementation.

### 1. Network Detection Only

**Rules:**
- ✅ Detect online/offline network state
- ✅ Expose current connectivity state to app
- ✅ Log network state changes
- ❌ Do NOT automatically trigger sync on network change (Phase 10)
- ❌ Do NOT process sync queue on network change (Phase 10)
- ❌ Do NOT show network alerts/toasts (Phase 12)

### 2. Sync Queue Repository Expansion

**Rules:**
- ✅ Reuse existing `sync_queue` table (no schema changes)
- ✅ Add query methods (findPending, findFailed, findByStatus)
- ✅ Add update methods (markProcessing, markSuccess, markFailed)
- ✅ Add retry count increment method
- ❌ Do NOT implement remote push logic (Phase 10)
- ❌ Do NOT call Supabase from repository (Phase 10)

### 3. Sync Metadata Repository

**Rules:**
- ✅ Reuse existing `sync_metadata` table (no schema changes)
- ✅ Implement get/set methods for key-value storage
- ✅ Store `last_sync_at` timestamp (for Phase 11)
- ❌ Do NOT implement pull sync logic (Phase 11)
- ❌ Do NOT query Supabase for remote changes (Phase 11)

### 4. Sync Status Badge Component

**Rules:**
- ✅ Create reusable UI component for sync status
- ✅ Display states: synced, pending, failed, offline
- ✅ Color coding: green (synced), amber (pending), red (failed), gray (offline)
- ✅ Small, non-intrusive badge design
- ❌ Do NOT make badge interactive/clickable (Phase 12)
- ❌ Do NOT implement retry button (Phase 12)

### 5. Dashboard/Settings Sync Display

**Rules:**
- ✅ Dashboard: Show network status badge (online/offline)
- ✅ Settings: Display last sync time (placeholder "Never synced" for now)
- ✅ Settings: Display pending queue count
- ❌ Do NOT add "Sync Now" button yet (Phase 10)
- ❌ Do NOT show sync progress indicator (Phase 10)
- ❌ Do NOT implement automatic sync (Phase 10)

### 6. No Remote Sync Processing

**Critical Rules:**
- ❌ Do NOT push data to Supabase
- ❌ Do NOT pull data from Supabase
- ❌ Do NOT create Supabase schema/RLS
- ❌ Do NOT implement conflict resolution
- ❌ Do NOT process sync queue to remote
- ❌ Do NOT call Supabase API (except auth, already implemented)
- ❌ Do NOT implement remote repositories
- ❌ Do NOT implement sync orchestration service

### 7. Existing App Behavior Unchanged

**Rules:**
- ✅ App remains fully offline-first
- ✅ All writes go to local SQLite only
- ✅ Sync queue continues to accumulate pending items
- ✅ Users can create/edit/delete records without network
- ✅ No functional changes to wallet/category/transaction flows
- ✅ Dashboard and reports remain local SQLite only

### 8. Dependency Rules

**Rules:**
- ✅ Prefer native React Native NetInfo if available in Expo SDK
- ❌ Do NOT add external dependencies without explicit approval
- ✅ If NetInfo requires `@react-native-community/netinfo`, propose first
- ✅ Document dependency justification in plan

### 9. Service and Repository Rules

**Rules:**
- ✅ Network service: Expose `isOnline()` and `subscribeToNetworkState()`
- ✅ Sync queue repository: Use parameterized SQLite queries only
- ✅ Sync metadata repository: Use parameterized SQLite queries only
- ❌ Do NOT use `execAsync()` with user input
- ✅ Service methods receive userId if user-specific

### 10. Phase Boundary Rules

**Rules:**
- ❌ Do NOT implement Phase 9 (Supabase schema/RLS)
- ❌ Do NOT implement Phase 10 (Push sync)
- ❌ Do NOT implement Phase 11 (Pull sync)
- ❌ Do NOT implement Phase 12 (Settings screen enhancements)
- ❌ Do NOT start Phase 9 until Phase 8 approved
- ❌ Do NOT run terminal commands automatically

---

## Current Sync Infrastructure Review

### Existing sync_queue Table (Phase 1)

**Schema** (`src/lib/db/schema.ts`):
```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_name TEXT NOT NULL CHECK (entity_name IN ('wallets', 'categories', 'transactions')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'failed', 'success')) DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_name, entity_id);
```

**Status**:
- ✅ Table exists and is functional
- ✅ Used by wallet/category/transaction services since Phase 4
- ✅ Accumulates pending items correctly
- ✅ No schema changes needed

**Available Columns**:
- `id` - UUID primary key
- `entity_name` - 'wallets', 'categories', 'transactions'
- `entity_id` - UUID of the entity
- `operation` - 'create', 'update', 'delete'
- `payload` - JSON stringified entity data
- `status` - 'pending', 'processing', 'failed', 'success'
- `retry_count` - Number of failed sync attempts
- `last_error` - Last error message (nullable)
- `created_at` - ISO timestamp
- `updated_at` - ISO timestamp

### Existing sync_metadata Table (Phase 1)

**Schema** (`src/lib/db/schema.ts`):
```sql
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Status**:
- ✅ Table exists and is functional
- ✅ Not yet used (no sync has occurred)
- ✅ Ready for key-value storage
- ✅ No schema changes needed

**Use Cases**:
- Store `last_sync_at` timestamp (ISO string)
- Store `last_sync_status` ('success', 'failed')
- Store `last_error` (optional)

### Existing Minimal Sync Queue Repository (Phase 4)

**File**: `src/features/sync/sync-queue.repository.ts`

**Current Methods**:
- `addSyncQueueItem(input)` - Add pending item to queue

**Status**:
- ✅ Used by wallet/category/transaction services
- ✅ Parameterized SQLite queries (secure)
- ✅ Singleton pattern
- ⚠️ Missing query methods (findPending, findFailed, etc.)
- ⚠️ Missing update methods (markProcessing, markSuccess, markFailed)

**Phase 8 Expansion Needed**:
- Add `findPendingItems()` - Query pending items
- Add `findFailedItems()` - Query failed items for retry
- Add `countByStatus(status)` - Count items by status
- Add `markProcessing(id)` - Update status to 'processing'
- Add `markSuccess(id)` - Update status to 'success'
- Add `markFailed(id, error)` - Update status to 'failed', increment retry_count
- Add `deleteSuccessfulItems()` - Clean up old success items (optional, Phase 12+)

### Existing Sync Queue Types (Phase 4)

**File**: `src/features/sync/sync-queue.types.ts`

**Current Types**:
- `EntityName` - 'wallets' | 'categories' | 'transactions'
- `Operation` - 'create' | 'update' | 'delete'
- `QueueStatus` - 'pending' | 'processing' | 'failed' | 'success'
- `SyncQueueItem` - Full queue item interface
- `AddSyncQueueItemInput` - Input for addSyncQueueItem()

**Status**:
- ✅ Types exist and are used
- ✅ No changes needed for Phase 8

---

## Network Detection Approach

### Option 1: Native Expo NetInfo (Recommended)

**Status**: Need to verify if `@react-native-community/netinfo` is available in Expo SDK 56.

**Approach**:
```bash
npx expo install @react-native-community/netinfo
```

**Justification**:
- Official React Native community package
- Well-maintained and widely used
- Provides reliable online/offline detection
- Works on Android/iOS/Web
- Small bundle size (~10KB)

**API**:
```typescript
import NetInfo from '@react-native-community/netinfo';

// Check current state
const state = await NetInfo.fetch();
console.log('Is connected?', state.isConnected);

// Subscribe to network state changes
const unsubscribe = NetInfo.addEventListener(state => {
  console.log('Connection type', state.type);
  console.log('Is connected?', state.isConnected);
});
```

**Pros**:
- Accurate network detection
- Event-based subscription
- Supports cellular, wifi, ethernet, unknown types
- No polling required

**Cons**:
- Adds one dependency (~10KB)

**Decision**: **Recommended** - propose to user for approval


### Option 2: Fallback without Dependency (Not Recommended)

**Approach**: Always assume offline for MVP, add network detection later.

**Pros**:
- No dependency
- Simple implementation

**Cons**:
- Cannot detect actual network state
- Sync status always shows "offline"
- Less useful for Phase 10+

**Decision**: Not recommended. NetInfo is small and essential for sync foundation.

### Proposed Network Service Design

**File**: `src/lib/network/network.service.ts`

**Methods**:
```typescript
export class NetworkService {
  isOnline(): Promise<boolean>
  subscribeToNetworkState(callback: (isOnline: boolean) => void): () => void
  getCurrentNetworkType(): Promise<string> // 'wifi', 'cellular', 'none', etc.
}
```

**Usage**:
```typescript
// Check if online
const online = await networkService.isOnline();

// Subscribe to changes
const unsubscribe = networkService.subscribeToNetworkState((isOnline) => {
  console.log('Network state changed:', isOnline);
  // Update UI badge
});

// Cleanup
unsubscribe();
```

---

## Sync Queue Repository Design (Expansion)

### New Methods to Add

**File**: `src/features/sync/sync-queue.repository.ts`

#### 1. Query Methods

```typescript
/**
 * Find all pending sync queue items
 * Used by sync service (Phase 10) to process queue
 */
async findPendingItems(limit?: number): Promise<SyncQueueItem[]>

/**
 * Find failed sync queue items eligible for retry
 * Used by sync service (Phase 10) to retry failed items
 */
async findFailedItems(maxRetries: number, limit?: number): Promise<SyncQueueItem[]>

/**
 * Count sync queue items by status
 * Used by Settings screen to show pending/failed count
 */
async countByStatus(status: QueueStatus): Promise<number>

/**
 * Find sync queue items by entity
 * Used for debugging or entity-specific sync
 */
async findByEntity(entityName: EntityName, entityId: string): Promise<SyncQueueItem[]>
```

#### 2. Update Methods

```typescript
/**
 * Mark item as processing
 * Called when sync starts processing an item
 */
async markProcessing(id: string): Promise<void>

/**
 * Mark item as success
 * Called after successful remote sync
 */
async markSuccess(id: string): Promise<void>

/**
 * Mark item as failed
 * Called after failed remote sync, increments retry_count
 */
async markFailed(id: string, error: string): Promise<void>
```

#### 3. Cleanup Methods (Optional, Phase 12+)

```typescript
/**
 * Delete successful items older than X days
 * Prevents sync_queue table from growing indefinitely
 */
async deleteOldSuccessItems(olderThanDays: number): Promise<number>
```

### SQL Implementation Examples

**findPendingItems**:
```sql
SELECT * FROM sync_queue
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT ?
```

**countByStatus**:
```sql
SELECT COUNT(*) as count FROM sync_queue
WHERE status = ?
```

**markProcessing**:
```sql
UPDATE sync_queue
SET status = 'processing', updated_at = ?
WHERE id = ?
```

**markFailed**:
```sql
UPDATE sync_queue
SET status = 'failed',
    retry_count = retry_count + 1,
    last_error = ?,
    updated_at = ?
WHERE id = ?
```

---

## Sync Metadata Repository Design

### New Repository

**File**: `src/features/sync/sync-metadata.repository.ts`

**Methods**:
```typescript
export class SyncMetadataRepository {
  /**
   * Get metadata value by key
   * Returns null if key does not exist
   */
  async get(key: string): Promise<string | null>

  /**
   * Set metadata value by key
   * Creates or updates key-value pair
   */
  async set(key: string, value: string): Promise<void>

  /**
   * Delete metadata key
   */
  async delete(key: string): Promise<void>
}
```

### Common Keys

**Phase 8** (storage only, not yet used):
- `last_sync_at` - ISO timestamp of last successful sync (Phase 10)
- `last_sync_status` - 'success' | 'failed' (Phase 10)
- `last_sync_error` - Error message if failed (Phase 10)

**Future Keys** (Phase 11+):
- `last_pull_at` - ISO timestamp of last pull sync
- `sync_enabled` - 'true' | 'false' (user preference)

### SQL Implementation

**get**:
```sql
SELECT value FROM sync_metadata
WHERE key = ?
```

**set** (upsert):
```sql
INSERT INTO sync_metadata (key, value, updated_at)
VALUES (?, ?, ?)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at
```


**delete**:
```sql
DELETE FROM sync_metadata
WHERE key = ?
```

### Singleton Pattern

```typescript
let syncMetadataRepositoryInstance: SyncMetadataRepository | null = null;

export function getSyncMetadataRepository(db: SQLiteDatabase): SyncMetadataRepository {
  if (!syncMetadataRepositoryInstance) {
    syncMetadataRepositoryInstance = new SyncMetadataRepository(db);
  }
  return syncMetadataRepositoryInstance;
}
```

---

## Sync Status Badge Component Design

### Component Spec

**File**: `src/components/finance/SyncStatusBadge.tsx`

**Props**:
```typescript
interface SyncStatusBadgeProps {
  status: 'synced' | 'pending' | 'failed' | 'offline';
  size?: 'small' | 'medium';
  showLabel?: boolean;
}
```

**Visual Design**:
- Small badge (8-12px circle or pill)
- Color coding:
  - **Synced**: Green (#10B981) with checkmark icon (optional)
  - **Pending**: Amber (#F59E0B) with clock icon (optional)
  - **Failed**: Red (#EF4444) with exclamation icon (optional)
  - **Offline**: Gray (#6B7280) with offline icon (optional)
- Optional label text: "Synced", "Pending", "Failed", "Offline"

**Usage**:
```tsx
<SyncStatusBadge status="pending" size="small" showLabel={false} />
<SyncStatusBadge status="synced" size="medium" showLabel={true} />
```


### Where to Display

**Phase 8 Usage**:
1. **Dashboard Screen** (top-right corner):
   - Show network status only: "Online" or "Offline"
   - Small badge with color indicator
   - Does NOT show per-transaction sync status yet

2. **Settings Screen**:
   - Display "Last Sync: Never synced" (placeholder for Phase 10)
   - Display "Pending Items: X" (count from sync queue)
   - Display "Failed Items: X" (count from sync queue)
   - Network status: "Online" or "Offline"

**Future Usage** (Phase 10+):
- Transaction cards: Show pending/failed badge per transaction
- Wallet cards: Show pending/failed badge per wallet
- Category items: Show pending/failed badge per category

---

## Dashboard Sync Display Design

### Dashboard Header Addition

**Current Dashboard** (Phase 7):
- Total balance card
- Monthly summary card
- Recent transactions list

**Phase 8 Addition**:
- **Network Status Badge** in header (top-right)
  - Shows "Online" (green dot) or "Offline" (gray dot)
  - Small, non-intrusive
  - No interaction (Phase 12)

**Implementation**:
```tsx
<View style={styles.header}>
  <Text style={styles.title}>Dashboard</Text>
  <NetworkStatusBadge />
</View>
```


**NetworkStatusBadge Component**:
```typescript
export function NetworkStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const networkService = getNetworkService();
    
    networkService.isOnline().then(setIsOnline);
    
    const unsubscribe = networkService.subscribeToNetworkState(setIsOnline);
    return unsubscribe;
  }, []);

  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: isOnline ? '#10B981' : '#6B7280' }]} />
      <Text style={styles.label}>{isOnline ? 'Online' : 'Offline'}</Text>
    </View>
  );
}
```

---

## Settings Screen Sync Display Design

### Settings Screen Addition

**Current Settings** (Phase 3):
- Account info (email)
- Logout button

**Phase 8 Addition**:
- **Sync Status Section**:
  - Last Sync: "Never synced" (placeholder text for now)
  - Pending Items: X (count from sync_queue WHERE status = 'pending')
  - Failed Items: X (count from sync_queue WHERE status = 'failed')
  - Network Status: "Online" or "Offline"

**Layout**:
```
┌─────────────────────────────────┐
│ Settings                        │
├─────────────────────────────────┤
│ Account                         │
│ Email: user@example.com         │
├─────────────────────────────────┤
│ Sync Status                     │
│ Network: Online ●               │
│ Last Sync: Never synced         │
│ Pending: 5 items                │
│ Failed: 0 items                 │
├─────────────────────────────────┤
│ Logout                          │
└─────────────────────────────────┘
```


**Implementation**:
```tsx
export default function SettingsScreen() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  async function loadSyncStatus() {
    const db = await getDatabase();
    const syncQueueRepo = getSyncQueueRepository(db);
    
    const pending = await syncQueueRepo.countByStatus('pending');
    const failed = await syncQueueRepo.countByStatus('failed');
    
    setPendingCount(pending);
    setFailedCount(failed);
    
    const networkService = getNetworkService();
    const online = await networkService.isOnline();
    setIsOnline(online);
  }

  return (
    <View>
      <Text>Sync Status</Text>
      <Text>Network: {isOnline ? 'Online' : 'Offline'}</Text>
      <Text>Last Sync: Never synced</Text>
      <Text>Pending: {pendingCount} items</Text>
      <Text>Failed: {failedCount} items</Text>
    </View>
  );
}
```

**Note**: "Never synced" is placeholder text. Phase 10 will update this with actual last_sync_at timestamp.

---

## What Phase 8 Will NOT Do

### Remote Sync (Phase 10)

Phase 8 will NOT:
- ❌ Push pending items to Supabase
- ❌ Process sync queue
- ❌ Call Supabase API for data writes
- ❌ Implement remote wallet repository
- ❌ Implement remote category repository
- ❌ Implement remote transaction repository
- ❌ Implement sync orchestration service
- ❌ Trigger automatic sync on network change
- ❌ Add "Sync Now" button

**Justification**: Remote sync requires Supabase schema/RLS (Phase 9) first, then push logic (Phase 10).

### Pull Sync (Phase 11)

Phase 8 will NOT:
- ❌ Pull remote changes from Supabase
- ❌ Query Supabase for updated records
- ❌ Implement conflict resolution
- ❌ Update last_sync_at after pull
- ❌ Upsert remote changes into local SQLite

**Justification**: Pull sync depends on push sync (Phase 10) and remote schema (Phase 9).

### Supabase Schema and RLS (Phase 9)

Phase 8 will NOT:
- ❌ Create Supabase SQL migration
- ❌ Enable Row Level Security
- ❌ Add RLS policies
- ❌ Test RLS manually
- ❌ Create financetracker schema

**Justification**: Phase 9 is dedicated to Supabase server-side setup.

### UI Enhancements (Phase 12)

Phase 8 will NOT:
- ❌ Add "Sync Now" button
- ❌ Add sync progress indicator
- ❌ Add retry button for failed items
- ❌ Add network change toast notifications
- ❌ Make sync status badge interactive/clickable

**Justification**: UI polish is Phase 12.

---

## Files to Create

### Network Service (1 file)

1. **`src/lib/network/network.service.ts`** (NEW)
   - Network status detection service
   - `isOnline()` - Check current network state
   - `subscribeToNetworkState(callback)` - Subscribe to network changes
   - `getCurrentNetworkType()` - Get network type (wifi, cellular, etc.)
   - Uses `@react-native-community/netinfo` (if approved)
   - Singleton pattern

### Sync Queue Repository Expansion (1 file)

2. **`src/features/sync/sync-queue.repository.ts`** (MODIFY)
   - Add `findPendingItems(limit?)` - Query pending items
   - Add `findFailedItems(maxRetries, limit?)` - Query failed items
   - Add `countByStatus(status)` - Count by status
   - Add `findByEntity(entityName, entityId)` - Find by entity
   - Add `markProcessing(id)` - Update status to processing
   - Add `markSuccess(id)` - Update status to success
   - Add `markFailed(id, error)` - Update status to failed, increment retry

### Sync Metadata Repository (2 files)

3. **`src/features/sync/sync-metadata.repository.ts`** (NEW)
   - Key-value storage repository
   - `get(key)` - Get value by key
   - `set(key, value)` - Set value by key (upsert)
   - `delete(key)` - Delete key
   - Singleton pattern

4. **`src/features/sync/sync-metadata.types.ts`** (NEW)
   - TypeScript interfaces for metadata
   - `SyncMetadata` interface
   - Common key constants

### Sync Feature Barrel Export (1 file)

5. **`src/features/sync/index.ts`** (MODIFY or CREATE)
   - Barrel export for sync feature
   - Export sync queue repository
   - Export sync metadata repository
   - Export sync types

### Sync Status Badge Component (1 file)

6. **`src/components/finance/SyncStatusBadge.tsx`** (NEW)
   - Reusable sync status badge component
   - Props: status, size, showLabel
   - Color coding: green/amber/red/gray
   - Small, non-intrusive design

---

## Files to Modify

### Dashboard Screen (1 file)

1. **`src/app/(tabs)/dashboard.tsx`** (MODIFY)
   - Add network status badge in header
   - No functional changes to dashboard logic
   - Display online/offline status only

### Settings Screen (1 file)

2. **`src/app/(tabs)/settings/index.tsx`** (MODIFY)
   - Add sync status section
   - Display network status (online/offline)
   - Display "Last Sync: Never synced" (placeholder)
   - Display pending items count
   - Display failed items count
   - Load data on screen mount

### Package.json (1 file)

3. **`package.json`** (MODIFY - if NetInfo approved)
   - Add `@react-native-community/netinfo` dependency
   - Use `npx expo install @react-native-community/netinfo`

---

## Risks and Tradeoffs

### Risk 1: NetInfo Dependency

**Risk**: Adding `@react-native-community/netinfo` adds a dependency.

**Mitigation**:
- Package is small (~10KB)
- Official React Native community package
- Well-maintained, widely used
- Essential for accurate network detection
- Alternative is always assuming offline (poor UX)

**Decision**: Propose NetInfo to user for approval. Without it, Phase 8 cannot detect network state accurately.

### Risk 2: Sync Queue Growing Indefinitely

**Risk**: sync_queue table accumulates items forever (pending/success/failed).

**Mitigation**:
- Phase 8: No cleanup implemented yet
- Phase 10: Mark items as success after push
- Phase 12: Add cleanup for old success items (delete after 30 days)
- Phase 8: Monitor queue size during testing

**Tradeoff**: Keep all items for now vs. implement cleanup immediately.

**Decision**: Defer cleanup to Phase 12. MVP can tolerate queue growth for testing.


### Risk 3: Network Status Badge Performance

**Risk**: Subscribing to network state on every screen mount could impact performance.

**Mitigation**:
- Use singleton network service (one subscription for entire app)
- Unsubscribe on component unmount
- Badge update is lightweight (only UI color change)

**Tradeoff**: Real-time network status vs. polling-based detection.

**Decision**: Use event-based subscription (real-time). More accurate than polling.

### Risk 4: User Confusion About "Never Synced"

**Risk**: Users may be confused by "Never synced" message when they have pending items.

**Mitigation**:
- Add helper text: "Sync will start automatically when online (Phase 10)"
- Phase 10: Replace with actual last sync timestamp
- Phase 8: Educational only (no sync processing yet)

**Tradeoff**: Show placeholder vs. hide sync status until Phase 10.

**Decision**: Show placeholder. Prepares users for future sync functionality.

---

## Test Deferral to Phase 13

### Manual Testing Only (Phase 8)

**Approach**: Manual testing sufficient for Phase 8 foundation.

**Manual Tests**:
1. Network detection works (toggle airplane mode)
2. Sync queue queries return correct counts
3. Sync metadata get/set works
4. Dashboard shows online/offline badge
5. Settings shows pending/failed counts
6. Sync status badge displays correct colors

### Automated Tests (Phase 13)

**Deferred Tests**:
- Unit tests for network service
- Unit tests for sync queue repository methods
- Unit tests for sync metadata repository
- Integration tests for sync queue lifecycle
- UI tests for sync status badge

**Justification**: MVP priority is functional implementation. Phase 13 dedicated to testing infrastructure.

---

## Phase 8 Completion Confirmation

### No Remote Supabase Sync

- ✅ Network detection only (no sync processing)
- ✅ Sync queue repository expanded (no remote push)
- ✅ Sync metadata repository created (no remote pull)
- ✅ Sync status badge component (visual only)
- ✅ Dashboard/settings sync display (informational only)
- ❌ Do NOT push data to Supabase
- ❌ Do NOT pull data from Supabase
- ❌ Do NOT create Supabase schema/RLS
- ❌ Do NOT process sync queue to remote
- ❌ Do NOT implement remote repositories
- ❌ Do NOT implement sync orchestration

### Existing App Behavior Unchanged

- ✅ App remains fully offline-first
- ✅ All writes go to local SQLite only
- ✅ Wallet/category/transaction flows unchanged
- ✅ Dashboard and reports remain local SQLite only
- ✅ Sync queue continues to accumulate pending items
- ✅ Users can create/edit/delete records without network

### No New Dependencies (Pending Approval)

**Proposal**: Add `@react-native-community/netinfo` for network detection.

**Justification**:
- Small package (~10KB)
- Official React Native community package
- Essential for accurate network detection
- Widely used and well-maintained

**Alternative**: Always assume offline (poor UX, not recommended).

**Decision**: Request user approval before adding dependency.

### Phase 9 Not Started

- ✅ Phase 9 (Supabase schema/RLS) will NOT be started
- ✅ Phase 8 scope is network detection and sync foundation ONLY
- ✅ No Supabase schema creation
- ✅ No RLS policies
- ✅ No remote data writes

---

## Tasks.md Update Plan

### Phase 8 Tasks

```markdown
## Phase 8 — Network and Sync Foundation

- [ ] 8.1 Implement network status service
  - Detect online/offline state.
  - Expose current connectivity state.
  - Requirements: REQ-DASH-003

- [ ] 8.2 Create sync queue repository
  - Add queue item.
  - Find pending items.
  - Mark processing.
  - Mark failed.
  - Mark success.
  - Increment retry count.
  - Requirements: REQ-SYNC-001, REQ-SYNC-003

- [ ] 8.3 Implement sync metadata repository
  - Get last_sync_at.
  - Set last_sync_at.
  - Requirements: REQ-SYNC-004

- [ ] 8.4 Create sync status badge component
  - Show synced.
  - Show pending.
  - Show failed.
  - Show offline.
  - Requirements: REQ-DASH-004

- [ ] 8.5 Add sync status to dashboard (Deferred to Phase 13)
  - Unit tests for network service
  - Unit tests for sync queue repository
  - Unit tests for sync metadata repository
  - UI tests for sync status badge
```

**Mark as complete**:
- Task 8.1 after network service implemented
- Task 8.2 after sync queue repository expanded
- Task 8.3 after sync metadata repository implemented
- Task 8.4 after sync status badge component created
- Task 8.5 remains deferred to Phase 13

---

## Manual Verification Commands

After Phase 8 implementation:

**TypeScript Type Check**:
```bash
npx tsc --noEmit
```

**Expo Dev Client Start**:
```bash
npx expo start --dev-client -c
```

**Test Network Detection** (manual):
1. Open app
2. Check dashboard header shows "Online" badge
3. Toggle airplane mode on device
4. Verify badge changes to "Offline"
5. Toggle airplane mode off
6. Verify badge changes back to "Online"

**Test Sync Status Display** (manual):
1. Open Settings screen
2. Verify "Network: Online" or "Offline" displays
3. Verify "Last Sync: Never synced" displays
4. Create some wallets/categories/transactions
5. Navigate back to Settings
6. Verify "Pending: X items" count increases
7. Count should match number of created records

**Git Status**:
```bash
git status
```

**Git Diff**:
```bash
git diff
```

---

## Manual Testing Checklist

### Test 1: Network Detection - Online

1. Ensure device has internet connection (wifi or cellular)
2. Open app
3. Navigate to Dashboard
4. **Expected**: Header shows "Online" badge with green dot
5. Navigate to Settings
6. **Expected**: "Network: Online" displays

### Test 2: Network Detection - Offline

1. Turn on airplane mode on device
2. Return to app
3. Navigate to Dashboard
4. **Expected**: Header shows "Offline" badge with gray dot
5. Navigate to Settings
6. **Expected**: "Network: Offline" displays

### Test 3: Network Detection - State Change

1. Start with internet on
2. Open Dashboard
3. **Verify**: "Online" badge shows
4. Turn on airplane mode
5. Wait 1-2 seconds
6. **Expected**: Badge updates to "Offline" (without refresh)
7. Turn off airplane mode
8. Wait 1-2 seconds
9. **Expected**: Badge updates to "Online" (without refresh)

### Test 4: Sync Queue Count - Pending

1. Navigate to Settings
2. Note current "Pending: X items" count
3. Create a new wallet
4. Navigate back to Settings
5. **Expected**: Pending count increased by 1
6. Create a new category
7. Navigate back to Settings
8. **Expected**: Pending count increased by 1 more
9. Create a new transaction
10. Navigate back to Settings
11. **Expected**: Pending count increased by 1 more

### Test 5: Sync Queue Count - Failed

1. Navigate to Settings
2. **Expected**: "Failed: 0 items" (no failed items yet in Phase 8)
3. Phase 10 will test failed items after implementing sync processing

### Test 6: Last Sync Placeholder

1. Navigate to Settings
2. **Expected**: "Last Sync: Never synced" displays
3. This is correct for Phase 8 (no sync processing yet)

### Test 7: Sync Status Badge Component

1. Check dashboard header badge
2. **Verify**: Badge is small and non-intrusive
3. **Verify**: Color changes based on network state
4. **Verify**: Badge does not interfere with other UI elements

### Test 8: App Behavior Unchanged

1. Create wallet offline
2. **Expected**: Wallet saves to SQLite immediately
3. Create transaction offline
4. **Expected**: Transaction saves to SQLite immediately
5. View dashboard offline
6. **Expected**: Dashboard displays local data correctly
7. **Verify**: App remains fully functional offline

---

## Known Limitations (Phase 8)

### 1. No Automatic Sync

- **Limitation**: Network detection does not trigger sync.
- **Impact**: Users cannot sync data to Supabase yet.
- **Rationale**: Phase 8 is foundation only. Sync processing is Phase 10.
- **Future Enhancement**: Phase 10 (push sync), Phase 11 (pull sync).

### 2. "Never Synced" Placeholder

- **Limitation**: Settings always shows "Never synced" regardless of pending items.
- **Impact**: Users may be confused about sync status.
- **Rationale**: No sync has occurred yet. Placeholder text is accurate.
- **Future Enhancement**: Phase 10 will update with actual last_sync_at timestamp.

### 3. No Manual Sync Button

- **Limitation**: Users cannot manually trigger sync.
- **Impact**: Users cannot force sync even when online.
- **Rationale**: Phase 8 does not implement sync processing.
- **Future Enhancement**: Phase 10 (add "Sync Now" button in settings).

### 4. No Per-Item Sync Status

- **Limitation**: Transaction/wallet/category cards do not show sync status badge.
- **Impact**: Users cannot see which specific items are pending/failed.
- **Rationale**: Phase 8 focuses on global sync status only.
- **Future Enhancement**: Phase 10+ (add badges to individual items).

### 5. No Sync Queue Cleanup

- **Limitation**: sync_queue table grows indefinitely (success items not deleted).
- **Impact**: Table size increases over time.
- **Rationale**: Phase 8 does not implement cleanup logic.
- **Future Enhancement**: Phase 12 (delete old success items after 30 days).

### 6. Network Detection Requires NetInfo

- **Limitation**: Accurate network detection requires `@react-native-community/netinfo` dependency.
- **Impact**: Cannot detect network state without dependency.
- **Alternative**: Always assume offline (poor UX).
- **Decision**: Propose NetInfo to user for approval.

---

## Alternative Approaches Considered

### Alternative 1: Skip Phase 8, Jump to Phase 10

**Approach**: Combine network detection + sync processing in one phase.

**Pros**:
- Fewer phases
- Users get sync functionality sooner

**Cons**:
- Phase 10 becomes too large (high risk)
- Harder to review and test
- Cannot validate network detection independently

**Decision**: Rejected. Keep Phase 8 separate for incremental validation.

### Alternative 2: Use Polling Instead of NetInfo

**Approach**: Poll network state every X seconds instead of event-based subscription.

**Pros**:
- No dependency

**Cons**:
- Less accurate (delay in detection)
- Battery drain (constant polling)
- Inefficient compared to event-based

**Decision**: Rejected. NetInfo event-based approach is superior.

### Alternative 3: Hide Sync Status Until Phase 10

**Approach**: Do not show any sync status UI until sync processing is implemented.

**Pros**:
- No placeholder text ("Never synced")
- Less user confusion

**Cons**:
- Users are not prepared for sync feature
- Cannot validate sync status UI before Phase 10
- Harder to debug sync queue in Phase 8

**Decision**: Rejected. Show sync status in Phase 8 for transparency and debugging.

---

## Dependency Proposal: @react-native-community/netinfo

### Summary

**Package**: `@react-native-community/netinfo`  
**Version**: Latest (compatible with Expo SDK 56)  
**Size**: ~10KB  
**License**: MIT  
**Maintainer**: React Native Community  
**GitHub**: https://github.com/react-native-netinfo/react-native-netinfo

### Justification

**Why Needed**:
- Phase 8 requires network online/offline detection
- Native JavaScript `navigator.onLine` is unreliable on mobile
- Accurate network detection is essential for sync foundation

**Why This Package**:
- Official React Native community package
- Well-maintained (active development, frequent updates)
- Widely used (10M+ downloads/week on npm)
- Works on Android, iOS, Web, Windows, macOS
- Small bundle size (~10KB)
- Event-based (no polling, efficient)
- Detects network type (wifi, cellular, ethernet, none)

**Alternative Considered**:
- Always assume offline → Poor UX, not realistic
- Build custom network detector → Reinventing the wheel, high risk

**Recommendation**: Approve `@react-native-community/netinfo` for Phase 8.

### Installation Command

```bash
npx expo install @react-native-community/netinfo
```

**Note**: Use `npx expo install` (not `npm install`) to ensure Expo SDK compatibility.

---

## Related Documentation

- **`design.md`**: Sync design section (Push/Pull algorithm)
- **`tasks.md`**: Phase 8 tasks (to be updated)
- **`requirements.md`**: Sync requirements (REQ-SYNC-*)
- **`AGENTS.md`**: Architecture rules and coding standards
- **`src/lib/db/schema.ts`**: sync_queue and sync_metadata table schema
- **`src/features/sync/sync-queue.repository.ts`**: Existing minimal sync queue repository (Phase 4)
- **`src/features/sync/sync-queue.types.ts`**: Existing sync queue types

---

## Next Steps

### Immediate (User Review)

1. **User reviews Phase 8 plan**
2. **User approves or rejects `@react-native-community/netinfo` dependency**
3. **User approves Phase 8 scope** (network detection + sync foundation only)
4. **User confirms no remote sync processing** in Phase 8

### After Approval

1. Install `@react-native-community/netinfo` (if approved)
2. Implement network service
3. Expand sync queue repository with query/update methods
4. Implement sync metadata repository
5. Create sync status badge component
6. Add network status badge to dashboard header
7. Add sync status section to settings screen
8. Manual testing (network detection, queue counts, badge display)
9. Update `tasks.md` (mark 8.1-8.4 complete)
10. Create `PHASE8_SUMMARY.md`
11. Commit and push to branch

### Do NOT Proceed Yet

- ❌ Do NOT implement Phase 8 until user approves plan
- ❌ Do NOT install NetInfo until user approves dependency
- ❌ Do NOT implement Phase 9 (Supabase schema/RLS)
- ❌ Do NOT implement Phase 10 (push sync)
- ❌ Do NOT process sync queue to remote
- ❌ Do NOT push/pull data from Supabase
- ❌ Do NOT add advanced features before MVP completion

---

**Phase 8 Plan Complete ✅**

**Status**: Planning complete, awaiting user approval  
**Date**: Phase 8 Planning  

Phase 8 plan covers network detection, sync queue repository expansion, sync metadata repository, sync status badge component, and dashboard/settings sync display. No remote sync processing. No Supabase schema. No data push/pull. App remains fully offline-first. Ready for user review and approval.

**Key Decision Required**: Approve `@react-native-community/netinfo` dependency for network detection.
