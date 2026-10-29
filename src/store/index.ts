import { configureStore, combineReducers } from "@reduxjs/toolkit";
import transactionsReducer from "./slices/transactionsSlice";
import budgetsReducer from "./slices/budgetsSlice";
import categoriesReducer from "./slices/categoriesSlice";
import settingsReducer from "./slices/settingsSlice";
import debtsReducer from "./slices/debtsSlice";
import authReducer from "./slices/authSlice";
import syncReducer from "./slices/syncSlice";
import analysisReducer from "./slices/analysisSlice";

const appReducer = combineReducers({
  transactions: transactionsReducer,
  budgets: budgetsReducer,
  // bills slice removed
  categories: categoriesReducer,
  settings: settingsReducer,
  debts: debtsReducer,
  auth: authReducer,
  sync: syncReducer,
  analysis: analysisReducer,
});

// Any action that means "a different person is (about to be) using the app".
// When one of these fires, every slice except `auth` goes back to its initial
// state so one user's data can never be rendered for the next user.
const RESET_ON = new Set([
  "auth/signOut/fulfilled",
  "auth/signIn/pending",
  "auth/signUp/pending",
  "auth/signInAsGuest/pending",
]);

const rootReducer = (state: any, action: any) => {
  if (state) {
    const userChanged =
      action.type === "auth/setUser" &&
      (action.payload?.uid ?? null) !== (state.auth?.user?.uid ?? null);

    if (RESET_ON.has(action.type) || userChanged) {
      const fresh = appReducer(undefined, { type: "@@user-data-reset" } as any);
      state = { ...fresh, auth: state.auth };
    }
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer as unknown as typeof appReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
        warnAfter: 128,
      },
      immutableCheck: {
        warnAfter: 128,
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
