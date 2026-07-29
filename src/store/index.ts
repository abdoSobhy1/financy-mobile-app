import { configureStore } from "@reduxjs/toolkit";
import transactionsReducer from "./slices/transactionsSlice";
import budgetsReducer from "./slices/budgetsSlice";
import categoriesReducer from "./slices/categoriesSlice";
import settingsReducer from "./slices/settingsSlice";
import debtsReducer from "./slices/debtsSlice";
import walletsReducer from "./slices/walletsSlice";
import authReducer from "./slices/authSlice";
import syncReducer from "./slices/syncSlice";
import analysisReducer from "./slices/analysisSlice";

export const store = configureStore({
  reducer: {
    transactions: transactionsReducer,
    budgets: budgetsReducer,
    // bills slice removed
    categories: categoriesReducer,
    settings: settingsReducer,
    debts: debtsReducer,
    wallets: walletsReducer,
    auth: authReducer,
    sync: syncReducer,
    analysis: analysisReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
