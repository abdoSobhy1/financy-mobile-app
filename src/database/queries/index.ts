// Database query layer exports

export { TransactionRepository } from "./transactions";
export { BudgetRepository } from "./budgets";
export { CategoryRepository } from "./categories";
export { SettingsRepository } from "./settings";
export { DebtRepository } from "./debts";

// Create a centralized database service
import { TransactionRepository } from "./transactions";
import { BudgetRepository } from "./budgets";
import { CategoryRepository } from "./categories";
import { SettingsRepository } from "./settings";
import { DebtRepository } from "./debts";
import { DatabaseManager } from "../index";

export class DatabaseService {
  private static instance: DatabaseService;

  public readonly transactions: TransactionRepository;
  public readonly budgets: BudgetRepository;
  public readonly categories: CategoryRepository;
  public readonly settings: SettingsRepository;
  public readonly debts: DebtRepository;

  private constructor() {
    this.transactions = new TransactionRepository();
    this.budgets = new BudgetRepository();
    this.categories = new CategoryRepository();
    this.settings = new SettingsRepository();
    this.debts = new DebtRepository();
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
