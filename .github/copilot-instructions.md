# React Native Expo + SQLite Best Practices for LLM Code Generation

## Implementation Tasks Breakdown

### Phase 1: Project Setup and Initialization

#### Task 1.1: Create Expo Project
1. Create a new Expo project with the latest SDK version using TypeScript template
2. Navigate to the project directory and verify the setup
3. Install additional core dependencies for the finance app

#### Task 1.2: Install Required Dependencies  
```bash
# Core dependencies
npm install @reduxjs/toolkit react-redux
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install expo-sqlite expo-file-system
npm install react-native-reanimated react-native-gesture-handler
npm install date-fns uuid

# Development dependencies  
npm install --save-dev @types/uuid
```

#### Task 1.3: Setup Project Structure
Create the following folder structure:

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI elements (Button, Input, Card)
│   └── forms/           # Form-specific components
├── features/            # Feature-based modules
│   ├── transactions/    # Transaction-related components and logic
│   ├── budgets/        # Budget-related components and logic
│   ├── bills/          # Bills-related components and logic
│   └── settings/       # Settings-related components and logic
├── screens/            # Screen components
├── navigation/         # Navigation configuration
├── store/             # Redux store and slices
├── database/          # SQLite database layer
│   ├── models/        # TypeScript interfaces and types
│   ├── queries/       # Database query functions
│   └── migrations/    # Database schema migrations
├── utils/             # Utility functions
├── constants/         # App-wide constants
└── types/             # Global TypeScript types
```

### Phase 2: Database Foundation

#### Task 2.1: Define TypeScript Interfaces
Create type definitions for all entities:
- Transaction types (income, expense, debt)
- Budget interface
- Bill interface  
- Category interface
- Settings interface

#### Task 2.2: SQLite Database Setup
1. Create database initialization function
2. Define table schemas for:
   - `transactions` table
   - `categories` table  
   - `budgets` table
   - `bills` table
   - `settings` table

#### Task 2.3: Database Query Layer
Create repository functions for each entity:
- Transaction CRUD operations
- Budget CRUD operations
- Bill CRUD operations
- Category CRUD operations

### Phase 3: State Management Setup

#### Task 3.1: Redux Store Configuration
1. Setup Redux store with RTK
2. Configure store provider in App.tsx

#### Task 3.2: Create Redux Slices
Create individual slices for:
- `transactionsSlice` - manage transactions state
- `budgetsSlice` - manage budgets state  
- `billsSlice` - manage bills state
- `categoriesSlice` - manage categories state
- `settingsSlice` - manage app settings

#### Task 3.3: Connect Database to Redux
Create async thunks to bridge database operations with Redux state

### Phase 4: Core UI Components

#### Task 4.1: Basic UI Components
Create reusable components:
- `Button` - consistent button styling
- `Card` - frosted glass card design
- `Input` - form input with validation
- `Modal` - modal overlay component

#### Task 4.2: Layout Components  
- `Screen` - consistent screen wrapper
- `Section` - content section with spacing
- `Header` - screen header component

#### Task 4.3: Theme and Styling
1. Define color palette and spacing constants
2. Create theme provider for consistent styling
3. Implement dark mode with frosted glass effects

### Phase 5: Navigation Structure

#### Task 5.1: Bottom Tab Navigation
Setup bottom tab navigation with screens for:
- Transactions
- Budgets  
- Bills
- Settings

#### Task 5.2: Stack Navigation
Create stack navigators for each feature area with proper screen transitions

### Phase 6: Feature Implementation - Transactions

#### Task 6.1: Transaction List Screen
1. Create transaction list view with FlatList
2. Implement transaction card component
3. Add pull-to-refresh functionality

#### Task 6.2: Add Transaction Form
1. Create transaction form modal
2. Implement form validation
3. Connect to Redux and database

#### Task 6.3: Transaction Filtering
1. Add filter by category functionality  
2. Add filter by budget functionality
3. Add date range filtering

#### Task 6.4: Transaction Actions
1. Implement edit transaction functionality
2. Add delete transaction with confirmation
3. Add duplicate transaction feature

### Phase 7: Feature Implementation - Budgets

#### Task 7.1: Budget List Screen
1. Create budget cards showing progress
2. Display current balance vs budget amount
3. Show spending by category within budget

#### Task 7.2: Budget Management
1. Create add/edit budget form
2. Implement budget reset functionality
3. Connect budget calculations to billing period

#### Task 7.3: Budget Progress Visualization
Add progress bars and spending indicators for each budget

### Phase 8: Feature Implementation - Bills

#### Task 8.1: Bills List Screen
1. Create bills list with due dates
2. Show paid/unpaid status
3. Group bills by due date

#### Task 8.2: Bill Management
1. Create add/edit bill form
2. Implement mark as paid functionality
3. Connect bills to budgets if applicable

#### Task 8.3: Bill Reminders
Add visual indicators for upcoming due dates

### Phase 9: Settings Implementation

#### Task 9.1: Settings Screen Layout
Create settings sections:
- Billing period configuration
- Data management
- Export functionality
- Category management

#### Task 9.2: Billing Period Settings
1. Implement billing cycle start day selector
2. Add force budget reset functionality
3. Show current billing period dates

#### Task 9.3: Category Management
1. Create category list with edit/delete actions
2. Add new category form
3. Prevent deletion of categories with transactions

#### Task 9.4: Data Export
1. Implement date range selector for export
2. Create JSON export functionality
3. Add CSV export option

### Phase 10: Polish and Optimization

#### Task 10.1: Loading States
Add loading indicators for all async operations

#### Task 10.2: Error Handling
Implement comprehensive error handling with user-friendly messages

#### Task 10.3: Performance Optimization
1. Add React.memo to prevent unnecessary re-renders
2. Optimize FlatList performance
3. Implement proper cleanup for subscriptions

#### Task 10.4: Data Validation
Add comprehensive input validation for all forms

### Phase 11: Advanced Features (Optional)

#### Task 11.1: Firebase Integration (Optional)
1. Setup Firebase configuration
2. Implement sync toggle in settings
3. Create background sync functionality

#### Task 11.2: Charts and Analytics (Optional)
1. Add spending trends visualization
2. Create budget vs actual spending charts
3. Implement category-wise spending breakdown

## Detailed Project Structure

### Folder Organization
- **Use feature-based structure over type-based structure**
  - ✅ `features/transactions/`, `features/budgets/`, `features/bills/`
  - ❌ `components/`, `screens/`, `hooks/` at root level
- **Keep shared utilities in dedicated folders**
  - `src/shared/components/` for reusable UI components
  - `src/shared/hooks/` for custom hooks
  - `src/shared/utils/` for helper functions
  - `src/shared/constants/` for app-wide constants
- **Database layer separation**
  - `src/database/` for SQLite schemas, migrations, and queries
  - `src/database/models/` for data models and types
  - `src/database/queries/` organized by entity (transactions, budgets, etc.)

### File Naming Conventions
- Use **PascalCase** for React components: `TransactionCard.tsx`
- Use **camelCase** for utilities and hooks: `formatCurrency.ts`, `useTransactions.ts`
- Use **kebab-case** for non-component files: `transaction-types.ts`
- Suffix component files with descriptive names: `TransactionList.tsx`, `BudgetCard.tsx`

## Component Creation Guidelines

### When to Create New Components
1. **Reusability**: If used in 2+ places, extract to shared component
2. **Complexity**: When a component exceeds ~100 lines or has >3 responsibilities
3. **Testability**: When logic needs isolated testing
4. **Readability**: When nested JSX becomes hard to follow (>3 levels deep)

### Component Types to Create
- **UI Components**: `Button`, `Card`, `Input`, `Modal`
- **Feature Components**: `TransactionForm`, `BudgetProgress`, `BillsList`
- **Layout Components**: `Screen`, `Section`, `Container`
- **Data Components**: `TransactionProvider`, `DatabaseProvider`

### Component Structure Template
```tsx
// 1. Imports (external → internal → types)
// 2. Types/Interfaces
// 3. Component function
// 4. Styles (if using StyleSheet)
// 5. Default export
```

## State Management (Redux/Zustand)

### Keep Stores Simple
1. **Single Responsibility**: One slice per domain (transactions, budgets, bills, settings)
2. **Flat State Structure**: Avoid deep nesting, use normalized data
3. **Computed Properties**: Use selectors for derived state, not store state
4. **Minimal State**: Store only what can't be derived or fetched

### Store Structure Example
```typescript
// ✅ Good - Normalized and flat
interface TransactionsState {
  items: Record<string, Transaction>;
  ids: string[];
  loading: boolean;
  filters: TransactionFilters;
}

