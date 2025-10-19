// Firebase Authentication Service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail,
  AuthError,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirebaseAuth } from "./firebase";
import { User } from "../types";

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
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
    };
  }

  // Session management methods with rolling 30-day expiration
  private async saveSession(user: User): Promise<void> {
    try {
      const now = Date.now();
      const sessionData: SessionData = {
        user,
        lastActivity: now,
        expiresAt: now + AuthService.SESSION_DURATION, // Always reset to 30 days from now for rolling renewal
      };
      await AsyncStorage.setItem(AuthService.SESSION_KEY, JSON.stringify(sessionData));
      console.log(`💾 Session saved for user ${user.uid}, expires at ${new Date(sessionData.expiresAt).toLocaleString()}`);
    } catch (error) {
      console.error("Failed to save session:", error);
    }
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
        await AsyncStorage.setItem(AuthService.SESSION_KEY, JSON.stringify(sessionData));
        console.log(
          `🔄 Session activity updated for user ${sessionData.user.uid}, renewed until ${new Date(sessionData.expiresAt).toLocaleString()}`
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
  public async signUp(email: string, password: string, displayName?: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.getAuth(), email, password);

      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      const user = this.mapFirebaseUser(userCredential.user);
      if (!user) {
        throw new Error("Failed to create user");
      }

      // Save session to AsyncStorage
      await this.saveSession(user);

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
      const userCredential = await signInWithEmailAndPassword(this.getAuth(), email, password);
      const user = this.mapFirebaseUser(userCredential.user);

      if (!user) {
        throw new Error("Failed to sign in");
      }

      // Save session to AsyncStorage (implements rolling 30-day renewal)
      await this.saveSession(user);

      console.log(`✅ User signed in successfully: ${user.uid} - Session renewed for 30 days`);
      return user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  // Sign out
  public async signOut(): Promise<void> {
    try {
      await signOut(this.getAuth());

      // Clear stored session
      await this.clearStoredSession();

      // Clear user preferences
      try {
        const { clearUserPreferences } = await import("../utils/userPreferences");
        await clearUserPreferences();
      } catch (prefError) {
        console.warn("Failed to clear user preferences on sign out:", prefError);
      }

      console.log("User signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
      throw new Error("Failed to sign out");
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
    return onAuthStateChanged(this.getAuth(), (firebaseUser) => {
      const user = this.mapFirebaseUser(firebaseUser);
      callback(user);
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
      return user.uid;
    }

    // Fallback: throw error with guidance to use async version
    throw new Error("User not authenticated via Firebase. Use requireUserIdAsync() to check stored session.");
  }

  // Async version that checks both Firebase and stored session
  public async requireUserIdAsync(): Promise<string> {
    // Check Firebase auth first
    const firebaseUser = this.getAuth().currentUser;
    if (firebaseUser) {
      return firebaseUser.uid;
    }

    // Check stored session
    const storedUser = await this.getStoredUser();
    if (storedUser) {
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
        console.log("Firebase auth state differs from stored session. This is normal on app startup.");
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
