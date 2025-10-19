# Quarantine Review Checklist

Generated: 2025-10-19T08:17:35Z

This file lists quarantined items (copied to `__trash__/`) with a suggested action. Review each entry and mark keep / inspect / delete.

Format: - path — reason — suggested action — notes

- src/contexts/SyncContext.tsx — orphan (no incoming imports) — inspect/delete — file is 1-line empty stub. If unused, safe to delete.
- src/hooks/useSyncDataRefresh.ts — orphan — inspect — may be referenced by string or hook index barrel; search for dynamic usage.
- src/navigation/AppNavigator.tsx — orphan — inspect — important entry point candidate; verify navigation wiring before deletion.
- src/screens/BillPaymentHistoryScreen.tsx — orphan — inspect — screen; ensure no dynamic registration via navigation.
- src/screens/EditDebtScreen.tsx — orphan — inspect — screen; check navigation references.
- src/screens/TestNotificationsScreen.tsx — orphan — inspect — may be used manually for testing; check run scripts.
- src/screens/TransactionListScreen.tsx — orphan — inspect — heavy file; verify if registered in navigation or referenced by string.
- src/services/EntityManager.ts — orphan — inspect — service; check for runtime instantiation or DI patterns.
- src/services/SyncTracker.ts — orphan — inspect — likely used by sync layers; verify dynamic imports.
- src/utils/databaseMigration.ts — orphan — inspect — migrations may be referenced by name elsewhere; check database migration registry.
- src/components/bills/BillFormModal.tsx — orphan — inspect — modal component; check for dynamic usage via UI index barrel.
- src/components/debt/DebtPaymentCard.tsx — orphan — inspect — UI component; check for references in debt screens.
- src/components/debug/SyncTestComponent.tsx — orphan — inspect — debug-only component; likely safe to delete if unused.
- src/components/forms/AddBillModal.tsx — orphan — inspect — modal; verify re-exports in `src/components/forms/index.ts`.
- src/components/forms/AddBudgetModal.tsx — orphan — inspect — modal; verify re-exports.
- src/components/forms/AddTransactionModal.tsx — orphan — inspect — modal; verify re-exports.
- src/components/forms/BaseForm.tsx — orphan — inspect — shared base form; if unused, consider merging or restoring references.
- src/components/ui/BudgetSelector.tsx — orphan — inspect — UI component; check UI barrel `src/components/ui/index.ts`.
- src/components/ui/CategorySelector.tsx — orphan — inspect — UI component; check barrel exports.
- src/components/ui/CustomAlert.tsx — orphan — inspect — custom alert API; verify use via hook `useCustomAlert`.
- src/components/ui/EmptyState.tsx — orphan — inspect — simple component; check barrel exports.
- src/components/ui/ErrorBoundary.tsx — orphan — inspect — verify if wrapped at app root.
- src/components/ui/FirebaseCleanupModal.tsx — orphan — inspect — hooked into debug/settings; check SettingsScreens imports.
- src/components/ui/LoadingOverlay.tsx — orphan — inspect — look for use in UI components or loader states.
- src/components/ui/Modal.tsx — orphan — inspect — modal wrapper; check ui barrel.
- src/components/ui/Shimmer.tsx — orphan / duplicate — inspect/delete — empty stub; likely safe to delete.
- src/components/ui/SyncStatus.tsx — orphan — inspect — UI reflecting sync state; verify usage in settings or headers.
- src/components/ui/Shimmer.tsx — duplicate of src/contexts/SyncContext.tsx — inspect/delete — duplicate stub
- functions/src/index.ts — duplicate of src/contexts/SyncContext.tsx — inspect/delete — duplicate stub in functions

Notes:
- This quarantine is a non-destructive copy; originals remain in place. After human review and verification (run app/tests), we can permanently delete selected files.
- Some files may be referenced dynamically (string names, reflection) or by platform config (assets in app.json). Use textual search and runtime testing to confirm.

Suggested workflow:
1. For each file, search repository for name-based references (I will run a repo-wide search next).
2. Manually inspect likely hits and verify runtime usage.
3. Move confirmed unused items into a git branch `cleanup/phase1-unused-removal` and run app/tests.
4. After a verification period, delete from `__trash__` and merge cleanup branch.
