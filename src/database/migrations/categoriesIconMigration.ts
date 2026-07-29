import * as SQLite from "expo-sqlite";

export const addCategoryIconColumn = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    await db.execAsync(`
      ALTER TABLE categories ADD COLUMN icon TEXT;
    `);
    console.log("Added icon column to categories table successfully");
  } catch (error: any) {
    if (!error.message?.includes("duplicate column")) {
      console.warn("Error adding icon column to categories table:", error.message);
    }
  }
};
