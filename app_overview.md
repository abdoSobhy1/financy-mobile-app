# Financy App - Comprehensive Overview

## 1. Executive Summary

**Financy** is a personal finance management application built with **React Native (Expo)**. It is designed to be **Offline-First**, using a local **SQLite** database for all operations and synchronizing with **Firebase** when online. The app empowers users to track transactions, manage budgets, monitor debts, and analyze their financial health through visual reports.

### Key Technologies

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **State Management**: Redux Toolkit (global state) + React Context (Auth/Sync/Theme)
- **Database**: Expo SQLite (local) + Firebase (cloud sync)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **UI**: Custom components with `react-native-svg` for charts and `@expo/vector-icons`.

---

## 2. Directory Structure & Organization

```
d:\MyPlayGround\financy\
├── .firebaserc
├── .gitignore
├── app-release.apk
├── app.json
├── App.tsx
├── compress rn.bat
├── eas.json
├── exclude-self.txt
├── firebase.json
├── firestore-rules.txt
├── index.ts
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── sync-fix-snippet.tsx
├── test-notifications.js
├── test-timestamp-fix.js
├── tsconfig.json
└── src/
    ├── components/
    │   ├── analysis/
    │   │   └── ChartCard.tsx
    │   ├── bills/
    │   │   ├── BillFiltersModal.tsx
    │   │   ├── BillFormModal.tsx
    │   │   ├── EnhancedBillCard.tsx
    │   │   └── index.ts
    │   ├── debt/
    │   │   ├── DebtPaymentCard.tsx
    │   │   └── index.ts
    │   ├── debug/
    │   │   └── SyncTestComponent.tsx
    │   ├── filters/
    │   │   ├── AdvancedFiltersModal.tsx
    │   │   ├── BudgetBasedCategoryFilter.tsx
    │   │   ├── FilterButton.tsx
    │   │   └── QuickDatePresets.tsx
    │   ├── forms/
    │   │   ├── bill/
    │   │   │   └── BillForm.tsx
    │   │   ├── budget/
    │   │   │   └── BudgetForm.tsx
    │   │   ├── debt/
    │   │   │   └── DebtForm.tsx
    │   │   ├── AddBillModal.tsx
    │   │   ├── AddBudgetModal.tsx
    │   │   ├── AddTransactionModal.tsx
    │   │   ├── BaseForm.tsx
    │   │   ├── FormField.tsx
    │   │   ├── index.ts
    │   │   └── UnifiedForm.tsx
    │   ├── import/
    │   │   ├── ColumnMappingStep.tsx
    │   │   ├── FileSelectionStep.tsx
    │   │   ├── GlobalSettingsStep.tsx
    │   │   ├── ImportProgressStep.tsx
    │   │   ├── index.ts
    │   │   ├── PreviewStep.tsx
    │   │   ├── ResultsStep.tsx
    │   │   └── ValidationStep.tsx
    │   ├── ui/
    │   │   ├── BudgetSelector.tsx
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── CategoryCreationModal.tsx
    │   │   ├── CategorySelector.tsx
    │   │   ├── CustomAlert.tsx
    │   │   ├── CustomDatePicker.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── FirebaseCleanupModal.tsx
    │   │   ├── FloatingActionButton.tsx
    │   │   ├── index.ts
    │   │   ├── Input.tsx
    │   │   ├── LoadingOverlay.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Screen.tsx
    │   │   ├── Shimmer.tsx
    │   │   ├── SyncStatus.tsx
    │   │   ├── Toast.tsx
    │   │   └── ToastProvider.tsx
    │   └── ImportWizard.tsx
    ├── constants/
    │   └── index.ts
    ├── contexts/
    │   ├── AuthContext.tsx
    │   ├── SyncContext.tsx
    │   └── SyncProvider.tsx
    ├── database/
    │   ├── migrations/
    │   │   └── billPaymentsMigration.ts
    │   ├── models/
    │   │   └── index.ts
    │   ├── queries/
    │   │   ├── bills.ts
    │   │   ├── budgets.ts
    │   │   ├── categories.ts
    │   │   ├── debts.ts
    │   │   ├── index.ts
    │   │   ├── settings.ts
    │   │   └── transactions.ts
    │   └── index.ts
    ├── debug/
    │   ├── checkLinkedBills.ts
    │   └── runSyncTest.ts
    ├── hooks/
    │   ├── index.ts
    │   ├── useBillingPeriodPresets.ts
    │   ├── useSessionManager.ts
    │   ├── useSyncDataRefresh.ts
    │   └── useSyncManager.ts
    ├── navigation/
    │   ├── AnalysisStackNavigator.tsx
    │   ├── AppNavigator.tsx
    │   ├── BillStackNavigator.tsx
    │   ├── BudgetStackNavigator.tsx
    │   ├── DebtStackNavigator.tsx
    │   ├── index.ts
    │   ├── SettingsStackNavigator.tsx
    │   ├── TabNavigator.tsx
    │   └── TransactionStackNavigator.tsx
    ├── screens/
    │   ├── analysis/
    │   │   ├── hooks/
    │   │   │   └── useAnalysisData.ts
    │   │   ├── AnalysisScreen.tsx
    │   │   └── CreateCustomChartScreen.tsx
    │   ├── AddPaymentScreen.tsx
    │   ├── AddTransactionScreen.tsx
    │   ├── BudgetFormScreen.tsx
    │   ├── BudgetScreens.tsx
    │   ├── DebtFormScreen.tsx
    │   ├── DebtPaymentsScreen.tsx
    │   ├── DebtsScreen.tsx
    │   ├── EditDebtScreen.tsx
    │   ├── ImportScreen.tsx
    │   ├── index.ts
    │   ├── SettingsScreens.tsx
    │   ├── SignInScreen.tsx
    │   ├── TestNotificationsScreen.tsx
    │   ├── TransactionListScreen.tsx
    │   └── TransactionScreens.tsx
    ├── services/
    │   ├── authService.ts
    │   ├── billPaymentService.ts
    │   ├── EntityManager.ts
    │   ├── excelImportService.ts
    │   ├── firebase.ts
    │   ├── notificationService.ts
    │   ├── OfflineFirstSync.ts
    │   ├── syncService.ts
    │   └── SyncTracker.ts
    ├── store/
    │   ├── slices/
    │   │   ├── analysisSlice.ts
    │   │   ├── authSlice.ts
    │   │   ├── budgetsSlice.ts
    │   │   ├── categoriesSlice.ts
    │   │   ├── debtsSlice.ts
    │   │   ├── settingsSlice.ts
    │   │   ├── syncSlice.ts
    │   │   └── transactionsSlice.ts
    │   └── index.ts
    ├── types/
    │   ├── import.ts
    │   └── index.ts
    └── utils/
        ├── billingPeriod.ts
        ├── databaseExport.ts
        ├── databaseMigration.ts
        ├── dateUtils.ts
        ├── deviceId.ts
        ├── deviceTracking.ts
        ├── exportUtils.ts
        ├── firebaseCleanup.ts
        ├── index.ts
        ├── logger.ts
        ├── mathUtils.ts
        ├── userPreferences.ts
        └── validation.ts
```

