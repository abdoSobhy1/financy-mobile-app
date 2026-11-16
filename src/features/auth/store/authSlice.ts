// Redux slice for authentication state
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AuthState, User } from "../../../shared/types";
import { authService } from "../services/authService";
import { UserOnboardingService } from "../services/userOnboardingService";

// Initial state
const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks for authentication actions
export const signIn = createAsyncThunk("auth/signIn", async ({ email, password }: { email: string; password: string }) => {
  return await authService.signIn(email, password);
});

export const signUp = createAsyncThunk(
  "auth/signUp",
  async ({ email, password, displayName }: { email: string; password: string; displayName?: string }) => {
    const user = await authService.signUp(email, password, displayName);
    if (user?.uid) {
      await UserOnboardingService.seedNewUserDefaults(user.uid);
    }
    return user;
  }
);

export const signInAsGuest = createAsyncThunk("auth/signInAsGuest", async () => {
  return await authService.signInAsGuest();
});

export const signOut = createAsyncThunk("auth/signOut", async () => {
  await authService.signOut();
});

export const sendPasswordReset = createAsyncThunk("auth/sendPasswordReset", async (email: string) => {
  await authService.sendPasswordReset(email);
});

// Update user activity to extend session
export const updateActivity = createAsyncThunk("auth/updateActivity", async () => {
  await authService.updateActivity();
  return authService.getCurrentAuthenticatedUser();
});

// Check comprehensive authentication state
export const checkAuthState = createAsyncThunk("auth/checkAuthState", async () => {
  const isAuth = await authService.isAuthenticatedAsync();
  const user = await authService.getCurrentAuthenticatedUser();

  return user;
});

// Initialize auth state (check for stored session or Firebase auth)
export const initializeAuth = createAsyncThunk("auth/initialize", async () => {
  // First try to restore from stored session
  const storedUser = await authService.tryRestoreSession();
  if (storedUser) {
    return storedUser;
  }

  // Fallback to Firebase current user
  return authService.getCurrentUser();
});

// Auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Set user (for auth state listener)
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.error = null;
    },

    // Clear auth error
    clearError: (state) => {
      state.error = null;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Sign In
    builder.addCase(signIn.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signIn.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(signIn.rejected, (state, action) => {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
      state.error = action.error.message || "Sign in failed";
    });

    // Sign Up
    builder.addCase(signUp.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signUp.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(signUp.rejected, (state, action) => {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
      state.error = action.error.message || "Sign up failed";
    });

    // Sign In As Guest
    builder.addCase(signInAsGuest.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signInAsGuest.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(signInAsGuest.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || "Guest login failed";
    });

    // Sign Out
    builder.addCase(signOut.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signOut.fulfilled, (state) => {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    });
    builder.addCase(signOut.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || "Sign out failed";
    });

    // Password Reset
    builder.addCase(sendPasswordReset.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendPasswordReset.fulfilled, (state) => {
      state.loading = false;
      state.error = null;
    });
    builder.addCase(sendPasswordReset.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || "Password reset failed";
    });

    // Initialize Auth
    builder.addCase(initializeAuth.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(initializeAuth.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    });
    builder.addCase(initializeAuth.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || "Auth initialization failed";
    });

    // Update Activity (silent operation, no loading state)
    builder.addCase(updateActivity.fulfilled, (state, action) => {
      if (action.payload) {
        state.user = action.payload;
        state.isAuthenticated = true;
      }
    });
  },
});

export const { setUser, clearError, setLoading } = authSlice.actions;
export default authSlice.reducer;
