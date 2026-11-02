# Financy — Offline-First Personal Finance & Smart Expense Tracker

<div align="center">
  <h3>An Offline-First React Native Financial Companion Built for Real-World Spending</h3>
  <p>Automated Egyptian Bank & InstaPay SMS Detection • Arabic/English Voice Logging • Hybrid AI Receipt OCR • Multi-Wallet & Debt Tracking</p>
</div>

---

## 💡 Why Financy?

Manual expense tracking usually fails after a few days because logging every coffee, transfer, and supermarket receipt by hand is tedious—especially across fragmented payment channels like **InstaPay**, **bank card SMS alerts**, **cash**, and **mobile wallets**.

**Financy** eliminates manual entry friction while keeping your financial data **offline-first** in a local **SQLite** database, with optional conflict-resilient **Firebase Cloud Sync**.

---

## ✨ Key Engineering & Product Features

### 1. 📱 Automated Bank & InstaPay SMS Detection (Android)
- **Real-Time Background Listener**: Native Android broadcast receiver (`withSmsDetection` Expo config plugin) captures incoming bank transaction alerts even when the app is backgrounded.
- **Bilingual Regex Engine (`smsParser.ts`)**: Parses Arabic and English SMS formats from major Egyptian banks (**CIB, NBE, Banque Misr, QNB, AlexBank, ValU, InstaPay**, etc.).
- **Smart ATM Withdrawal Filtering**: Automatically distinguishes ATM cash withdrawals (*"تم سحب"*, *"ATM"*, *"صراف آلي"*) from merchant purchases so moving money from bank to pocket cash is never double-counted as an expense.
- **Customizable Rules**: In-app configuration for custom bank sender IDs, currency keywords, and ATM filters.

### 2. 🎙️ Bilingual Voice Expense Logging (Arabic & English NLP)
- **Multi-Transaction Utterance Parsing (`voiceParser.ts`)**: Speak naturally in Egyptian Arabic or English to log multiple transactions in a single sentence:
  - *"دفعت 50 جنيه كهربا واشتريت بطاطس ب20 جنيه"* → Extracts 2 structured expenses with amounts, descriptions, and auto-matched categories.
  - *"استلمت 5000 مرتب"* → Extracts income transaction and maps to Salary.
- **Eastern-to-Western Digit Normalization**: Seamlessly normalizes Arabic numerals (`٠-٩`) and spoken number words (*ألف*, *ألفين*, *نص*, *ربع*).
- **Verification Flow**: Review, edit, or split voice-extracted transactions before committing to SQLite.

### 3. 🧾 Hybrid Receipt & InstaPay Slip Scanner (On-Device OCR + Multimodal Vision)
- **Tier 1 — On-Device OCR (`ocrService.ts`)**: Uses **Google ML Kit** / **Apple Vision** (`@dariyd/react-native-text-recognition`) and document edge scanning (`react-native-document-scanner-plugin`) for fast, private, offline extraction.
- **Tier 2 — Multimodal Vision AI (`aiService.ts`)**: Optional cloud enhancement using **Google Gemini Vision**, **Groq (Llama 3.3)**, or **OpenAI (GPT-4o-mini)** with proportional client-side image compression (`max 1080×1920`).
- **Line-Item Decomposition**: Automatically splits multi-item supermarket/restaurant receipts into individual categorized transactions or parses single InstaPay transfer slips.

### 4. 👛 Multi-Wallet, Secret Wallets & Financial Management
- **Multi-Account Tracking (`walletService.ts`)**: Manage Cash, Bank Accounts, Credit Cards, and Mobile Wallets with real-time balance computation and inter-wallet transfers.
- **Secret Wallets**: Privacy-focused hidden wallets excluded from main dashboard totals unless explicitly unlocked/selected.
- **Budgets & Custom Billing Cycles**: Set monthly category budgets aligned with your actual salary/billing start day (e.g., 25th of each month) rather than rigid calendar months.
- **Debt & Installment Portfolio**: Track loans, credit cards, interest rates, and partial payment histories.
- **Excel/CSV Import Wizard**: Multi-step column-mapping wizard (`ImportWizard.tsx`) with validation and preview for migrating historical spreadsheets.

