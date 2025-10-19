# Financy - Personal Finance Management App

<div align="center">
  <h3>A comprehensive React Native app for managing personal finances</h3>
  <p>Track expenses, manage budgets, handle bills and debts with offline-first capabilities</p>
</div>

## 🌟 Features

### 💰 **Financial Management**

- **Transaction Tracking**: Record income and expenses with categories and descriptions
- **Budget Management**: Set and monitor monthly budgets with real-time spending tracking
- **Bill Management**: Track recurring bills and due dates with payment reminders
- **Debt Management**: Monitor debts with payment tracking and balance calculations
- **Category System**: Organize transactions with customizable categories and colors

### 📊 **Analytics & Insights**

- **Spending Analytics**: Visual charts showing spending patterns and trends
- **Budget Progress**: Real-time budget utilization with remaining amounts
- **Bill Status**: Upcoming bills and payment tracking
- **Debt Progress**: Track debt reduction over time
- **Custom Date Ranges**: Filter data by custom periods or billing cycles

### ☁️ **Sync & Backup**

- **Offline-First**: Works completely offline with local SQLite database
- **Cloud Sync**: Optional Firebase synchronization across devices
- **Data Export**: Export data to Excel, CSV, or JSON formats
- **Database Backup**: Full database backup and restore capabilities
- **Conflict Resolution**: Smart handling of data conflicts during sync

### 🎨 **User Experience**

- **Modern UI**: Clean, intuitive interface with smooth animations
- **Dark/Light Theme**: Adaptive theming based on system preferences
- **Custom Billing Periods**: Set custom billing cycle start dates
- **Search & Filter**: Advanced filtering and search across all data
- **Quick Actions**: Swipe gestures and quick entry options

## 🏗️ **Technical Architecture**

### **Frontend**

- **React Native**: Cross-platform mobile development
- **Expo**: Streamlined development and deployment
- **TypeScript**: Type-safe development with enhanced IDE support
- **Redux Toolkit**: State management with efficient data flow
- **React Navigation**: Smooth navigation between screens

### **Database**

- **SQLite**: Local database for offline-first functionality
- **Schema Management**: Automated migrations and version control
- **Query Optimization**: Efficient database operations and indexing
- **Data Integrity**: Foreign key constraints and validation

### **Cloud Integration**

- **Firebase Firestore**: Cloud database for synchronization
- **Firebase Auth**: Secure user authentication
- **Offline Sync**: Intelligent sync with conflict resolution
- **Real-time Updates**: Live data synchronization when online

### **Data Management**

- **Offline-First Architecture**: App works without internet connection
- **Smart Sync**: Only sync changed data to optimize performance
- **Data Export**: Multiple export formats for data portability
- **Backup System**: Complete data backup and restore functionality

## 📱 **Installation**

### **Prerequisites**

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### **Setup**

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/financy.git
   cd financy
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Firebase (Optional)**

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database and Authentication
   - Download the configuration file:
     - For iOS: `GoogleService-Info.plist`
     - For Android: `google-services.json`
   - Place the files in the appropriate directories
   - Update the Firebase configuration in the app

4. **Start the development server**

   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 🚀 **Usage**

### **Initial Setup**

1. **Launch the app** and complete the onboarding process
2. **Set up categories** for organizing transactions
3. **Configure billing period** start date (optional)
4. **Enable cloud sync** for data backup (optional)

### **Daily Usage**

1. **Add transactions** as you make purchases or receive income
2. **Monitor budgets** to stay within spending limits
3. **Track bills** and mark them as paid when due
4. **Record debt payments** to monitor debt reduction

### **Advanced Features**

1. **Export data** for external analysis or backup
2. **Sync across devices** using Firebase integration
3. **Analyze spending** with built-in charts and reports
4. **Customize categories** and billing periods

## 📊 **Project Structure**

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (buttons, inputs, etc.)
│   ├── charts/          # Chart components for analytics
│   └── forms/           # Form components for data entry
├── screens/             # Screen components
├── navigation/          # Navigation configuration
├── store/               # Redux store and slices
├── services/            # API and sync services
├── database/            # SQLite database configuration
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── constants/           # App constants and configuration
```

## 🔧 **Configuration**

### **Environment Variables**

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

### **Database Configuration**

The app uses SQLite for local storage with automatic schema migrations. Database configuration is in `src/database/index.ts`.

### **Sync Configuration**

Cloud sync settings can be configured in `src/services/OfflineFirstSync.ts`.

## 🧪 **Testing**

### **Running Tests**

```bash
npm test
# or
yarn test
```

### **Debug Mode**

To access debug features:

1. Go to Settings → About
2. Tap on "App Version" 6 times consecutively
3. Debug section will appear with advanced options

## 📦 **Building**

### **Development Build**

```bash
npx expo build:android
npx expo build:ios
```

### **Production Build**

```bash
npx expo build:android --type app-bundle
npx expo build:ios --type archive
```

## 🤝 **Contributing**

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### **Development Guidelines**

- Follow TypeScript best practices
- Write clear, descriptive commit messages
- Add tests for new functionality
- Update documentation as needed
- Ensure code passes linting checks

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 **Author**

**Abdelrahman Sobhy**

- Email: [your-email@example.com]
- GitHub: [your-github-profile]

## 🙏 **Acknowledgments**

- **React Native Community**: For the amazing framework and ecosystem
- **Expo Team**: For simplifying React Native development
- **Firebase**: For providing robust backend services
- **Open Source Contributors**: For the libraries and tools that make this project possible

## 📞 **Support**

If you encounter any issues or have questions:

1. **Check the documentation** in this README
2. **Search existing issues** on GitHub
3. **Create a new issue** with detailed information
4. **Contact support** via email

## 🔮 **Roadmap**

- [ ] **Enhanced Analytics**: More detailed spending insights and trends
- [ ] **Export Improvements**: Additional export formats and scheduling
- [ ] **UI Enhancements**: More themes and customization options
- [ ] **Integration Features**: Connect with bank APIs and financial services
- [ ] **Web Version**: Progressive web app for desktop access

---

<div align="center">
  <p>Made with ❤️ by Abdelrahman Sobhy</p>
  <p>© 2025 All rights reserved</p>
</div>
