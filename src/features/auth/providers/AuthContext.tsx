// Authentication Context Provider
import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../../app/store";
import { setUser, initializeAuth } from "../store/authSlice";
import { initializeSync, stopSync } from "../../../infrastructure/sync/store/syncSlice";
import { authService } from "../services/authService";
import { useSessionManager } from "../hooks/useSessionManager";
import { User } from "../../../shared/types";

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
    // Initialize auth state from stored session on app open
    dispatch(initializeAuth());

    // Set up auth state listener with stable authentication timing
    let authTimeout: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
      if (authTimeout) {
        clearTimeout(authTimeout);
        authTimeout = null;
      }

      dispatch(setUser(authUser));

      // Initialize smart sync (pending operations & timers) or stop sync based on auth state
      if (authUser && !authUser.isGuest && authUser.uid !== "guest") {
        authTimeout = setTimeout(async () => {
          try {
            const currentUser = await authService.getCurrentAuthenticatedUser();
            if (currentUser && !currentUser.isGuest && currentUser.uid !== "guest") {
              console.log("🔐 User authenticated, initializing smart sync...");
              dispatch(initializeSync());
            } else {
              console.log("⚠️ User no longer authenticated, skipping sync");
            }
          } catch (error) {
            console.error("❌ Failed to initialize smart sync:", error);
          } finally {
            authTimeout = null;
          }
        }, 500);
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
