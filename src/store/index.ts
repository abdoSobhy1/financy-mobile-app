import { configureStore } from "@reduxjs/toolkit";
import transactionsReducer from "./slices/transactionsSlice";
import budgetsReducer from "./slices/budgetsSlice";
import billsReducer from "./slices/billsSlice";
import categoriesReducer from "./slices/categoriesSlice";
import settingsReducer from "./slices/settingsSlice";
import debtsReducer from "./slices/debtsSlice";
import authReducer from "./slices/authSlice";
import syncReducer from "./slices/syncSlice";
import analysisReducer from "./slices/analysisSlice";

export const store = configureStore({
  reducer: {
    transactions: transactionsReducer,
    budgets: budgetsReducer,
    bills: billsReducer,
    categories: categoriesReducer,
    settings: settingsReducer,
    debts: debtsReducer,
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
