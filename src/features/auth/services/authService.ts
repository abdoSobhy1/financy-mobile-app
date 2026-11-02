// Firebase Authentication Service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail,
  AuthError,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirebaseAuth, getFirestoreInstance } from "../../../infrastructure/firebase/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { User } from "../../../shared/types";

import { DatabaseManager } from "../../../infrastructure/database";

interface SessionData {
  user: User;
  lastActivity: number;
  expiresAt: number;
}

export class AuthService {
  private static instance: AuthService;
  private auth: any = null;
  private static readonly SESSION_KEY = "financy_user_session";
  private static readonly SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  private static readonly LAST_USER_KEY = "financy_last_user_id";
  private static readonly GUEST_DATA_PENDING_KEY = "financy_guest_data_pending_migration_v1";
  // True while signOut() is running, so the auth listener can't resurrect the stored session
  private signingOut = false;
  // Per-user leftovers that used to survive sign-out
  private static readonly USER_SCOPED_KEYS = [
    "financy_user_profile_v1",
    "lastUsedCategoryId",
    "lastUsedBudgetId",
    "lastUsedAccountId",
    "@financy/last_used_category",
    "@financy/last_used_budget",
    "overspendingAlertDismissed",
    "@financy_sync_tracking",
    "@financy_ai_config",
  ];

  // Stop polling/queues that belong to the outgoing user
  private async stopBackgroundSync(): Promise<void> {
    try {
      const { syncService } = await import("../../../infrastructure/sync/syncService");
      syncService.resetState();
      const { offlineFirstSync } = await import("../../../infrastructure/sync/OfflineFirstSync");
      offlineFirstSync.cancelScheduledRetry();
    } catch (e) {
      console.warn("Failed to stop background sync:", e);
    }
  }

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Get Firebase Auth instance (lazy initialization)
  private getAuth() {
    if (!this.auth) {
      this.auth = getFirebaseAuth();
    }
    return this.auth;
  }