### 5. 🔄 True Offline-First Architecture & Outbox Sync
- **SQLite Single Source of Truth**: All reads and writes hit local SQLite (`expo-sqlite`) first for zero-latency UI updates.
- **Transactional Outbox (`sync_log`)**: Every mutation (`insert`, `update`, `delete`) is recorded in a local `sync_log` table with device-fingerprinted metadata (`deviceTracking.ts`) to prevent infinite sync loops.
- **Delta Cloud Sync (`OfflineFirstSync.ts`)**: Automatically pushes pending outbox entries and pulls remote Firestore deltas on network recovery or app foregrounding.

---

## 🏗️ Technical Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | React Native `0.86` + Expo SDK `57` (New Architecture enabled) |
| **Language** | TypeScript `6.0` (Strict type-checked) |
| **Local Database** | `expo-sqlite` with automated schema & cloud-compatibility migrations |
| **State Management** | Redux Toolkit (`@reduxjs/toolkit`) + React Context (`SyncProvider`, `AuthProvider`) |
| **Cloud & Auth** | Firebase Authentication + Cloud Firestore (Delta & Batch Sync) |
| **OCR & Speech** | `@dariyd/react-native-text-recognition`, `react-native-document-scanner-plugin`, `@jamsch/expo-speech-recognition` |
| **UI & Animations** | Custom Theme Engine (Light/Dark), `react-native-reanimated`, `@gorhom/bottom-sheet`, `react-native-svg` |

---

## 📂 Project Architecture

Financy uses a feature-based structure. Each feature owns its screens, components, hooks, services, state, and repositories as needed.

```text
src/
├── app/                 # Bootstrap, root navigation, Redux store composition
├── features/            # Product features and their UI/application logic
│   ├── analysis/
│   ├── auth/
│   ├── budgets/
│   ├── categories/
│   ├── dashboard/
│   ├── debts/
│   ├── import/
│   ├── receipts/
│   ├── settings/
│   ├── sms/
│   ├── transactions/
│   ├── voice/
│   └── wallets/
├── infrastructure/      # SQLite, Firebase, sync, AI, notifications, device APIs
└── shared/              # Feature-independent UI, theme, forms, hooks, contracts
tests/unit/              # Versioned regression tests
```

Screen hooks coordinate state and actions; views render layout and styling. Shared code cannot import features or infrastructure. See [Architecture](docs/ARCHITECTURE.md) for ownership rules, examples, and current boundaries.

Provider API keys are not stored in Expo `EXPO_PUBLIC_*` variables. Hosted Gemini uses an authenticated Cloudflare Worker; see [API key handling](docs/SECURITY.md) for secret setup and deployment.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `>= 18`
- **npm** or **yarn**
- **Android Studio** (for Android development build) or **Xcode** (for iOS)
  > **Note:** Because Financy uses custom native modules (on-device OCR, speech recognition, and native Android SMS detection), run it using an **Expo Development Build** (`npx expo run:android` / `npx expo run:ios`) rather than standard Expo Go.

### 1. Clone & Install

```bash
git clone https://github.com/abdoSobhy1/financy-mobile-app.git
cd financy-mobile-app
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Fill in the optional Firebase client configuration in `.env` (the app works offline with local SQLite without it). Do not put AI provider keys in Expo environment variables; see [API key handling](docs/SECURITY.md):

```env
# Optional: Firebase Cloud Sync
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

```

To enable hosted Gemini, deploy the Cloudflare Worker and set `EXPO_PUBLIC_GEMINI_WORKER_URL` in the app's `.env`. Store `GEMINI_API_KEY` as a Worker secret. Personal provider keys entered in Settings are stored with Expo SecureStore.

### 3. Run Development Build

```bash
# Android (builds native client with SMS & OCR plugins)
npx expo run:android

# iOS
npx expo run:ios

# Start Metro bundler only
npm start
```

---

## 🧪 Testing & Verification

Run the automated test suite (covering SMS/voice parsing, receipt extraction, quotas, wallet balances, and billing-period filtering):

```bash
npm test
```

Type-check the codebase:

```bash
npm run typecheck
```

---

Run architecture checks, type checking, and tests together with `npm run check`. These checks also run in GitHub Actions.

## 📦 Building for Production (EAS)

```bash
# Build Android APK / AAB via EAS
eas build --platform android --profile production

# Build iOS archive via EAS
eas build --platform ios --profile production
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Abdelrahman Sobhy**
- GitHub: [@abdoSobhy1](https://github.com/abdoSobhy1)
