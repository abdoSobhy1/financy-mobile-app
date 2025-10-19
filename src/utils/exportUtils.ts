import * as XLSX from "xlsx";
import { writeAsStringAsync, documentDirectory, EncodingType } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { Transaction, Category } from "../types";
import { formatCurrency, formatDate } from "./index";

export interface ExportData {
  exportDate: string;
  period: string;
  transactions: Transaction[];
  categories: Record<string, Category>;
  summary: {
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
  };
}

export const exportToExcel = async (data: ExportData): Promise<void> => {
  try {
    console.log("Starting Excel export with data:", {
      transactionCount: data.transactions.length,
      period: data.period,
      exportDate: data.exportDate,
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      data.transactions.map((transaction) => ({
        Date: formatDate(transaction.date),
        Description: transaction.description,
        Amount: transaction.amount,
        Type: transaction.type.toUpperCase(),
        Category: data.categories[transaction.categoryId]?.name || "Unknown",
        Budget: transaction.budgetId || "None",
        Note: transaction.note || "",
      }))
    );

    console.log("Workbook and worksheet created successfully");

    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    console.log("Generating Excel buffer...");
    const excelBuffer = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    const filename = `financy_export_${data.period}_${timestamp}.xlsx`;
    const fileUri = documentDirectory + filename;

    console.log("Writing file to:", fileUri);
    await writeAsStringAsync(fileUri, excelBuffer, { encoding: EncodingType.Base64 });

    if (await Sharing.isAvailableAsync()) {
      console.log("Sharing available, opening share dialog...");
      await Sharing.shareAsync(fileUri);
      console.log("Share dialog completed");
    } else {
      console.log("Sharing not available on this device");
    }
  } catch (error) {
    console.error("Excel export error:", error);
    throw error;
  }
};

export const exportToCSV = async (data: ExportData): Promise<void> => {
  try {
    console.log("Starting CSV export with data:", {
      transactionCount: data.transactions.length,
      period: data.period,
      exportDate: data.exportDate,
    });

    const headers = ["Date", "Description", "Amount", "Type", "Category", "Budget", "Note"];
    const csvRows = [headers.join(",")];
    data.transactions.forEach((transaction) => {
      const category = data.categories[transaction.categoryId];
      const row = [
        formatDate(transaction.date),
        `"${transaction.description.replace(/"/g, '""')}"`,
        transaction.amount.toString(),
        transaction.type.toUpperCase(),
        `"${category?.name || "Unknown"}"`,
        transaction.budgetId || "None",
        `"${(transaction.note || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    console.log("CSV content generated, rows:", csvRows.length);

    const csvContent = csvRows.join("\n");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    const filename = `financy_export_${data.period}_${timestamp}.csv`;
    const fileUri = documentDirectory + filename;

    console.log("Writing CSV file to:", fileUri);
    await writeAsStringAsync(fileUri, csvContent, { encoding: EncodingType.UTF8 });

    console.log("CSV file written successfully, checking sharing availability...");
    if (await Sharing.isAvailableAsync()) {
      console.log("Sharing available, opening share dialog...");
      await Sharing.shareAsync(fileUri);
      console.log("Share dialog completed");
    } else {
      console.log("Sharing not available on this device");
    }
  } catch (error) {
    console.error("CSV export error:", error);
    Alert.alert("Export Failed", "Failed to create CSV file. Please try again.");
    throw error;
  }
};