  // Convert Firebase user to app user format
  private mapFirebaseUser(firebaseUser: FirebaseUser | null): User | null {
    if (!firebaseUser) return null;

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? "Guest User" : null),
      emailVerified: firebaseUser.emailVerified,
      isGuest: firebaseUser.isAnonymous,
    };
  }

  // Session management methods with rolling 30-day expiration
  private saveSessionPromise: Promise<void> | null = null;
  private savingUserId: string | null = null;

  private async saveSession(user: User): Promise<void> {
    if (this.saveSessionPromise && this.savingUserId === user.uid) {
      return this.saveSessionPromise;
    }

    this.savingUserId = user.uid;
    this.saveSessionPromise = (async () => {
      try {
        const previousSession = await this.getStoredSession();
        const lastUserId = await AsyncStorage.getItem(AuthService.LAST_USER_KEY);
        const hasPendingGuestData =
          (await AsyncStorage.getItem(AuthService.GUEST_DATA_PENDING_KEY)) === "true" ||
          Boolean(previousSession?.user.isGuest || previousSession?.user.uid === "guest") ||
          lastUserId === "guest";
        const isGuestUser = Boolean(user.isGuest || user.uid === "guest");
        const switchingUsers = !lastUserId || lastUserId !== user.uid;
        const preserveGuestData = switchingUsers && hasPendingGuestData;

        const now = Date.now();
        const sessionData: SessionData = {
          user,
          lastActivity: now,
          expiresAt: now + AuthService.SESSION_DURATION, // Always reset to 30 days from now for rolling renewal
        };
        await AsyncStorage.setItem(
          AuthService.SESSION_KEY,
          JSON.stringify(sessionData),
        );
        console.log(
          `💾 Session saved for user ${user.uid}, expires at ${new Date(sessionData.expiresAt).toLocaleString()}`,
        );

        if (isGuestUser) {
          await AsyncStorage.setItem(AuthService.GUEST_DATA_PENDING_KEY, "true");
        } else if (hasPendingGuestData) {
          await AsyncStorage.removeItem(AuthService.GUEST_DATA_PENDING_KEY);
        }

        // Preserve local guest data when it is intentionally adopted by a registered account.
        // Other account switches still reset the local database to prevent data leakage.
        if (switchingUsers && !preserveGuestData) {
          console.log(
            `👤 Session user changed from ${lastUserId || "none"} to ${user.uid}. Resetting local database for clean session.`,
          );
          try {
            await this.stopBackgroundSync();
            const dbManager = DatabaseManager.getInstance();
            await dbManager.ensureInitialized();
            await dbManager.resetDatabase();
            if (user.isGuest || user.uid === "guest") {
              await AsyncStorage.removeItem("financy_categories_seeded_v1_guest");
              await AsyncStorage.removeItem("financy_wallets_seeded_v1_guest");
            }
            console.log("✅ Local database reset successfully");
          } catch (dbError) {
            console.error("❌ Failed to reset database on user switch:", dbError);
          }
        }

        // Update last user ID
        await AsyncStorage.setItem(AuthService.LAST_USER_KEY, user.uid);
      } catch (error) {
        console.error("Failed to save session:", error);
      } finally {
        this.saveSessionPromise = null;
        this.savingUserId = null;
      }
    })();

    return this.saveSessionPromise;
  }

  private async getStoredSession(): Promise<SessionData | null> {
    try {
      const sessionJson = await AsyncStorage.getItem(AuthService.SESSION_KEY);
      if (!sessionJson) return null;

      const sessionData: SessionData = JSON.parse(sessionJson);
      const now = Date.now();

      // Check if session has expired
      if (now > sessionData.expiresAt) {
        await this.clearStoredSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error("Failed to get stored session:", error);
      return null;
    }
  }

  private async updateSessionActivity(): Promise<void> {
    try {
      const sessionData = await this.getStoredSession();
      if (sessionData) {
        const now = Date.now();
        sessionData.lastActivity = now;
        sessionData.expiresAt = now + AuthService.SESSION_DURATION; // Reset expiration for rolling renewal
        await AsyncStorage.setItem(
          AuthService.SESSION_KEY,
          JSON.stringify(sessionData),
        );
        console.log(
          `🔄 Session activity updated for user ${sessionData.user.uid}, renewed until ${new Date(sessionData.expiresAt).toLocaleString()}`,
        );
      }
    } catch (error) {
      console.error("Failed to update session activity:", error);
    }
  }

  private async clearStoredSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AuthService.SESSION_KEY);
    } catch (error) {
      console.error("Failed to clear stored session:", error);
    }
  }

  // Sign up with email and password
  public async signUp(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<User> {
    try {
      const auth = this.getAuth();
      const currentUser = auth.currentUser;
      const linkingGuest = Boolean(currentUser?.isAnonymous);
      const userCredential = currentUser?.isAnonymous
        ? await linkWithCredential(
            currentUser,
            EmailAuthProvider.credential(email, password),
          )
        : await createUserWithEmailAndPassword(auth, email, password);

      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      const user = this.mapFirebaseUser(userCredential.user);
      if (!user) {
        throw new Error("Failed to create user");
      }

      // Create user document in Firestore
      try {
        const db = getFirestoreInstance();
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: user.displayName || displayName || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: "user", // Default role
          settings: {
            currency: "USD",
            theme: "dark",
            language: "en",
          },
        });
        console.log("✅ Created user document in Firestore");
      } catch (firestoreError) {
        console.error("❌ Failed to create user document:", firestoreError);
        // We don't throw here to ensure the auth account is still returned,
        // but this should be handled (maybe by a cloud function or subsequent sync)
      }

      // Save session to AsyncStorage
      await this.saveSession(user);

      // Defaults belong to first-time registration, never to login or restore.
      // Linked guest accounts already have their own local categories and wallets.
      if (!linkingGuest) {
        const database = DatabaseManager.getInstance().getDatabase();
        const categories = await database.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM categories",
        );
        const wallets = await database.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM wallets",
        );
        if (!categories?.count) {
          const { CategoryRepository } = await import("../../categories/repositories/categoriesRepository");
          await new CategoryRepository().seedDefaultArabicCategories();
        }
        if (!wallets?.count) {
          const { WalletRepository } = await import("../../wallets/repositories/walletsRepository");
          await new WalletRepository().seedDefaultWallets();
        }
      }

      console.log("User created successfully:", user.uid);
      return user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  // Sign in with email and password
  public async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.getAuth(),
        email,
        password,
      );
      const user = this.mapFirebaseUser(userCredential.user);

      if (!user) {
        throw new Error("Failed to sign in");
      }

      // Save session to AsyncStorage (implements rolling 30-day renewal)
      await this.saveSession(user);

      console.log(
        `✅ User signed in successfully: ${user.uid} - Session renewed for 30 days`,
      );
      return user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  // Sign in as Guest (local SQLite only; anonymous Firebase auth enables hosted AI)
  public async signInAsGuest(): Promise<User> {
    const auth = this.getAuth();
    let guestUser: User;
    try {
      let firebaseUser = auth.currentUser;
      if (firebaseUser && !firebaseUser.isAnonymous) {
        await signOut(auth);
        firebaseUser = null;
      }

      if (!firebaseUser) {
        firebaseUser = (await signInAnonymously(auth)).user;
      }

      guestUser = this.mapFirebaseUser(firebaseUser)!;
    } catch (error) {
      console.warn(
        "Anonymous Firebase auth is unavailable; continuing in local-only guest mode:",
        error,
      );
      guestUser = {
        uid: "guest",
        email: null,
        displayName: "Guest User",
        emailVerified: false,
        isGuest: true,
      };
    }

    await AsyncStorage.removeItem("financy_user_profile_v1");
    await this.saveSession(guestUser);
    console.log("👤 Signed in as Guest (local-only data, hosted AI available when anonymous auth is enabled)");
    return guestUser;
  }

  /**
   * Creates a Firebase anonymous identity for existing local guest sessions so
   * hosted services can authenticate requests without enabling cloud sync.
   */
  public async ensureGuestFirebaseAuth(): Promise<FirebaseUser | null> {
    const auth = this.getAuth();
    if (auth.currentUser) {
      return auth.currentUser.isAnonymous ? auth.currentUser : null;
    }

    const storedUser = await this.getStoredUser();
    if (!storedUser || (!storedUser.isGuest && storedUser.uid !== "guest")) {
      return null;
    }

    try {
      const credential = await signInAnonymously(auth);
      const guestUser = this.mapFirebaseUser(credential.user);
      if (guestUser) await this.saveSession(guestUser);
      return credential.user;
    } catch (error) {
      console.warn("Could not authenticate guest for hosted AI:", error);
      return null;
    }
  }

  // Update user display name in Firebase Auth, Firestore, and local session
  public async updateUserProfile(displayName: string): Promise<User> {
    const cleanName = displayName.trim();
    const firebaseUser: FirebaseUser | null = this.getAuth().currentUser;

    if (firebaseUser) {
      await updateProfile(firebaseUser, { displayName: cleanName });

      try {
        const db = getFirestoreInstance();
        await setDoc(
          doc(db, "users", firebaseUser.uid),
          {
            displayName: cleanName,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (firestoreErr) {
        console.warn("Failed to update displayName in Firestore:", firestoreErr);
      }

      const updatedUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: cleanName,
        emailVerified: firebaseUser.emailVerified,
      };
      await this.saveSession(updatedUser);
      return updatedUser;
    }

    // Fallback for stored session / Guest user
    const storedUser = await this.getStoredUser();
    if (storedUser) {
      const updatedUser: User = {
        ...storedUser,
        displayName: cleanName || (storedUser.isGuest ? "Guest User" : "Financy User"),
      };
      await this.saveSession(updatedUser);
      return updatedUser;
    }

    throw new Error("No active user session to update");
  }

  // Check if current session is Guest Mode
  public async isGuestAsync(): Promise<boolean> {
    const firebaseUser = this.getAuth().currentUser;
    if (firebaseUser) {
      return firebaseUser.isAnonymous;
    }
    const storedUser = await this.getStoredUser();
    return Boolean(storedUser?.isGuest || storedUser?.uid === "guest");
  }

  // Check if Firebase Cloud Sync is allowed (requires real authenticated non-guest account)
  public async isCloudSyncAllowedAsync(): Promise<boolean> {
    const firebaseUser = this.getAuth().currentUser;
    if (firebaseUser) {
      return !firebaseUser.isAnonymous;
    }
    const storedUser = await this.getStoredUser();
    if (!storedUser || storedUser.isGuest || storedUser.uid === "guest") {
      return false;
    }
    return true;
  }

  // Sign out
  public async signOut(): Promise<void> {
    this.signingOut = true;
    try {
      const firebaseUser = this.getAuth().currentUser;
      const storedUser = await this.getStoredUser();
      const isGuestSession = Boolean(
        firebaseUser?.isAnonymous || storedUser?.isGuest || storedUser?.uid === "guest",
      );

      // 1. Stop the outgoing user's background work before anything else
      await this.stopBackgroundSync();

      // 2. Drop the persisted session FIRST. Firebase's listener fires as soon as signOut()
      //    runs, and it falls back to the stored session - which used to re-emit the old user.
      await this.clearStoredSession();
      if (isGuestSession) {
        await AsyncStorage.setItem(AuthService.LAST_USER_KEY, "guest");
        await AsyncStorage.setItem(AuthService.GUEST_DATA_PENDING_KEY, "true");
      } else {
        await AsyncStorage.removeItem(AuthService.LAST_USER_KEY);
      }

      // 3. Sign out of Firebase
      if (this.getAuth().currentUser) {
        await signOut(this.getAuth());
      }

      // 4. Keep guest data on-device so it can be adopted by a later account.
      if (!isGuestSession) {
        try {
          const dbManager = DatabaseManager.getInstance();
          await dbManager.ensureInitialized();
          await dbManager.resetDatabase();
        } catch (dbResetErr) {
          console.warn("Failed to reset local database on sign out:", dbResetErr);
        }
      }

      // 5. Clear everything else that was scoped to this user
      if (!isGuestSession) {
        try {
          await AsyncStorage.multiRemove(AuthService.USER_SCOPED_KEYS);
          const { clearUserPreferences } =
            await import("../../settings/utils/userPreferences");
          await clearUserPreferences();
          const { walletService } = await import("../../wallets/services/walletService");
          walletService.clearCache();
        } catch (prefError) {
          console.warn("Failed to clear user-scoped data on sign out:", prefError);
        }
      }

      console.log("User signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
      throw new Error("Failed to sign out");
    } finally {
      this.signingOut = false;
    }
  }

  // Send password reset email
  public async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.getAuth(), email);
      console.log("Password reset email sent");
    } catch (error) {
      console.error("Password reset error:", error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  // Get current user
  public getCurrentUser(): User | null {
    return this.mapFirebaseUser(this.getAuth().currentUser);
  }

  // Listen to auth state changes
  public onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.getAuth(), async (firebaseUser) => {
      const user = this.mapFirebaseUser(firebaseUser);
      if (user) {
        // Ensure session save and any required database reset complete BEFORE notifying UI listeners
        await this.saveSession(user);
        callback(user);
        return;
      }

      // Signing out: report "no user" immediately, never the stored one
      if (this.signingOut) {
        callback(null);
        return;
      }

      // Preserve active stored session (authenticated user or Guest Mode) when Firebase has not yet hydrated or has no user
      const storedUser = await this.getStoredUser();
      if (storedUser) {
        callback(storedUser);
        return;
      }

      callback(null);
    });
  }

  // Check if user is authenticated (Firebase or stored session)
  public isAuthenticated(): boolean {
    // First check Firebase auth
    if (this.getAuth().currentUser !== null) {
      return true;
    }
    // If no Firebase user, this method can't check async storage synchronously
    // Use isAuthenticatedAsync for full check
    return false;
  }

  // Async version that checks both Firebase and stored session
  public async isAuthenticatedAsync(): Promise<boolean> {
    // Check Firebase auth first
    if (this.getAuth().currentUser !== null) {
      return true;
    }

    // Check stored session
    const hasSession = await this.hasValidSession();
    return hasSession;
  }

  // Get user ID (throws if not authenticated)
  public requireUserId(): string {
    const user = this.getAuth().currentUser;
    if (user) {
      if (user.isAnonymous) {
        throw new Error("Cloud sync is disabled in Guest Mode");
      }
      return user.uid;
    }

    // Fallback: throw error with guidance to use async version
    throw new Error(
      "User not authenticated via Firebase. Use requireUserIdAsync() to check stored session.",
    );
  }

  // Async version that checks both Firebase and stored session
  public async requireUserIdAsync(): Promise<string> {
    // Check Firebase auth first
    const firebaseUser = this.getAuth().currentUser;
    if (firebaseUser) {
      if (firebaseUser.isAnonymous) {
        throw new Error("Cloud sync is disabled in Guest Mode");
      }
      return firebaseUser.uid;
    }

    // Check stored session
    const storedUser = await this.getStoredUser();
    if (storedUser) {
      if (storedUser.isGuest || storedUser.uid === "guest") {
        throw new Error("Cloud sync is disabled in Guest Mode");
      }
      return storedUser.uid;
    }

    throw new Error("User not authenticated");
  }

  // Check for stored session and restore if valid
  public async tryRestoreSession(): Promise<User | null> {
    try {
      const sessionData = await this.getStoredSession();
      if (sessionData) {
        // Update activity timestamp to extend session
        await this.updateSessionActivity();
        console.log("Session restored for user:", sessionData.user.uid);

        // Try to restore Firebase auth state if possible
        // This helps with sync operations that expect Firebase auth
        await this.ensureFirebaseAuthState(sessionData.user);

        return sessionData.user;
      }
      return null;
    } catch (error) {
      console.error("Failed to restore session:", error);
      return null;
    }
  }

  // Ensure Firebase auth state matches stored session (if possible)
  private async ensureFirebaseAuthState(storedUser: User): Promise<void> {
    try {
      // Check if Firebase user matches stored user
      const firebaseUser = this.getAuth().currentUser;
      if (!firebaseUser || firebaseUser.uid !== storedUser.uid) {
        console.log(
          "Firebase auth state differs from stored session. This is normal on app startup.",
        );
        // We don't force re-authentication here, just log the difference
        // The sync service will work with stored session until Firebase auth catches up
      }
    } catch (error) {
      console.warn("Could not verify Firebase auth state:", error);
    }
  }

  // Update session activity (call this on app usage)
  public async updateActivity(): Promise<void> {
    await this.updateSessionActivity();
  }

  // Check if there's a valid stored session
  public async hasValidSession(): Promise<boolean> {
    const sessionData = await this.getStoredSession();
    return sessionData !== null;
  }

  // Get stored user without Firebase auth check
  public async getStoredUser(): Promise<User | null> {
    const sessionData = await this.getStoredSession();
    return sessionData?.user || null;
  }

  // Get current authenticated user (checks both Firebase and stored session)
  public async getCurrentAuthenticatedUser(): Promise<User | null> {
    // First check Firebase auth
    const firebaseUser = this.getCurrentUser();
    if (firebaseUser) {
      return firebaseUser;
    }

    // Fallback to stored session
    const storedUser = await this.getStoredUser();
    return storedUser;
  }

  // Handle Firebase Auth errors
  private handleAuthError(error: AuthError): Error {
    let message = "An authentication error occurred";

    switch (error.code) {
      case "auth/user-not-found":
        message = "No account found with this email address";
        break;
      case "auth/wrong-password":
        message = "Incorrect password";
        break;
      case "auth/email-already-in-use":
        message = "An account already exists with this email address";
        break;
      case "auth/weak-password":
        message = "Password is too weak";
        break;
      case "auth/invalid-email":
        message = "Invalid email address";
        break;
      case "auth/too-many-requests":
        message = "Too many failed attempts. Please try again later";
        break;
      case "auth/network-request-failed":
        message = "Network error. Please check your connection";
        break;
      default:
        message = error.message || "Authentication failed";
    }

    return new Error(message);
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