---

## 3. Architecture & Data Flow

### 3.1. Database (Local First)

The app uses a **SQLite** database as the single source of truth for the UI.

- **DatabaseManager**: A singleton class (`src/database/index.ts`) that handles initialization, migrations, and connection.
- **Schema**:
  - `transactions`: Stores income, expense, and debt transactions.
  - `categories`: Classification for transactions (Income/Expense types).
  - `budgets`: Monthly spending limits linked to categories.
  - `debts`: Debt tracking (Total amount, paid, interest, etc.).
  - `debt_payments`: Individual payments made towards debts.
  - `settings`: App configuration (Currency, Theme, Sync settings).
  - `sync_log`: Audit log for changes to support offline synchronization.

### 3.2. Synchronization (Offline-First)

- **Mechanism**: Changes are written to SQLite and logged in `sync_log`.
- **Sync Logic**: `offlineFirstSync` service pushes local changes to Firebase and pulls remote changes when online.
- **Conflict Resolution**: Timestamp-based (Last Write Wins) or append-only logs depending on the entity.
- **Context**: `SyncProvider` exposes sync status and manual sync triggers to the UI.

### 3.3. State Management

- **Redux Toolkit**: Manages application state extracted from the database for fast UI rendering.
  - `transactionsSlice`: List of transactions, filtering, and sorting.
  - `budgetsSlice`: active budgets and progress.
  - `categoriesSlice`: Available categories.
  - `debtsSlice`: Debt portfolio and payment history.
  - `authSlice`: User session data.
- **Refetching**: Data is re-fetched from SQLite into Redux when database changes occur or after a sync.

---

## 4. Functionality & Features

### 4.1. Transactions

- **Tracking**: Users can add Income, Expense, or Debt-related transactions.
- **Organization**: Transactions are categorized and date-stamped.
- **UI**: `TransactionListScreen` shows a history, `AddTransactionScreen` for new entries.

### 4.2. Budgets

- **Planning**: Users set monthly caps for specific categories.
- **Monitoring**: Visual progress bars show spending vs. limit.
- **Alerts**: (Implied) Visual indicators for overspending.
- **Logic**: DB triggers or app logic updates `current_balance` calculation based on transactions.

### 4.3. Debts Management

- **Portfolio**: Track multiple debts (Credit Cards, Loans).
- **Details**: Interest rates, minimum payments, due dates.
- **Payments**: Record payments which reduce the principal/balance.
- **Strategies**: Supports extra payments (Snowball/Avalanche methods implied by structure).

### 4.4. Analysis

- **Visualizations**: Charts (likely Pie/Bar) showing spending distribution.
- **Insights**: Breakdown by category or over time.
- **Screens**: `AnalysisStackNavigator` handles period selection and report configuration.

### 4.5. Settings

- **Customization**: Theme (Light/Dark), Currency selection.
- **Data Management**: Import/Export (Excel/JSON implied), Cloud Sync toggles.
- **Notifications**: Reminders for daily logging or due dates.

---

## 5. User Interface (UI)

- **Navigation**:
  - **Bottom Tabs**: Quick access to core modules (Transactions, Budgets, Debts, Analysis, Settings).
  - **Stacks**: Drill-down lists (e.g., Budget Details, Debt Payment History).
- **Design System**:
  - Consistent color palette (defined in `src/constants`).
  - Reusable `forms` for data entry.
  - Interactive `charts` for data visualization.
  - `LoadingOverlay` and `ToastProvider` for feedback.

## 6. Development Workflow

- **Deep Links**: Managed by Expo Linking (e.g., for auth redirects).
- **Migrations**: Custom migration system in `DatabaseManager` ensures schema updates without data loss.
- **Type Safety**: Extensive use of TypeScript interfaces for Models and Props.
