# Financy project overview

Financy is a React Native / Expo personal finance app with local SQLite storage and optional Firebase synchronization.

Its features cover transactions, budgets, categories, debts and payments, wallets and transfers, analysis, spreadsheet import, SMS detection, voice entry, and receipt scanning.

The source is organized by feature under `src/features`. Application wiring lives in `src/app`, platform integrations in `src/infrastructure`, and reusable feature-independent code in `src/shared`.

Screen hooks coordinate state and actions separately from the rendering layer. The migration preserves existing financial behavior; it does not claim to resolve the sync and data-integrity issues identified during review.

- [Architecture and contributor conventions](docs/ARCHITECTURE.md)
- [Setup, feature overview, and build instructions](README.md)
- [Detailed backend reference](docs/BACKEND_REFERENCE.md)

Run `npm run check` for architecture checks, application/test type checking, and the tracked unit suite. Device and live Firebase behavior require separate integration verification.
