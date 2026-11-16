# Financy — Offline-First Personal Finance & Smart Expense OS

<div align="center">
  <img src="./assets/icon.png" alt="Financy Logo" width="96" height="96" />
  <h3>An Offline-First React Native Financial Companion Built for Real-World Spending</h3>
  <p>Automated Egyptian Bank & InstaPay SMS Detection • Arabic/English Voice Logging • Hybrid Receipt OCR • Multi-Wallet & Secret Vaults</p>
</div>

---

## 💡 Why Financy?

Most personal finance trackers fail within the first week because logging every coffee, transfer, and supermarket receipt by hand is tedious—especially across fragmented payment channels like **InstaPay**, **Vodafone Cash**, **bank card SMS alerts**, and **pocket cash**. Meanwhile, cloud-only trackers demand sensitive bank credentials or lag behind network requests.

**Financy** eliminates logging friction while keeping your financial data **100% offline-first** in a local **SQLite** database (`<100ms` cold start, `60fps` animations), paired with optional conflict-resilient **Firebase Cloud Sync**.

---

## ✨ Key Engineering & Product Features

### 1. 📩 Automated Bank & InstaPay SMS Detection (Android)
- **Real-Time Native Receiver**: Custom Android broadcast receiver (`withSmsDetection` Expo config plugin) captures incoming transaction alerts even when the app is backgrounded or closed.
- **20+ Pre-Configured Regional Senders (`smsParser.ts`)**: Out-of-the-box support for **CIB, NBE (Al-Ahly), Banque Misr, QNB, HSBC, AlexBank, Banque du Caire, EG Bank, InstaPay, Vodafone Cash, Fawry, Telda, and Klivvr**.
- **Smart ATM Withdrawal Filtering**: Automatically distinguishes ATM cash withdrawals (*"تم سحب"*, *"ATM"*, *"صراف آلي"*) from merchant purchases so moving cash from your bank card to your wallet is never double-counted as an expense.
- **Customizable Rule Engine**: Add or remove bank sender IDs, income/expense keywords, and parsing rules directly in Settings.

### 2. 👛 Multi-Wallet Cockpit & Secret Vaults 🔒
- **Unified Liquidity Tracking (`walletService.ts`)**: Manage Cash, Bank Accounts, Credit Cards, and Mobile Wallets with real-time balance computation.
- **Secret Vaults 🔒**: Mark savings or emergency accounts as **Secret** to exclude them from daily disposable net balance calculations on the main dashboard.
- **Instant Inter-Wallet Transfers**: Transfer funds between accounts (e.g., *CIB Account → Vodafone Cash*) with optional budget allocation in a single atomic transaction.

### 3. 🎙️ Bilingual Voice Expense Logging (Arabic & English NLP)
- **Multi-Transaction Utterance Parsing (`voiceParser.ts`)**: Speak naturally in Egyptian Arabic or English to log multiple transactions in a single sentence:
  - *"دفعت 50 جنيه كهربا واشتريت بطاطس ب20 جنيه"* → Extracts 2 structured expenses with amounts, descriptions, and auto-matched categories.
  - *"استلمت 5000 مرتب"* → Extracts income transaction and maps to Salary.
- **Digit & Spoken Number Normalization**: Seamlessly normalizes Eastern Arabic numerals (`٠-٩`) and spoken Arabic number words (*ألف*, *ألفين*, *نص*, *ربع*).

### 4. 🧾 Hybrid Receipt & InstaPay Slip Scanner (On-Device OCR + Multimodal Vision)
- **Tier 1 — On-Device Offline OCR (`ocrService.ts`)**: Uses **Google ML Kit** / **Apple Vision** (`@dariyd/react-native-text-recognition`) and document edge detection (`react-native-document-scanner-plugin`) for instant, private, zero-network extraction.
- **Tier 2 — Multimodal Vision AI (`aiService.ts`)**: Optional cloud enhancement supporting **Google Gemini**, **Groq (Llama 3.3)**, or **OpenAI (GPT-4o-mini)** with proportional client-side image compression and hardware-encrypted API key storage via `expo-secure-store`.
- **Line-Item Decomposition**: Automatically splits multi-item supermarket or restaurant receipts into categorized transactions or extracts InstaPay transfer slips.

### 5. 📊 Dynamic Payday Budgets, Analytics & Installment Tracker
- **Payday-Aligned Billing Cycles**: Align monthly budgets with your actual salary day (e.g., the **25th of each month**) rather than rigid calendar months.
- **Debt & Installment Portfolio**: Track credit card installments (e.g., *CIB Installments*), personal loans, payoff percentages, and one-tap repayment histories linked directly to wallet balances.
- **Cash Flow & Spending Intelligence**: Interactive category breakdown rings, multi-month cash flow bar charts, and live budget health indicators.