// ❌ Avoid - Nested and denormalized
interface BadState {
  transactions: {
    list: Array<{
      id: string;
      category: {
        id: string;
        name: string;
        budget: { ... }
      }
    }>;
  };
}
```

### Actions and Reducers
- **Pure reducers**: No side effects, predictable state changes
- **Async actions**: Use RTK Query or dedicated async thunks
- **Optimistic updates**: Update UI immediately, handle errors gracefully

## Markup and JSX Best Practices

### Keep JSX Simple
1. **Extract complex expressions**: Move logic to variables or helper functions
2. **Limit conditional rendering**: Max 2 levels of ternary operators
3. **Use early returns**: Reduce nesting in render functions
4. **Fragment over unnecessary divs**: Use `<>` when no wrapper styling needed

### JSX Guidelines
```tsx
// ✅ Good - Clean and readable
const TransactionCard = ({ transaction }) => {
  const formattedAmount = formatCurrency(transaction.amount);
  const isExpense = transaction.type === 'expense';
  
  if (!transaction) return null;
  
  return (
    <Card style={[styles.card, isExpense && styles.expense]}>
      <Text>{transaction.description}</Text>
      <Text style={styles.amount}>{formattedAmount}</Text>
    </Card>
  );
};

// ❌ Avoid - Inline complexity
const BadCard = ({ transaction }) => (
  <Card style={[styles.card, transaction?.type === 'expense' ? styles.expense : null]}>
    {transaction ? (
      <>
        <Text>{transaction.description}</Text>
        <Text style={styles.amount}>
          {new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
          }).format(transaction.amount)}
        </Text>
      </>
    ) : null}
  </Card>
);
```

## Database Design Principles

### SQLite Schema Best Practices
1. **Consistent naming**: Use `snake_case` for table and column names
2. **Proper indexing**: Index frequently queried columns (dates, foreign keys)
3. **Data types**: Use appropriate SQLite types (`INTEGER`, `TEXT`, `REAL`, `BLOB`)
4. **Constraints**: Use foreign keys, NOT NULL, and CHECK constraints
5. **Migrations**: Version your schema changes, never modify existing migrations

### Query Organization
- **Repository pattern**: Create dedicated classes/functions for each entity
- **Query builders**: Use prepared statements to prevent SQL injection
- **Transactions**: Wrap related operations in database transactions
- **Connection management**: Use connection pooling, close connections properly

## Performance Considerations

### React Native Specific
1. **FlatList for large datasets**: Use `FlatList`/`SectionList` over `ScrollView`
2. **Image optimization**: Use proper image formats and sizes
3. **Bundle size**: Tree-shake unused imports, lazy load heavy components
4. **Memory management**: Clean up listeners, timers, and subscriptions

### State Updates
- **Batch updates**: Group related state changes
- **Memoization**: Use `React.memo`, `useMemo`, `useCallback` strategically
- **Selective re-renders**: Design components to minimize unnecessary renders

## Error Handling and Validation

### Defensive Programming
1. **Input validation**: Validate all user inputs at component level
2. **Database errors**: Handle SQLite errors gracefully with user-friendly messages
3. **Async operations**: Always handle Promise rejections
4. **Fallback UI**: Provide loading states and error boundaries

### Validation Strategy
```typescript
// ✅ Good - Schema-based validation
const transactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(100),
  categoryId: z.string().uuid(),
});

