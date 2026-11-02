// Database query layer exports

export { TransactionRepository } from "../../features/transactions/repositories/transactionsRepository";
export { BudgetRepository } from "../../features/budgets/repositories/budgetsRepository";
export { CategoryRepository } from "../../features/categories/repositories/categoriesRepository";
export { SettingsRepository } from "../../features/settings/repositories/settingsRepository";
export { DebtRepository } from "../../features/debts/repositories/debtsRepository";
export { WalletRepository } from "../../features/wallets/repositories/walletsRepository";

// Create a centralized database service
import { TransactionRepository } from "../../features/transactions/repositories/transactionsRepository";
import { BudgetRepository } from "../../features/budgets/repositories/budgetsRepository";
import { CategoryRepository } from "../../features/categories/repositories/categoriesRepository";
import { SettingsRepository } from "../../features/settings/repositories/settingsRepository";
import { DebtRepository } from "../../features/debts/repositories/debtsRepository";
import { WalletRepository } from "../../features/wallets/repositories/walletsRepository";
import { DatabaseManager } from "./index";

export class DatabaseService {
  private static instance: DatabaseService;

  public readonly transactions: TransactionRepository;
  public readonly budgets: BudgetRepository;
  public readonly categories: CategoryRepository;
  public readonly settings: SettingsRepository;
  public readonly debts: DebtRepository;
  public readonly wallets: WalletRepository;

  private constructor() {
    this.transactions = new TransactionRepository();
    this.budgets = new BudgetRepository();
    this.categories = new CategoryRepository();
    this.settings = new SettingsRepository();
    this.debts = new DebtRepository();
    this.wallets = new WalletRepository();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async clearAllData(): Promise<void> {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.clearAllData();
  }
}

// Export a singleton instance for easy access throughout the app
export const db = DatabaseService.getInstance();