### 6. 🔄 Offline-First SQLite Engine, Outbox Sync & Full Data Portability
- **SQLite Single Source of Truth**: All reads and writes execute against local SQLite (`expo-sqlite`) with schema-aware dynamic migrations.
- **Transactional Outbox (`sync_log`)**: Every mutation (`insert`, `update`, `delete`) is recorded in a local outbox table with device-fingerprinted metadata to prevent sync loops during delta Firestore synchronization.
- **Complete Import/Export Suite**: Export or restore your financial history via **Multi-Sheet Excel (`.xlsx`)**, **CSV**, **Full JSON Snapshot (`.json`)**, or **Raw SQLite Database (`.db`)**, plus an interactive column-mapping **Import Wizard**.

---

## 🏗️ Technical Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | React Native `0.86` + Expo SDK `57` (New Architecture & Hermes Bytecode) |
| **Language** | TypeScript `6.0` (Strict mode) |
| **Local Database** | `expo-sqlite` with automated schema & cloud-compatibility migrations |
| **State Management** | Redux Toolkit (`@reduxjs/toolkit`) + React Context (`SyncProvider`, `AuthProvider`) |
| **Cloud & Auth** | Firebase Authentication + Cloud Firestore (Transactional Outbox & Delta Sync) |
| **OCR & Speech** | `@dariyd/react-native-text-recognition`, `react-native-document-scanner-plugin`, `@jamsch/expo-speech-recognition` |
| **Security** | `expo-secure-store` for hardware-encrypted API credentials |
| **UI & Animations** | Matte Slate Dark/Light Theme Engine, `react-native-reanimated`, `@gorhom/bottom-sheet`, `react-native-svg` |
| **Build Optimization** | R8 Code Shrinking, Resource Shrinking, ABI Filtering (`~37.5 MB` Release APK) |

---

## 📂 Project Architecture

Financy follows a strict **Feature-Based Clean Architecture** verified automatically in CI (`npm run check:architecture`). Each feature encapsulates its own screens, UI components, controller hooks, domain services, Redux slice, and SQLite repository:

```text
src/
├── app/                 # Bootstrap lifecycle, root navigation, Redux store composition
├── features/            # Domain-isolated product features
│   ├── analysis/        # Cash flow trends, spending breakdown rings, budget health
│   ├── auth/            # Authentication, guest mode, session persistence
│   ├── budgets/         # Payday-aligned monthly budgets & overspend alerts
│   ├── categories/      # Bilingual category dictionary & custom icon/color management
│   ├── dashboard/       # Net balance cockpit, quick-add slots, recent activity
│   ├── debts/           # Loans, credit card installments & repayment schedules
│   ├── import/          # Excel/CSV import wizard & SQLite/JSON/Excel backup engine
│   ├── receipts/        # On-device ML Kit OCR & multimodal AI receipt scanner
│   ├── settings/        # Currency, billing cycle, theme, AI & data management
│   ├── sms/             # Native Android bank SMS listener, parser & keyword editor
│   ├── transactions/    # Ledger, filtering, calculator keypad & CRUD flows
│   ├── voice/           # Arabic/English voice recognition & NLP parser
│   └── wallets/         # Multi-account management, Secret Vaults & transfers
├── infrastructure/      # SQLite, Firebase, Outbox Sync, AI clients, Notifications
└── shared/              # Pure UI primitives, theme tokens, formatting & contracts
tests/unit/              # Automated unit & regression test suites
```

- **Strict Boundary Enforcement**: `shared/` modules cannot import from `app/`, `features/`, or `infrastructure/`. Feature views (`screens/` & `components/`) never import repositories, services, or store slices directly at runtime—all side effects and state orchestration flow through dedicated controller hooks.
- See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed module rules.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `>= 18`
- **Android Studio** (Android SDK & NDK) or **Xcode** (macOS)
  > **Note:** Because Financy includes custom native modules (on-device ML Kit OCR, speech recognition, and native Android SMS broadcast receivers), build and run it with an **Expo Development Build** (`npx expo run:android`) rather than standard Expo Go.

### 1. Clone & Install

```bash
git clone https://github.com/abdoSobhy1/financy-mobile-app.git
cd financy-mobile-app
npm install
```

### 2. Environment Configuration (Optional)

Financy works **100% offline out of the box** using local SQLite. To enable optional Firebase Cloud Sync, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

### 3. Run Development or Release Build

```bash
# Run Android development build
npx expo run:android

# Build optimized Release APK (~37.5 MB with Hermes + R8)
cd android && ./gradlew assembleRelease
```

---

## 🧪 Quality Checks & Testing

Run architecture boundary verification, strict TypeScript type-checking, and the unit test suite with a single command:

```bash
npm run check
```

Individual commands:
```bash
npm run check:architecture   # Enforces feature boundaries & clean view/controller separation
npm run typecheck            # Runs tsc --noEmit across app and test suites
npm test                     # Runs unit & regression tests (SMS/Voice NLP, OCR, Sync, Wallets)
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Abdelrahman Sobhy**
- GitHub: [@abdoSobhy1](https://github.com/abdoSobhy1)
