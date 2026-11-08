# Architecture

Financy is organized by product feature. Code for a feature lives together instead of being spread across global screens, services, and state folders.

```text
App.tsx                          Application composition
src/
  app/
    bootstrap/                   Startup and native lifecycle coordination
    navigation/                  Root navigation and tab composition
    store/                       Redux store assembly and session reset
  features/
    analysis/
    auth/
    budgets/
    categories/
    dashboard/
    debts/
    import/
    receipts/
    settings/
    sms/
    transactions/
    voice/
    wallets/
  infrastructure/
    ai/                          AI provider clients and quota management
    database/                    SQLite connection, migrations, row mapping
    device/                      Device identity and sync metadata
    firebase/                    Firebase initialization and maintenance
    notifications/               Native notification integration
    sync/                        Outbox, cloud transport, sync providers/hooks
  shared/
    constants/
    hooks/                       Feature-independent UI hooks
    services/                    In-app alert bridge
    theme/
    types/                       Contracts used across multiple features
    ui/                          Reusable visual primitives
    utils/                       Common formatting, dates, validation, logging
tests/
  unit/                          Tracked regression fixtures and unit tests
  tsconfig.json                  Node types for the test environment
```

## Inside a feature

Only create directories that the feature needs. For example:

```text
features/transactions/
  components/                    Cards, filters, and transaction-specific UI
  hooks/
    useAddTransactionScreen.ts   Entry state, validation, and save actions
    useTransactionListScreen.ts  Filtering, refresh, and selection state
    useTransactionActions.ts    Shared edit/duplicate/delete interactions
  navigation/                    Feature navigation stack
  repositories/                  Transaction persistence operations
  screens/                       Layout, styling, and event bindings
  store/                         Redux state, selectors, and async actions
```

`screens` compose feature components and bind controller values to the view. Components handle layout, visual states, and short-lived interaction state; they do not import feature services, repositories, or stores at runtime. Screen and feature hooks coordinate Redux, navigation, side effects, validation, and actions without returning JSX. Services implement parsing and business operations. Repositories read and write SQLite. Rendering details such as theme selection, styles, and layout stay in the view.

Large screens are composed from named sections and modals. Repeated visuals belong in shared UI primitives or a feature component. For example, dashboard and ledger rows share the transaction presentation model and `TransactionSummary`, while settings use common section headings, cards, and action rows. Feature-specific display rules live in `model/`; persistence and orchestration remain in hooks, services, or repositories.

Screen hooks are presentation controllers, not a replacement for the service layer. Keep reusable calculations and rules in feature services or utilities rather than copying them between controllers. Small wrapper screens do not need a controller merely to pass a prop.

## Dependency boundaries

- `app` composes features and infrastructure. Features do not belong inside the application store folder merely because they use Redux.
- A feature owns its screens, components, state, repositories, and services. Import another feature explicitly when collaborating with it; do not hide feature dependencies in shared barrels.
- `infrastructure` owns platform and persistence mechanisms. The central repository registry is the composition point for the existing database API.
- `shared` contains feature-independent code and cannot import from `app`, `features`, or `infrastructure`. Domain selectors, wallet editors, and sync status components do not belong here.
- Prefer direct module imports for cross-feature references. Keep barrels small and local; do not create a global barrel exporting the entire application.
- Use `import type` for type-only dependencies when adding or touching imports.

The current repositories and sync engine retain their existing collaboration to preserve behavior. Separating sync transport from repository orchestration and splitting the remaining cross-feature model/validation contracts are future refactors, not claims about this migration. Presentation components still accept controller-derived values through typed props; keep those contracts focused when adding sections.

## Adding or moving code

1. Choose the owning feature first. Use `shared` only when the code is independent of any particular feature.
2. Add rendering to a screen or component; put persistence and action orchestration in a hook, service, or repository.
3. Move tracked files with `git mv`, then update static imports, dynamic imports, asset references, tests, and documentation.
4. Run `npm run check`. For native integration changes, also verify a development build on the affected platform.

The architecture check verifies source roots, relative module paths, the shared dependency boundary, the absence of JSX in screen controller hooks, and that feature views do not import feature services, repositories, or stores at runtime.

## Local verification

```bash
npm run check:architecture
npm run typecheck
npm test
# Run all three:
npm run check

# Verify Android JavaScript and Hermes bundling:
npx expo export --platform android --output-dir dist/feature-structure-check
```

The unit runner mocks native modules and SQLite. Passing it does not verify real SQLite migrations, Firebase synchronization, permissions, or device behavior. The GitHub Actions workflow runs architecture checks, type checking, and the tracked unit tests on pushes and pull requests.
