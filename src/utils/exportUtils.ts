import * as XLSX from "xlsx";
import { writeAsStringAsync, documentDirectory, EncodingType } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { Transaction, Category, Budget } from "../types";
import { formatCurrency, formatDate } from "./index";

export interface ExportData {
  exportDate: string;
  period: string;
  transactions: Transaction[];
  categories: Record<string, Category>;
  budgets: Record<string, Budget>;

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

    // Add a master Transactions sheet (all transactions)
    const masterRows = data.transactions.map((transaction) => ({
      Date: formatDate(transaction.date),
      Description: transaction.description,
      Amount: transaction.amount,
      Type: transaction.type.toUpperCase(),
      Category: data.categories[transaction.categoryId]?.name || "Unknown",
      Budget: transaction.budgetId ? data.budgets[transaction.budgetId]?.name || "None" : "None",
      Note: transaction.note || "",
    }));

    const masterSheet = XLSX.utils.json_to_sheet(masterRows);
    XLSX.utils.book_append_sheet(workbook, masterSheet, "Transactions");

    // Create a sheet per budget and one for unbudgeted transactions
    const seenSheetNames = new Set<string>();
    const safeSheetName = (name: string, idx: number) => {
      // Excel sheet name max length 31
      let base = name || "Sheet";
      base = base.slice(0, 28);
      let candidate = base;
      if (seenSheetNames.has(candidate)) candidate = `${base}_${idx}`.slice(0, 31);
      seenSheetNames.add(candidate);
      return candidate;
    };

    const budgetsArray = Object.entries(data.budgets || {});

    for (let i = 0; i < budgetsArray.length; i++) {
      const [budgetId, budget] = budgetsArray[i];
      const txForBudget = data.transactions.filter((t) => t.budgetId === budgetId);
      const rows = txForBudget.map((transaction) => ({
        Date: formatDate(transaction.date),
        Description: transaction.description,
        Amount: transaction.amount,
        Type: transaction.type.toUpperCase(),
        Category: data.categories[transaction.categoryId]?.name || "Unknown",
        Note: transaction.note || "",
      }));

      // Compute totals per category (summing expenses only) directly from transactions
      const totalsMap: Record<string, number> = {};
      txForBudget.forEach((t) => {
        if (t.type !== "expense") return;
        const catName = data.categories[t.categoryId]?.name || "Unknown";
        totalsMap[catName] = (totalsMap[catName] || 0) + t.amount;
      });

      const totalsRows = Object.entries(totalsMap).map(([categoryName, total]) => ({
        Date: "",
        Description: "",
        Amount: total,
        Type: "",
        Category: categoryName,
        Note: "",
      }));

      // Grand total of category totals
      const grandTotal = Object.values(totalsMap).reduce((s, v) => s + v, 0);
      const grandTotalRow = { Date: "", Description: "", Amount: grandTotal, Type: "", Category: "Total", Note: "" };

      // Combine rows and totals (blank row separator)
      const combined = [
        ...rows,
        { Date: "", Description: "", Amount: "", Type: "", Category: "", Note: "" },
        { Date: "Category Totals", Description: "", Amount: "", Type: "", Category: "Total" },
        ...totalsRows,
        { Date: "", Description: "", Amount: "", Type: "", Category: "", Note: "" },
        grandTotalRow,
      ];

      const sheetName = safeSheetName(budget.name || `Budget_${i + 1}`, i + 1);
      const ws = XLSX.utils.json_to_sheet(combined, { skipHeader: false });

      // Append the budget sheet (no cell styling)
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    }

    // Unbudgeted transactions
    const txUnbudgeted = data.transactions.filter((t) => !t.budgetId);
    const unbudgetedRows = txUnbudgeted.map((transaction) => ({
      Date: formatDate(transaction.date),
      Description: transaction.description,
      Amount: transaction.amount,
      Type: transaction.type.toUpperCase(),
      Category: data.categories[transaction.categoryId]?.name || "Unknown",
      Note: transaction.note || "",
    }));

    // Totals for unbudgeted (expenses only)
    const unTotalsMap: Record<string, number> = {};
    txUnbudgeted.forEach((t) => {
      if (t.type !== "expense") return;
      const catName = data.categories[t.categoryId]?.name || "Unknown";
      unTotalsMap[catName] = (unTotalsMap[catName] || 0) + t.amount;
    });

    const unTotalsRows = Object.entries(unTotalsMap).map(([categoryName, total]) => ({
      Date: "",
      Description: "",
      Amount: total,
      Type: "",
      Category: categoryName,
      Note: "",
    }));

    // Grand total for unbudgeted
    const unGrandTotal = Object.values(unTotalsMap).reduce((s, v) => s + v, 0);
    const unGrandTotalRow = { Date: "", Description: "", Amount: unGrandTotal, Type: "", Category: "Grand Total", Note: "" };

    const unCombined = [
      ...unbudgetedRows,
      { Date: "", Description: "", Amount: "", Type: "", Category: "", Note: "" },
      { Date: "Category Totals", Description: "", Amount: "", Type: "", Category: "Total" },
      ...unTotalsRows,
      { Date: "", Description: "", Amount: "", Type: "", Category: "", Note: "" },
      unGrandTotalRow,
    ];

    const unWs = XLSX.utils.json_to_sheet(unCombined);

    // Append unbudgeted sheet (no cell styling)
    XLSX.utils.book_append_sheet(workbook, unWs, "Unbudgeted");

    console.log("Workbook and worksheets created successfully");

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
