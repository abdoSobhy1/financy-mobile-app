// Firebase configuration and initialization
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, initializeAuth } from "firebase/auth";
import { getFirestore as initFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyBHTaSDwRxVbij2xi9K-sX5wgayv0wspUk",
  authDomain: "strapicms1.firebaseapp.com",
  projectId: "strapicms1",
  storageBucket: "strapicms1.firebasestorage.app",
  messagingSenderId: "364242382069",
  appId: "1:364242382069:web:672e45727136c4368869bc",
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export const initializeFirebase = () => {
  try {
    app = initializeApp(firebaseConfig);

    // Initialize Auth with AsyncStorage persistence for React Native
    try {
      // Try to initialize with persistence first
      auth = initializeAuth(app, {
        // Firebase v9+ automatically uses AsyncStorage when available
      });
    } catch (error) {
      // If initializeAuth fails (e.g., already initialized), use getAuth
      auth = getAuth(app);
    }

    db = initFirestore(app);

    // Connect to Firestore emulator in development (optional)
    if (__DEV__ && Platform.OS !== "web") {
      // Uncomment to use Firestore emulator during development
      // connectFirestoreEmulator(db, 'localhost', 8080);
    }

    console.log("Firebase initialized successfully");
    return { app, auth, db };
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
};

// Export Firebase instances
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error("Firebase Auth not initialized. Call initializeFirebase() first.");
  }
  return auth;
};

export const getFirestoreInstance = (): Firestore => {
  if (!db) {
    throw new Error("Firestore not initialized. Call initializeFirebase() first.");
  }
  return db;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    throw new Error("Firebase App not initialized. Call initializeFirebase() first.");
  }
  return app;
};

// Helper to check if Firebase is initialized
export const isFirebaseInitialized = (): boolean => {
  return !!(app && auth && db);
};

// Configuration constants
export const FIREBASE_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
  BATCH_SIZE: 500, // Max documents per batch
  OFFLINE_TIMEOUT: 10000, // ms
} as const;
