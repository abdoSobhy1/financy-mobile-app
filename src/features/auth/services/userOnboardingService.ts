import { DatabaseManager } from "../../../infrastructure/database";
import { CategoryRepository } from "../../categories/repositories/categoriesRepository";
import { WalletRepository } from "../../wallets/repositories/walletsRepository";

export class UserOnboardingService {
  /**
   * Seeds default categories and wallets for a newly registered user
   * if the local database does not already contain active rows.
   *
   * @param userId The ID of the user for whom defaults are being seeded.
   */
  public static async seedNewUserDefaults(userId: string): Promise<void> {
    try {
      const dbManager = DatabaseManager.getInstance();
      await dbManager.ensureInitialized();
      const database = dbManager.getDatabase();

      const categories = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM categories WHERE deleted = 0",
      );
      const wallets = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM wallets WHERE deleted = 0",
      );

      if (!categories?.count) {
        const categoryRepo = new CategoryRepository();
        await categoryRepo.seedDefaultArabicCategories(userId);
      }

      if (!wallets?.count) {
        const walletRepo = new WalletRepository();
        await walletRepo.seedDefaultWallets(userId);
      }
    } catch (error) {
      console.warn("Failed to seed initial user defaults during onboarding:", error);
    }
  }
}
