import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { RecurringFrequency, RecurringTransaction, TransactionType } from "../types";
import { addTransaction } from "../store/slices/transactionsSlice";

const RECURRING_STORAGE_KEY = "financy_recurring_v1";

function advanceDate(dateStr: string, frequency: RecurringFrequency): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + 1);
    return fallback.toISOString();
  }
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString();
}

export const recurringService = {
  async getRecurringList(): Promise<RecurringTransaction[]> {
    try {
      const raw = await AsyncStorage.getItem(RECURRING_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to load recurring transactions:", error);
      return [];
    }
  },

  async saveRecurringList(list: RecurringTransaction[]): Promise<void> {
    await AsyncStorage.setItem(RECURRING_STORAGE_KEY, JSON.stringify(list));
  },

  async addRecurring(data: {
    title: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    budgetId?: string;
    accountId?: string;
    frequency: RecurringFrequency;
    nextDueDate?: string;
    autoLog?: boolean;
  }): Promise<RecurringTransaction[]> {
    const list = await this.getRecurringList();
    const newItem: RecurringTransaction = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: data.title.trim(),
      amount: Number(data.amount) || 0,
      type: data.type,
      categoryId: data.categoryId,
      budgetId: data.budgetId,
      accountId: data.accountId || "default_cash",
      frequency: data.frequency,
      nextDueDate: data.nextDueDate || new Date().toISOString(),
      autoLog: data.autoLog ?? true,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    await this.saveRecurringList(updated);
    return updated;
  },

  async toggleRecurring(id: string): Promise<RecurringTransaction[]> {
    const list = await this.getRecurringList();
    const updated = list.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item,
    );
    await this.saveRecurringList(updated);
    return updated;
  },

  async deleteRecurring(id: string): Promise<RecurringTransaction[]> {
    const list = await this.getRecurringList();
    const updated = list.filter((item) => item.id !== id);
    await this.saveRecurringList(updated);
    return updated;
  },

  async processDueRecurringTransactions(dispatch: any): Promise<number> {
    try {
      const list = await this.getRecurringList();
      if (list.length === 0) return 0;

      const now = new Date();
      let processedCount = 0;
      let changed = false;

      const updatedList = [...list];

      for (let i = 0; i < updatedList.length; i++) {
        const item = { ...updatedList[i] };
        if (!item.active || !item.autoLog) continue;

        let dueDate = new Date(item.nextDueDate);
        let safetyCounter = 0;

        while (!isNaN(dueDate.getTime()) && dueDate <= now && safetyCounter < 12) {
          safetyCounter++;
          changed = true;
          processedCount++;

          await dispatch(
            addTransaction({
              amount: item.amount.toString(),
              type: item.type,
              categoryId: item.categoryId,
              budgetId: item.budgetId,
              accountId: item.accountId || "default_cash",
              recurringId: item.id,
              description: `${item.title} (Recurring)`,
              date: dueDate,
              note: `Auto-logged ${item.frequency} recurring ${item.type}`,
            }),
          );

          item.nextDueDate = advanceDate(dueDate.toISOString(), item.frequency);
          dueDate = new Date(item.nextDueDate);
        }

        updatedList[i] = item;
      }

      if (changed) {
        await this.saveRecurringList(updatedList);
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "🔄 Recurring Transactions Logged",
              body: `${processedCount} recurring transaction${processedCount > 1 ? "s were" : " was"} automatically added to your ledger.`,
              data: { type: "recurring_auto_log" },
            },
            trigger: null,
          });
        } catch {
          // non-critical if notification permissions are disabled
        }
      }

      return processedCount;
    } catch (error) {
      console.warn("Failed to process recurring transactions:", error);
      return 0;
    }
  },
};
