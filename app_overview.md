# Financy Project Overview

Financy is a React Native / Expo personal finance application featuring offline-first local SQLite persistence and optional Firebase cloud synchronization.

Its features cover transactions, budgets, categories, debts and payments, wallets and transfers, financial analysis, spreadsheet import, bank SMS detection, Arabic/English voice entry, and AI-assisted receipt scanning.

The source is organized by product domain under `src/features`. Application composition lives in `src/app`, platform integrations in `src/infrastructure`, and feature-independent primitives in `src/shared`.

Screen hooks coordinate state, validation, and side effects separately from the presentation layer, keeping screens and UI components focused on layout and interaction.

- [Architecture and contributor conventions](docs/ARCHITECTURE.md)
- [Setup, feature overview, and build instructions](README.md)
- [Detailed backend reference](docs/BACKEND_REFERENCE.md)

Run `npm run check` for architecture boundary checks, strict TypeScript verification across application and test suites, and the automated unit test suite.
