// Authentication Context Provider
import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { setUser, initializeAuth } from "../store/slices/authSlice";
import { syncWithFirebase, stopSync } from "../store/slices/syncSlice";
import { authService } from "../services/authService";
import { useSessionManager } from "../hooks/useSessionManager";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Initialize session management
  useSessionManager();

  useEffect(() => {
    // Initialize auth state
    dispatch(initializeAuth());

    // Set up auth state listener with stable authentication timing
    let authTimeout: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      // Clear any pending auth timeout
      if (authTimeout) {
        clearTimeout(authTimeout);
        authTimeout = null;
      }

      dispatch(setUser(user));

      // Initialize or stop sync based on auth state (skip sync for Guest Mode)
      if (user && !user.isGuest && user.uid !== "guest") {
        // Delay sync initialization slightly to ensure auth state and database are stable
        authTimeout = setTimeout(async () => {
          try {
            // Double-check user is still authenticated before syncing
            const currentUser = authService.getCurrentUser();
            if (currentUser && !currentUser.isGuest) {
              console.log("🔐 User authenticated, automatically syncing with Firebase database...");
              await dispatch(syncWithFirebase({ showToast: true })).unwrap();
              console.log("✅ Auto-sync with Firebase database completed successfully!");
            } else {
              console.log("⚠️ User no longer authenticated, skipping sync");
            }
          } catch (error) {
            console.error("❌ Failed to auto-sync with Firebase database:", error);
          } finally {
            authTimeout = null;
          }
        }, 500); // 500ms delay to ensure auth state is stable
      } else {
        dispatch(stopSync());
      }
    });

    return () => {
      unsubscribe();
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
    };
  }, [dispatch]);

  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
