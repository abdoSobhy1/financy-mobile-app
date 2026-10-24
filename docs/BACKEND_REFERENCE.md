# Financy — Backend Architecture Reference

> **Purpose:** A developer (or new AI session with zero context) can read this document and fully reimplement the entire backend layer — database, sync, state, services — into a new app shell without reading any original source files.
>
> **Verified against:** all source files in src/database/, src/services/, src/store/, src/utils/, src/types/, src/constants/ as of 2026-07-30.

---

## Table of Contents

1. [Tech-Stack and Dependency Map](#1-tech-stack--dependency-map)
2. [Data Model and Types](#2-data-model--types)
3. [Database Schema and Migrations](#3-database-schema--migrations)
4. [Repository Layer (Query API)](#4-repository-layer-query-api)
5. [Sync Architecture](#5-sync-architecture)
6. [Redux State Layer](#6-redux-state-layer)
7. [Supporting Services](#7-supporting-services)
8. [Shared Utilities and Business-Logic Functions](#8-shared-utilities--business-logic-functions)
9. [Constants](#9-constants)
10. [Bootstrapping Sequence](#10-bootstrapping-sequence)

---

## 1. Tech-Stack and Dependency Map

| Layer | Package | Notes |
|---|---|---|
| Local DB | expo-sqlite | SQLite via SQLiteDatabase async API |
| State management | @reduxjs/toolkit | configureStore + async thunks |
| Cloud sync | firebase/firestore | Firestore v9 modular SDK |
| Auth | firebase/auth | Email/password only; AsyncStorage session cache |
| Network detection | @react-native-community/netinfo | NetInfo.fetch() |
| Device storage | @react-native-async-storage/async-storage | Session, preferences, sync timestamp, device ID |
| Notifications | expo-notifications | Daily reminders + bill reminders |
| Background tasks | expo-task-manager | Two named tasks |
| Excel import | xlsx + expo-document-picker + expo-file-system | CSV/XLSX parsing |
| Date utilities | date-fns | parse, isValid, format, startOfDay, endOfDay, parseISO |
| Crypto (import IDs) | expo-crypto | randomUUID() |

**Firebase project ID:** strapicms1
**Firestore path pattern:** users/{uid}/{collectionName}/{docId}

---

## 2. Data Model and Types

All types live in src/types/index.ts.

### 2.1 Core Entity Interfaces

**Transaction** — primary financial record
- id: string
- amount: number
- type: "income" | "expense"
- categoryId: string
- budgetId?: string (optional)
- description: string
- date: string (ISO date string)
- note?: string (optional)
- linkedBillId?: string (links to a bill)
- linkedDebtPaymentId?: string (links to a debt payment)
- createdAt: string (ISO date string)
- duplicatedAt?: string (set when duplicated)
- updatedAt: number (epoch ms — conflict resolution key)
- deleted?: boolean (soft-delete flag)
- syncStatus?: "pending" | "synced" | "error"

**Category**
- id, name: string
- type: "income" | "expense"
- color?: string
- entryCount: number
- createdAt: string
- updatedAt: number (epoch ms)
- deleted?: boolean
- syncStatus?: "pending" | "synced" | "error"

**Budget**
- id, name: string
- amount: number (allocated)
- currentBalance: number (remaining)
- resetDay: number (1-31)
- categoryId?: string
- createdAt: string, updatedAt: string (ISO date)
- syncUpdatedAt: number (epoch ms — conflict resolution key)
- deleted?: boolean
- syncStatus?: "pending" | "synced" | "error"

**Debt**
- id, name: string
- totalAmount: number, currentBalance: number
- interestRate?: number, minimumPayment?: number
- dueDate?: string (ISO), creditor?: string, description?: string
- categoryId?: string, budgetId?: string
- createdAt: string, updatedAt: string
- syncUpdatedAt: number (epoch ms)
- deleted?: boolean, syncStatus?: "pending" | "synced" | "error"

**DebtPayment**
- id: string, debtId: string
- amount: number
- date: string (ISO — primary), paymentDate: string (ISO — often same)
- principal: number, interest: number
- note?: string, linkedTransactionId?: string
- createdAt: string
- updatedAt: string | number (ISO or epoch ms)
- deleted?: boolean, syncStatus?: "pending" | "synced" | "error"

**Settings**
- id: string (always "default")
- billingPeriodStartDay: number (1-31, default 28)
- currency: string, firebaseSync: boolean
- theme: "dark" | "light"
- createdAt: string, updatedAt: string
- syncUpdatedAt: number (epoch ms — also stores last cloud pull time)
- deleted?: boolean, syncStatus?: "pending" | "synced" | "error"

### 2.2 Sync and Auth Types

`
// COLLECTIONS constant
TRANSACTIONS:  "transactions"
CATEGORIES:    "categories"
BUDGETS:       "budgets"
DEBTS:         "debts"
DEBT_PAYMENTS: "debt_payments"
SETTINGS:      "settings"
`

**User:** uid, email, displayName?, emailVerified

**AuthState:** user: User | null, loading, error, isAuthenticated

**SyncState:** isOnline, lastSync: number | null, pendingOperations, syncInProgress, error

**ParsedTransaction (voice/SMS output):**
- amount?, type?, description?, date?: Date, note?, categoryHint?: string
- confidence: number (0-1), rawText: string
- categoryId?, budgetId?

---

## 3. Database Schema and Migrations

**File:** src/database/index.ts
**Class:** DatabaseManager (singleton, getInstance())
**SQLite file:** financy.db
**Initialization:** ensureInitialized() opens DB, runs PRAGMA journal_mode = WAL, creates tables, runs migrations.

### 3.1 DatabaseManager API

- static getInstance(): DatabaseManager
- async ensureInitialized(): Promise<void>
- getDatabase(): SQLiteDatabase (throws if not initialized)
- async resetDatabase(): Promise<void> (drops all tables, re-creates schema)

### 3.2 Table Definitions (exact CREATE TABLE SQL)

#### transactions
`sql
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  category_id TEXT,
  budget_id TEXT,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  linked_bill_id TEXT,
  linked_debt_payment_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  duplicated_at TEXT,
  updated_at INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  sync_updated_at INTEGER DEFAULT 0
);
`

#### categories
`sql
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  entry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  sync_updated_at INTEGER DEFAULT 0
);
`

#### budgets
`sql
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  current_balance REAL NOT NULL,
  reset_day INTEGER DEFAULT 1,
  category_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  sync_updated_at INTEGER DEFAULT 0,
  period_type TEXT DEFAULT 'monthly',
  period_start TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
`

#### debts
`sql
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_amount REAL NOT NULL,
  current_balance REAL NOT NULL,
  interest_rate REAL,
  minimum_payment REAL,
  due_date TEXT,
  creditor TEXT,
  description TEXT,
  category_id TEXT,
  budget_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  sync_updated_at INTEGER DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
`

#### debt_payments
`sql
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  payment_date TEXT,
  principal REAL NOT NULL,
  interest REAL NOT NULL DEFAULT 0,
  note TEXT,
  linked_transaction_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  sync_updated_at INTEGER DEFAULT 0,
  FOREIGN KEY (debt_id) REFERENCES debts(id)
);
`

#### settings
`sql
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  billing_period_start_day INTEGER DEFAULT 28,
  currency TEXT DEFAULT 'USD',
  firebase_sync INTEGER DEFAULT 0,
  theme TEXT DEFAULT 'dark',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  sync_updated_at INTEGER DEFAULT 0
);
`

#### sync_log
`sql
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  is_processed INTEGER DEFAULT 0
);
`

#### bills (kept for Firestore sync compatibility; no Redux slice)
`sql
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT,
  category_id TEXT,
  budget_id TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurring TEXT,
  paid INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  sync_updated_at INTEGER DEFAULT 0
);
`

### 3.3 Migrations (src/database/migrations/)

| File | What it does |
|---|---|
| billPaymentsMigration.ts | Adds linked_bill_id, linked_debt_payment_id to transactions; adds linked_transaction_id to debt_payments; creates bills table |
| categoriesIconMigration.ts | Adds icon TEXT column to categories |

All use ALTER TABLE ... ADD COLUMN wrapped in try/catch.

### 3.4 Type Mapping Conventions

- transactions.updated_at: INTEGER (epoch ms) / TypeScript: number
- budgets.updated_at / debts.updated_at / settings.updated_at: TEXT (ISO string) / TypeScript: string
- All sync_updated_at columns: INTEGER (epoch ms)
- deleted: INTEGER 0/1 in SQL; boolean in TypeScript
- sync_status: TEXT in SQL

---

## 4. Repository Layer (Query API)

**Entry:** src/database/queries/index.ts
Exports: db = { transactions, categories, budgets, debts, settings }
Each repository calls await dbManager.ensureInitialized() at the start of every method.

### 4.1 SyncOptions Pattern

`	ypescript
interface SyncOptions {
  skipSync?: boolean;      // Do not log to sync_log (for cloud inserts)
  useProvidedId?: string;  // Use this ID instead of auto-generating
}
`

Default (no options): writes to sync_log, calls syncService.syncLocalChanges() asynchronously.

### 4.2 TransactionRepository (src/database/queries/transactions.ts)

- createTransaction(data, options?): Promise<Transaction>
- getAllTransactions(filters?): Promise<Transaction[]>
  - Supports: categoryId, budgetId, type, dateRange({ start, end })
  - Query: SELECT ... WHERE deleted = 0 ORDER BY date DESC
- getTransactionById(id): Promise<Transaction | null>
- updateTransaction(id, updates, options?): Promise<void>
- deleteTransaction(id, options?): Promise<void>
  - Soft-delete; side effects: restores linked bill (bills.paid=0) OR reverses linked debt payment
- duplicateTransaction(id): Promise<Transaction> — new ID, sets duplicatedAt = now
- getTransactionStats(): Promise<{ totalIncome, totalExpenses, totalTransactions }>

### 4.3 CategoryRepository (src/database/queries/categories.ts)

- createCategory(data, options?): Promise<Category>
- getAllCategories(): Promise<Category[]>            WHERE deleted = 0 OR deleted IS NULL
- getCategoriesByType(type): Promise<Category[]>
- getCategoryById(id): Promise<Category | null>
- updateCategory(id, updates, options?): Promise<void>
- deleteCategory(id, options?): Promise<void>        soft-delete
- isCategoryNameUnique(name, excludeId?): Promise<boolean>
- getCategoryUsageStats(): Promise<Array<{ category, transactionCount, totalAmount, averageAmount }>>
- getTopSpendingCategories(limit?): Promise<Array<{ category, totalSpent }>>
  JOIN transactions on category_id, SUM(amount) WHERE type='expense'

### 4.4 BudgetRepository (src/database/queries/budgets.ts)

- createBudget(data, options?): Promise<Budget>
- getAllBudgets(): Promise<Budget[]>
- getBudgetById(id): Promise<Budget | null>
- updateBudget(id, updates, options?): Promise<void>
- deleteBudget(id, options?): Promise<void>          soft-delete
- resetBudget(id): Promise<void>                     sets current_balance = amount
- resetAllBudgets(): Promise<void>
- getAllBudgetProgress(): Promise<Array<{ budget, spent, remaining, percentageUsed }>>
  spent = SUM(transactions.amount WHERE type='expense' AND budget_id=budget.id)
- getBudgetSpendingByCategory(budgetId): Promise<Array<{ categoryId, categoryName, totalSpent }>>

### 4.5 DebtRepository (src/database/queries/debts.ts)

- createDebt(data, options?): Promise<Debt>
- getAllDebts(): Promise<Debt[]>
- getDebtById(id): Promise<Debt | null>
- getActiveDebts(): Promise<Debt[]>         current_balance > 0
- getPaidOffDebts(): Promise<Debt[]>        current_balance = 0
- getDebtsWithUpcomingPayments(days): Promise<Debt[]>  due_date BETWEEN now AND now+days
- updateDebt(id, updates, options?): Promise<void>
- deleteDebt(id, options?): Promise<void>   soft-deletes debt AND all linked debt_payments
- makePayment(payment, options?): Promise<DebtPayment>
  Inserts debt_payment; decrements debt.current_balance; clamps to >= 0
- reversePayment(paymentId): Promise<void>
  Soft-deletes payment; restores debt.current_balance += payment.amount
- getPaymentsByDebt(debtId): Promise<DebtPayment[]>  ORDER BY date DESC
- getPaymentById(id): Promise<DebtPayment | null>
- updatePayment(id, updates, options?): Promise<void>
- deletePayment(id, options?): Promise<void>  soft-delete; restores parent debt balance
- getPaymentHistory(startDate?, endDate?): Promise<DebtPayment[]>
- getDebtSummary(): Promise<{ totalDebt, totalPaid, activeDebts, paidOffDebts, monthlyMinimumPayments }>

### 4.6 SettingsRepository (src/database/queries/settings.ts)

- getSettings(): Promise<Settings>          Selects WHERE id='default'; inserts defaults if none
- updateSettings(updates, options?): Promise<Settings>
- updateBillingPeriodStartDay(day): Promise<void>
- toggleFirebaseSync(): Promise<boolean>    flips 0<->1, returns new value
- updateCurrency(currency): Promise<void>
- updateTheme(theme): Promise<void>
- resetToDefaults(): Promise<Settings>
- getCurrentBillingPeriod(): Promise<{ start, end }>
- getPreviousBillingPeriod(): Promise<{ start, end }>
- getNextBillingPeriod(): Promise<{ start, end }>
- getDaysUntilNextBillingPeriod(): Promise<number>

Default settings row: id="default", billingPeriodStartDay=28, currency="USD", firebaseSync=false, theme="dark"

---

## 5. Sync Architecture

### 5.1 Overview

Two interacting singletons:
1. **OfflineFirstSync** (src/services/OfflineFirstSync.ts) — exported as offlineFirstSync
   Local operation buffer, sync queue processor, cloud restore orchestrator.
2. **SyncService** (src/services/syncService.ts) — exported as syncService
   Direct Firestore I/O, polling, conflict resolution.

Repositories call offlineFirstSync.logOperation(). OfflineFirstSync delegates Firestore I/O to SyncService.

### 5.2 OfflineFirstSync Key Internal State

- syncQueue: SyncLogEntry[] (in-memory buffer)
- isProcessing: boolean
- isOnline: boolean
- lastSyncAttempt: number | null
- pollInterval: setInterval | null

### 5.3 OfflineFirstSync Public API

- logOperation(entityType, entityId, operation, data?): Promise<void>
  Writes to sync_log (is_processed=0); calls processPendingOperations()
- getSyncStatus(): Promise<{ isOnline, isProcessing, pendingOperations, failedOperations, lastSyncAttempt }>
- forceSyncAll(): Promise<void>
  Marks all sync_log rows is_processed=0, triggers full re-process
- syncConflictsOnly(): Promise<void>
  Runs processPendingOperations() without pulling cloud
- performInitialCloudPull(): Promise<boolean>
  Phase 1: categories + settings
  Phase 2: budgets + transactions + bills + debts + debt_payments
  Phase 3: retry failed inserts (FK dependency order)
- performComprehensiveCloudRestore(): Promise<{ itemsUpdated, itemsCreated, errors[] }>
  User-triggered; compares each cloud doc with local by ID and updatedAt

### 5.4 sync_log Processing Flow

1. Repository inserts row into sync_log (is_processed=0)
2. logOperation() calls processPendingOperations()
3. For each unprocessed row: syncService.syncLocalChanges(collectionName, operation, entityId, data)
4. Marks row is_processed=1 on success

### 5.5 SyncService Key Internal State

- db: Firestore
- unsubscribers: Map<CollectionName, Unsubscribe>
- syncQueue: PendingSyncOperation[]
- isOnline: boolean
- syncInProgress: boolean
- failedInserts: Array<{ collectionName, doc }>
- dataChangeCallbacks: DataChangeCallback[]
- deviceId: string
- lastSyncTimestamp: number
- syncInitializedAt: number

### 5.6 SyncService Public API

- initializeSync(): Promise<void>
  ensureUserDocument() + startSyncListeners() + processSyncQueue()
- stopSync(): void
- syncLocalChanges(collectionName, operation, documentId, data?): Promise<void>
  If authenticated: performSyncOperation() immediately
  If not: queues into in-memory syncQueue[]
- forceFullSync(): Promise<void>
- checkForChanges(): Promise<void>  polls all collections since lastSyncTimestamp
- onDataChange(callback): () => void
- getAllDocumentsFromCollection(collectionName): Promise<any[]>
- clearFailedInserts(): void
- getFailedInserts(): Array<{ collectionName, doc }>

### 5.7 Collection Polling

Each collection: setInterval every 10 minutes (600,000 ms)

`
pollCollectionForChanges():
  query: where("updatedAt", ">", lastSyncTimestamp) orderBy("updatedAt", "desc")
  for each doc: handleDocumentChangeWithErrorHandling()
  then: updateLastSyncTimestamp() -> settings.syncUpdatedAt = Date.now()
`

lastSyncTimestamp: read from settings.sync_updated_at.
Default on first sync: Date.now() - 3_600_000 (1 hour ago).

### 5.8 Firestore Write Format

`
Path: users/{userId}/{collectionName}/{documentId}

Document shape:
{
  id: documentId,
  data: addDeviceTracking(cleanedEntityData),
  updatedAt: Date.now()
}

Written with: setDoc(docRef, syncDoc, { merge: true })
`

addDeviceTracking injects: lastModifiedBy (deviceId), lastModifiedAt (epoch ms)

### 5.9 Conflict Resolution (handleRemoteUpdate)

| Condition | Decision |
|---|---|
| remoteDeviceId === currentDeviceId | SKIP — same device, avoid loop |
| timeDiff > 10 min AND remoteTime > localTime | UPDATE_LOCAL |
| timeDiff > 10 min AND localTime >= remoteTime | KEEP_LOCAL |
| Different device AND timeDiff >= 1ms | UPDATE_LOCAL (remote wins) |
| Same timestamp / no device info | Apply if remoteTime > localTime |

### 5.10 Insert-from-Cloud Table (insertLocalDocument)

| Collection | Method called |
|---|---|
| transactions | TransactionRepository.createTransaction(mappedData, {skipSync, useProvidedId}) |
| budgets | BudgetRepository.createBudget(data, {skipSync, useProvidedId}) |
| categories | EntityManager.createCategoryFromSync(data) |
| debts | DebtRepository.createDebt(data, {skipSync, useProvidedId}) |
| debt_payments | DebtRepository.makePayment(cleanDebtPaymentData(data), {skipSync, useProvidedId}) |
| settings | SettingsRepository.updateSettings(cleanSettingsData(data), {skipSync: true}) |

Transaction field mapping (both camelCase and snake_case from Firebase accepted):
- linkedBillId: dataWithId.linkedBillId || dataWithId.linked_bill_id
- linkedDebtPaymentId: dataWithId.linkedDebtPaymentId || dataWithId.linked_debt_payment_id
- categoryId: dataWithId.categoryId || dataWithId.category_id
- budgetId: dataWithId.budgetId || dataWithId.budget_id

### 5.11 EntityManager (src/services/EntityManager.ts)

Singleton: entityManager. Wraps repository calls with validation/cleaning and duplicate-detection.

- createDebt(debt, options?): Promise<Debt>
- updateDebt(id, updates, options?): Promise<void>
- createBudget(budget, options?): Promise<Budget>
- createCategory(category, options?): Promise<Category>
  Duplicate check: finds existing by name+type, returns it instead of inserting
- createDebtFromSync(data): Promise<Debt>      skipSync=true, useProvidedId=data.id
- createBudgetFromSync(data): Promise<Budget>
- createCategoryFromSync(data): Promise<Category>
- checkForDuplicates(): Promise<{ debts, budgets, categories }>

### 5.12 SyncTracker (src/services/SyncTracker.ts)

Singleton: syncTracker. In-memory item-level sync state. Persisted to AsyncStorage key @financy_sync_tracking.
NOT the primary sync mechanism — used for diagnostics.

- markItemAsSynced(collection, itemId): void
- markItemAsPending(collection, itemId): void
- isItemSynced(collection, itemId): boolean
- getSyncStatus(): { totalSynced, totalPending, lastSync, collections }
- resetSyncTracking(): Promise<void>
- initializeSyncTracking(): Promise<void>

Collections tracked: transactions, categories, budgets, bills, debts

---

## 6. Redux State Layer

**File:** src/store/index.ts
Store slices: transactions, budgets, categories, settings, debts, auth, sync, analysis
All data slices use normalized { items: Record<string, Entity>, ids: string[] } shape.
SerializableCheck configured to ignore "persist/PERSIST".

### 6.1 transactionsSlice (src/store/slices/transactionsSlice.ts)

State shape:
- items: Record<string, Transaction>
- ids: string[]
- loading: boolean, error: string | null
- filters: TransactionFilters
- stats: { totalIncome, totalExpenses, totalTransactions } | null

Async thunks:
- fetchTransactions(filters?) -> db.transactions.getAllTransactions(filters)
- addTransaction(TransactionFormData) -> db.transactions.createTransaction(...)
- updateTransaction({ id, updates }) -> db.transactions.updateTransaction + re-fetch
- deleteTransaction(id) -> db.transactions.deleteTransaction(id)
- duplicateTransaction(id) -> db.transactions.duplicateTransaction(id)
- fetchTransactionStats() -> db.transactions.getTransactionStats()

Synchronous reducers:
- setFilters, clearFilters, clearError
- markSynced(id): sets items[id].syncStatus = "synced"

### 6.2 budgetsSlice (src/store/slices/budgetsSlice.ts)

State shape:
- items: Record<string, Budget>, ids: string[]
- progress: Record<string, { spent, remaining, percentageUsed }>
- spendingByCategory: Record<string, Array<{ categoryId, categoryName, totalSpent }>>
- loading: boolean, error: string | null

Async thunks:
- fetchBudgets, fetchBudgetProgress, addBudget, updateBudget, deleteBudget
- resetBudget(id), resetAllBudgets()
- fetchBudgetSpendingByCategory(budgetId)

Synchronous reducers:
- clearError
- updateBudgetBalance({ budgetId, amount, isIncome }): adjusts currentBalance + recalculates progress
- markSynced(id)

### 6.3 categoriesSlice (src/store/slices/categoriesSlice.ts)

State shape:
- items: Record<string, Category>, ids: string[]
- incomeCategories: string[], expenseCategories: string[]
- usageStats: Array<{ category, transactionCount, totalAmount, averageAmount }>
- topSpendingCategories: Array<{ category, totalSpent }>
- loading: boolean, error: string | null

Async thunks:
- fetchCategories, fetchCategoriesByType(type)
- addCategory, updateCategory, deleteCategory
- fetchCategoryUsageStats, fetchTopSpendingCategories(limit?)
- checkCategoryNameUnique({ name, excludeId? })

Synchronous reducers: clearError, markSynced(id)
Exported selector: selectAllCategories = (state) => Object.values(state.categories.items)

### 6.4 debtsSlice (src/store/slices/debtsSlice.ts)

State shape:
- items: Record<string, Debt>, ids: string[]
- activeDebtIds: string[], paidOffDebtIds: string[], upcomingPaymentIds: string[]
- payments: Record<string, DebtPayment>, paymentIds: string[]
- paymentsByDebt: Record<string, string[]>
- summary: { totalDebt, totalPaid, activeDebts, paidOffDebts, monthlyMinimumPayments }
- loading: boolean, error: string | null

Async thunks:
- fetchDebts, fetchActiveDebts, fetchPaidOffDebts
- fetchDebtsWithUpcomingPayments(days?)
- addDebt(DebtFormData), updateDebt({ id, updates }), deleteDebt(id)
- makeDebtPayment({ debtId, paymentData: DebtPaymentFormData })
- fetchPaymentsByDebt(debtId), updatePayment({ id, updates }), deletePayment(id)
- fetchDebtSummary, fetchPaymentHistory({ startDate?, endDate? }?)

Synchronous reducers:
- clearError, clearPayments
- markSynced(id): covers both items[] and payments[]

### 6.5 settingsSlice (src/store/slices/settingsSlice.ts)

State shape:
- data: Settings | null
- billingPeriods: { current, previous, next: { start, end } | null }
- daysUntilNextBillingPeriod: number | null
- loading: boolean, error: string | null

Async thunks:
- fetchSettings, updateSettings(updates), updateBillingPeriodStartDay(day)
- toggleFirebaseSync, updateCurrency, updateTheme, resetToDefaults
- fetchCurrentBillingPeriod, fetchPreviousBillingPeriod, fetchNextBillingPeriod
- fetchDaysUntilNextBillingPeriod

Synchronous reducers: clearError

### 6.6 authSlice (src/store/slices/authSlice.ts)

State: AuthState (user, loading, error, isAuthenticated)

Async thunks:
- signIn({ email, password }), signUp({ email, password, displayName? })
- signOut, sendPasswordReset(email)
- updateActivity(): rolls 30-day session expiry
- checkAuthState(): async check Firebase + AsyncStorage
- initializeAuth(): tryRestoreSession() then Firebase currentUser

Synchronous reducers: setUser(user), clearError, setLoading(bool)

### 6.7 syncSlice (src/store/slices/syncSlice.ts)

State: SyncState (isOnline, lastSync, pendingOperations, syncInProgress, error)

Async thunks:
- initializeSync(): offlineFirstSync.syncConflictsOnly() + getSyncStatus()
- stopSync, refreshSyncStatus
- forceSyncAll(): offlineFirstSync.forceSyncAll()
- initialCloudRestore(): offlineFirstSync.performInitialCloudPull()
- syncConflictsOnly(): syncConflictsOnlyService() from OfflineFirstSync

Synchronous reducers:
- setOnlineStatus(bool), setLastSync(timestamp), setPendingOperations(count)
- setSyncInProgress(bool), setSyncError(msg|null), clearSyncError
- updateSyncStatus({ isOnline, syncInProgress, pendingOperations })

---

## 7. Supporting Services

### 7.1 AuthService (src/services/authService.ts)

Singleton: authService. Firebase email/password + rolling 30-day AsyncStorage session cache.

Storage keys:
- financy_user_session: { user, expiresAt } JSON object
- financy_last_user_id: triggers dbManager.resetDatabase() on user switch

Methods:
- signIn(email, password): Promise<User>
- signUp(email, password, displayName?): Promise<User>
- signOut(): Promise<void>
- sendPasswordReset(email): Promise<void>
- isAuthenticated(): boolean              synchronous, Firebase only
- isAuthenticatedAsync(): Promise<boolean> Firebase + stored session
- requireUserId(): string                 throws if not authenticated
- requireUserIdAsync(): Promise<string>
- tryRestoreSession(): Promise<User | null>
- getCurrentAuthenticatedUser(): Promise<User | null>
- updateActivity(): Promise<void>         resets 30-day expiry
- hasValidSession(): Promise<boolean>
- getStoredUser(): Promise<User | null>

Firestore user document created on sign-up at users/{uid}:
{ email, displayName, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  role: "user", settings: { currency: "USD", theme: "dark", language: "en" } }

### 7.2 Firebase Initialization (src/services/firebase.ts)

- initializeFirebase(): { app, auth, db }
- getFirebaseAuth(): Auth
- getFirestoreInstance(): Firestore
- getFirebaseApp(): FirebaseApp
- isFirebaseInitialized(): boolean

Config constants:
- RETRY_ATTEMPTS: 3, RETRY_DELAY: 1000 (ms)
- BATCH_SIZE: 500, OFFLINE_TIMEOUT: 10000 (ms)

Auth: initializeAuth with getReactNativePersistence(AsyncStorage). Falls back to getAuth() if already initialized.

### 7.3 NotificationService (src/services/notificationService.ts)

Singleton: NotificationService.getInstance()

Settings shape (stored in AsyncStorage key "notificationSettings"):
- transactionReminders: boolean (default true)
- billReminders: boolean (default true)
- morningReminderTime: "12:03" (HH:MM)
- eveningReminderTime: "19:19" (HH:MM)
- billReminderDays: 3

Background task names:
- TRANSACTION_REMINDER: morning + evening daily (DAILY trigger type)
- BILL_REMINDER: 09:00 daily

Methods:
- initialize(): Promise<boolean>  requests permissions, loads settings, registers tasks, schedules
- saveSettings(partial): Promise<void>  saves + reschedules
- showSyncNotification(msg?): Promise<string | null>  returns notification ID
- dismissSyncNotification(id): Promise<void>
- sendBillReminder(bill): Promise<void>
- scheduleAllNotifications(): Promise<void>

### 7.4 VoiceParser (src/services/voiceParser.ts) — offline, no network

`
parseVoiceInput(
  transcript: string,
  categories?: { id: string; name: string }[],
  defaultCategoryId?: string
): ParsedTransaction[]
`

Processing pipeline per segment:
1. Eastern Arabic digit -> Western digit conversion (٠١٢... -> 0123...)
2. Arabic textual number expansion:
   - مية/مائة/ميه -> 100
   - الف/ألف/آلاف/الاف -> 1000
   - مليون/مليوناً -> 1_000_000
3. Amount extraction (patterns in priority order):
   - currency prefix/suffix (EGP, جنيه, etc.)
   - ب-prefix (بخمسين = 50)
   - standalone number
4. Type detection (Arabic + English keyword lists for expense/income)
5. Date extraction (اليوم/today, امبارح/yesterday, date patterns)
6. Category matching (full name first, then word-level partial, sorted by word length desc)
7. Description: strip all keywords, stop words, currency words, numbers -> remainder
8. confidence = matchedFields / 3 (fields: amount, type, description)

Multi-transaction splitting regex:
/\s*(?:,|،|[.]\s|(?<=^|\s)و\s*(?:كمان|بعدين)?|and\s|also\s|then\s|plus\s|كمان\s|بعدين\s)\s*/i

### 7.5 SmsParser (src/services/smsParser.ts)

`
isBankSender(sender: string): boolean
// Checks: NBE, AHLY, CIB, BANQUEMISR, QNB, HSBC, ALEXBANK, BDC, EGBANK, etc.

parseSmsTransaction(
  smsText: string,
  categories?: {id, name}[],
  budgets?: Record<string, Budget> | Budget[] | null,
  defaultCategoryId?: string
): ParsedTransaction | null
// Returns null if no valid amount found
// confidence hardcoded to 0.9
// budget matched via findMatchingBudgetForCategory(budgets, matchedCategoryId)
`

Amount patterns (priority order):
1. بمبلغ / مبلغ prefix
2. Arabic action words: شراء, خصم, سحب, إيداع, تحويل, عملية, دفع, ...
3. English action words: Purchase, Withdrawal, Payment, Transfer, Debit, Credit, ...
4. Currency prefix: EGP 450.50
5. Currency suffix: 450.50 EGP

Date patterns:
- يوم DD/MM/YY (3-part)
- يوم MM-DD (2-part, NBE InstaPay format)
- Fallback: today

### 7.6 SmsService (src/services/smsService.ts)

Singleton: smsService. Android-only (gracefully no-ops on iOS).

- isSupported(): boolean                       Platform.OS === "android"
- requestPermissions(): Promise<boolean>       READ_SMS + RECEIVE_SMS
- hasPermissions(): Promise<boolean>
- startListening(categories?, budgets?): void
  DeviceEventEmitter("onSMSReceived") -> isBankSender -> parseSmsTransaction -> expo-notifications
- stopListening(): void
- addTransactionListener(cb: (tx) => void): () => void   returns unsubscribe fn
- consumePendingTransactions(): ParsedTransaction[]       clears internal queue

### 7.7 AIService (src/services/aiService.ts) — online fallback

- isOnline(): Promise<boolean>
- parseWithAI(rawText: string): Promise<ParsedTransaction>
  POST https://api.g4f.dev/v1/chat/completions
  model: "gpt-4o-mini", temperature: 0.1
  API key: process.env.G4F_API_KEY
  Returns confidence=0 if offline, key missing, or parse error
  Success: confidence = min(matchedFields/3 + 0.2, 1)
  System prompt is Arabic; expects JSON response with: amount, type, description, date (YYYY-MM-DD), categoryHint

### 7.8 ExcelImportService (src/services/excelImportService.ts)

class ExcelImportService {
  constructor(onProgressUpdate?: (progress: ImportProgress) => void)

  parseFile(file: DocumentPickerAsset): Promise<ImportPreview>
    Handles XLSX and CSV (via xlsx library)
    Returns: columns (with detected types + suggested mappings), rows (first 10), allRows (full), totalRows, fileName, fileSize

  validateImport(preview, mapping, settings): Promise<ImportValidation>
    Required columns: amount, description, date
    Returns: isValid, errors[], warnings[], validRowCount, totalRowCount

  importData(preview, mapping, settings): Promise<ImportResult>
    Creates categories if settings.createMissingCategories = true
    Calls db.transactions.createTransaction() per row
    Returns: importedCount, skippedCount, errorCount, createdCategories[], errors[], transactionIds[]
}

Column type auto-detection: text | number | date | boolean (samples top 10 rows)

Date parsing order in ExcelImportService and in validation.ts safeParseDate:
1. new Date(stringValue)
2. date-fns formats: "MMM dd, yyyy", "MMM d, yyyy", "MMMM dd, yyyy", "MMMM d, yyyy", "MM/dd/yyyy", "M/d/yyyy"
3. dd/mm/yyyy or dd-mm-yyyy regex
4. yyyy-mm-dd or yyyy/mm/dd regex
5. mm/dd/yyyy regex

---

## 8. Shared Utilities and Business-Logic Functions

### 8.1 getDateRangeForBillingPeriod (core billing-period logic)

Location: src/utils/index.ts

`
function getDateRangeForBillingPeriod(
  startDay: number,         // 1-31
  referenceDate: Date = new Date()
): { start: Date; end: Date }
`

Algorithm:
- currentDay = referenceDate.getDate()
- if currentDay >= startDay:
    periodStart = new Date(year, month, startDay)
    periodEnd   = new Date(year, month+1, startDay-1)
  else:
    periodStart = new Date(year, month-1, startDay)
    periodEnd   = new Date(year, month, startDay-1)
- return { start: startOfDay(periodStart), end: endOfDay(periodEnd) }

Called by every billing-period query in SettingsRepository and billingPeriod.ts async helpers.

### 8.2 billingPeriod.ts Async Helpers

Location: src/utils/billingPeriod.ts

All load billingPeriodStartDay from db.settings.getSettings(), delegate to getDateRangeForBillingPeriod.
Fall back to startDay=1 on error.

- getCurrentBillingPeriod(): Promise<{ start, end }>
- getPreviousBillingPeriod(): Promise<{ start, end }>
  Goes back one month from current period start
- getBillingPeriodForDate(date: Date): Promise<{ start, end }>
- isDateInCurrentBillingPeriod(date: Date): Promise<boolean>

### 8.3 findMatchingBudgetForCategory

Location: src/utils/budgetMatching.ts

`
function findMatchingBudgetForCategory(
  budgets: Record<string, Budget> | Budget[] | null | undefined,
  categoryId?: string | null
): Budget | undefined
`

Accepts both Redux normalized Record<string, Budget> and plain Budget[] array.
Returns first budget where budget.categoryId === categoryId.
Used by smsParser.ts and screen-level budget auto-selection.

### 8.4 Validation Helpers (src/utils/validation.ts)

Validators (throw on invalid):
- validateTransactionData(transaction): void
  - amount > 0, description not empty, categoryId present, type in ["income","expense","debt"]
- validateBudgetData(budget): void
  - name not empty, amount > 0, resetDay 1-31 if provided
- validateCategoryData(category): void
  - name not empty, type in ["income","expense"]
- validateBillData(bill): void
  - name not empty, amount >= 0 if provided, dueDate valid if provided

Cleaners (normalize, safe-parse dates, remove undefined):
- cleanTransactionData(transaction): any
  - budgetId -> null if falsy, note trimmed or null, amount cast to Number
  - date: safeParseDate or new Date().toISOString()
  - duplicatedAt: safeParseDate or null
  - updatedAt: safeParseDate timestamp or Date.now()
- cleanBudgetData(budget): any
  - name trimmed, amount/currentBalance/resetDay cast to Number
  - syncUpdatedAt: safeParseDate timestamp or Date.now()
- cleanCategoryData(category): any
  - name trimmed, color -> null if falsy, entryCount cast to Number
  - updatedAt: safeParseDate timestamp or Date.now()
- cleanDebtData(debt): any
  - Validation clamping: totalAmount<=0 -> 1; currentBalance<0 -> 0; currentBalance>totalAmount -> totalAmount
  - Handles both camelCase and snake_case field names from Firebase
- cleanDebtPaymentData(payment): any
  - amount<=0 -> 1
  - |principal+interest-amount|>0.01 -> adjusts interest = amount-principal
  - missing debtId -> throws Error
  - Handles both camelCase and snake_case field names
- cleanSettingsData(settings): any
  - billingPeriodStartDay: Number(settings.billingPeriodStartDay || settings.billing_period_start_day || 28)
  - firebaseSync: Boolean(...)
  - theme: "light" | "dark" (default "dark")
  - syncUpdatedAt: Number or Date.now()
- cleanBillData(bill): any
  - Only cleans fields actually present in input (field-conditional cleaning)
- cleanDataForFirestore(data): any
  - Generic recursive function: strips all undefined values from nested objects/arrays

Internal (not exported):
safeParseDate(dateValue: any): string | null
  Handles: Firestore Timestamp (.toDate()), epoch number, ISO string, date-fns format list
  Returns null (never throws) on invalid input

### 8.5 Device ID and Tracking

src/utils/deviceId.ts:
- getDeviceId(): Promise<string>
  AsyncStorage key: @financy/device_id
  Format: device_{Date.now()}_{random 9 chars}
  Cached in module-level variable after first call
  Fallback on storage error: session_{timestamp}_{random} (not persisted)
- clearDeviceIdCache(): void  (for testing)

src/utils/deviceTracking.ts:
- addDeviceTracking<T>(data: T): Promise<T & { lastModifiedBy: string; lastModifiedAt: number }>
  Calls getDeviceId(); injects lastModifiedBy + Date.now() as lastModifiedAt
- hasDeviceTracking(data): boolean
- getDeviceTrackingInfo(data): { deviceId, timestamp } | null

### 8.6 General Utilities (src/utils/index.ts)

Currency:
- formatCurrency(amount, currency?, locale?): string  Intl.NumberFormat; fallback $ symbol
- parseCurrencyInput(input): number  strips all non-numeric except . and -; always positive

Dates (uses date-fns):
- formatDate(date, formatStr?): string         default "MMM dd, yyyy"
- formatDateForInput(date): string             "yyyy-MM-dd"
- formatDateForDisplay(date): string
- formatDateForStorage(date): string           .toISOString()
- parseStoredDate(dateString): Date
- isDateOverdue(dueDate): boolean              dueDate < today (day boundary)
- isDateUpcoming(dueDate, days?): boolean      dueDate within next N days
- isDateInRange(date, startDate, endDate): boolean

Validation:
- validateAmount(amount): boolean   0 < n <= 999999.99
- validateEmail(email): boolean
- validateRequired(value): boolean

Strings:
- truncateText(text, maxLength): string   appends "..." if truncated
- capitalizeFirst(text): string
- generateId(): string                    NOT crypto-random; Math.random().toString(36) + Date.now().toString(36)

Collections:
- groupBy<T>(array, key|fn): Record<string, T[]>
- sortBy<T>(array, key|fn, "asc"|"desc"): T[]

Numbers:
- roundToTwo(num): number              Math.round((n + Number.EPSILON) * 100) / 100
- percentage(part, total): number
- clamp(value, min, max): number
- calculateBudgetProgress(spent, budgetAmount): { spent, remaining, percentageUsed, isOverBudget }

Color:
- getContrastColor(hexColor): "#000000" | "#FFFFFF"  (luminance-based)

Misc:
- deepClone<T>(obj): T                 JSON.parse(JSON.stringify(obj))
- debounce<T>(func, wait): (...args) => void

---

## 9. Constants

File: src/constants/index.ts

`
DATABASE       = { NAME: "financy.db", VERSION: 1 }

TRANSACTION_TYPES = { INCOME: "income", EXPENSE: "expense", DEBT: "debt" }
CATEGORY_TYPES    = { INCOME: "income", EXPENSE: "expense" }

CURRENCY = { DEFAULT: "USD", SYMBOL: "$", LOCALE: "en-US" }

DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  INPUT: "yyyy-MM-dd",
  STORAGE: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
}

BILLING_PERIOD = { DEFAULT_START_DAY: 1, MIN_DAY: 1, MAX_DAY: 31 }
NOTE: Settings table defaults to day 28, not 1.

VALIDATION = {
  TRANSACTION: {
    MIN_AMOUNT: 0.01, MAX_AMOUNT: 999999.99,
    MIN_DESCRIPTION_LENGTH: 2, MAX_DESCRIPTION_LENGTH: 100, MAX_NOTE_LENGTH: 500
  },
  BUDGET: { MIN_AMOUNT: 0.01, MAX_AMOUNT: 999999.99, MAX_NAME_LENGTH: 50 },
  BILL: { MIN_AMOUNT: 0.01, MAX_AMOUNT: 999999.99, MAX_NAME_LENGTH: 50 },
  CATEGORY: { MAX_NAME_LENGTH: 30, MIN_NAME_LENGTH: 1 }
}

EXPORT = { FORMATS: ["JSON", "CSV"], MAX_RECORDS: 10000 }
`

---

## 10. Bootstrapping Sequence

Order of operations on app start (currently spread across App.tsx and Redux thunks):

`
1. initializeFirebase()
   Sets up app, auth (AsyncStorage persistence), Firestore

2. DatabaseManager.ensureInitialized()
   Opens financy.db, PRAGMA WAL, creates tables, runs migrations

3. authService.tryRestoreSession()   [or dispatch(initializeAuth)]
   Checks AsyncStorage for valid session (< 30 days old)
   If user ID changed since last session: dbManager.resetDatabase()

4. dispatch(fetchSettings())
   Loads / creates the "default" settings row

5. dispatch(fetchCategories())
   Loads all non-deleted categories into Redux

6. If authenticated:
   dispatch(initializeSync()) OR dispatch(syncConflictsOnly())
   - offlineFirstSync.syncConflictsOnly() processes pending sync_log rows
   - syncService.initializeSync() starts 10-minute collection polls

7. Optional first-time sync (on new device / new user):
   dispatch(initialCloudRestore())
   - offlineFirstSync.performInitialCloudPull()
   - Phase 1: categories + settings
   - Phase 2: budgets + transactions + bills + debts + debt_payments
   - Phase 3: retry failed inserts (respects FK dependency order)

8. dispatch(fetchTransactions())
   dispatch(fetchBudgets())
   dispatch(fetchDebts())
   Populate Redux from local DB after cloud data is applied

9. NotificationService.getInstance().initialize()
   Request permissions, load settings, register background tasks, schedule notifications

10. If Platform.OS === "android":
    smsService.startListening(categories, budgets)
`

---

## Appendix A: Firestore Collection Structures

All documents: users/{uid}/{collection}/{docId}

FirestoreDocument wrapper shape:
`
{
  id: string,                         same as docId
  data: { ...entity fields camelCase },
  updatedAt: number,                  epoch ms
  deleted?: boolean,
  data.lastModifiedBy: string,        deviceId (injected by addDeviceTracking)
  data.lastModifiedAt: number         epoch ms (injected by addDeviceTracking)
}
`

Written with: setDoc(docRef, syncDoc, { merge: true }) — partial writes are safe.

Collection names match COLLECTIONS constant exactly:
transactions, categories, budgets, debts, debt_payments, settings, bills (legacy)

---

## Appendix B: Known Gotchas

1. **settings.sync_updated_at dual purpose:**
   Stores the timestamp of the last successful cloud poll, NOT the settings entity's own modification time.
   Written by: SettingsRepository.updateSettings({ syncUpdatedAt: Date.now() }, { skipSync: true })

2. **updated_at type inconsistency across tables:**
   - transactions.updated_at: INTEGER (epoch ms) in SQL / number in TypeScript
   - budgets.updated_at, debts.updated_at, settings.updated_at: TEXT (ISO string) in SQL / string in TypeScript
   Keep type coercions in mind in migration queries.

3. **Bills removed from Redux but still in DB and Firestore:**
   The bills table exists. Cloud restore still syncs the "bills" collection.
   No BillRepository exists. Bills are tracked via Transaction.linkedBillId.
   The TABLE_TO_COLLECTION map in OfflineFirstSync includes: bills -> "bills"

4. **Category soft-delete exception in cloud restore:**
   During syncCollectionWithIdComparison, if a cloud category doc has deleted=true AND
   the local category is a "default" category, it IS soft-deleted locally.
   All other entity types skip deleted cloud documents entirely.

5. **Conflict resolution 10-minute window:**
   - Different device, within 10 min: remote always wins (UPDATE_LOCAL)
   - Different device, beyond 10 min: timestamp comparison
   - Same device: always skip (prevents sync loops)

6. **generateId() is NOT crypto-random:**
   Uses Math.random().toString(36) + Date.now().toString(36)
   Only the Excel importer (ExcelImportService.convertRowToTransaction) uses expo-crypto.randomUUID().

7. **addDebt thunk uses syncUpdatedAt not updatedAt:**
   In debtsSlice.addDebt, the payload uses field syncUpdatedAt: Date.now() (not updatedAt).
   The Debt interface has both updatedAt (string) and syncUpdatedAt (number).