// ✅ Good - Form validation hook
const useTransactionForm = () => {
  const [errors, setErrors] = useState({});
  
  const validate = (data: TransactionInput) => {
    try {
      transactionSchema.parse(data);
      setErrors({});
      return true;
    } catch (error) {
      setErrors(formatZodErrors(error));
      return false;
    }
  };
  
  return { validate, errors };
};
```

## Code Organization Patterns

### Custom Hooks
- **Single purpose**: One responsibility per hook
- **Reusable logic**: Extract common patterns (data fetching, form handling)
- **Clear naming**: Use descriptive names (`useTransactionFilters`, `useBudgetCalculations`)

### Utility Functions
- **Pure functions**: No side effects, predictable outputs
- **Type safety**: Use TypeScript generics for flexibility
- **Documentation**: JSDoc comments for complex logic

### Constants and Configuration
```typescript
// ✅ Good - Organized constants
export const DATABASE = {
  NAME: 'financy.db',
  VERSION: 1,
} as const;

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  DEBT: 'debt',
} as const;

export const UI = {
  CARD_RADIUS: 12,
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
  },
} as const;
```

## Testing Considerations

### What to Test
1. **Business logic**: Data transformations, calculations
2. **Database operations**: CRUD operations, migrations
3. **Component behavior**: User interactions, state changes
4. **Integration points**: API calls, async operations

### Testing Structure
- **Unit tests**: Individual functions and components
- **Integration tests**: Feature workflows
- **Database tests**: Schema and query correctness

## Security and Privacy

### Data Protection
1. **Local storage**: Use SQLite encryption if handling sensitive data
2. **Input sanitization**: Validate and sanitize all user inputs
3. **Export security**: Sanitize exported data, avoid exposing internal IDs

### Privacy Considerations
- **Minimal data collection**: Only store necessary information
- **Data retention**: Implement data cleanup policies
- **User control**: Allow users to delete their data

## Documentation Standards

### Code Documentation
1. **README**: Setup instructions, architecture overview
2. **JSDoc**: Document complex functions and APIs
3. **Type definitions**: Use descriptive TypeScript interfaces
4. **Inline comments**: Explain business logic, not obvious code

### Component Documentation
```typescript
/**
 * Displays a transaction with amount, category, and date
 * @param transaction - The transaction to display
 * @param onPress - Callback when transaction is tapped
 * @param showCategory - Whether to display category name
 */
interface TransactionCardProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  showCategory?: boolean;
}
```

These best practices will help ensure the LLM generates clean, maintainable, and scalable React Native code that follows modern development patterns while keeping complexity manageable.