import * as XLSX from "xlsx";
import { AlertService } from "../../../shared/services/AlertService";
import { writeAsStringAsync, documentDirectory, EncodingType } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { Transaction, Category, Budget, WalletAccount, Debt, DebtPayment } from "../../../shared/types";
import { formatCurrency, formatDate } from "../../../shared/utils";

export interface ExportData {
  exportDate: string;
  period: string;
  transactions: Transaction[];
  categories: Record<string, Category>;
  budgets: Record<string, Budget>;
  wallets?: Record<string, WalletAccount>;
  debts?: Debt[];
  debtPayments?: DebtPayment[];

  summary: {
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    totalTransfers?: number;
    netSavings?: number;
  };
}

export const exportToExcel = async (data: ExportData): Promise<void> => {
  try {

    const workbook = XLSX.utils.book_new();

    // 1. Master Transactions sheet (all transactions with wallet & transfer details)
    const masterRows = data.transactions.map((transaction) => {
      const fromWallet = transaction.accountId
        ? data.wallets?.[transaction.accountId]?.name || transaction.accountId
        : "Cash";
      const toWallet = transaction.toAccountId
        ? data.wallets?.[transaction.toAccountId]?.name || transaction.toAccountId
        : "";

      return {
        Date: formatDate(transaction.date),
        Description: transaction.description,
        Amount: transaction.amount,
        Type: transaction.type.toUpperCase(),
        Category:
          (transaction.categoryId && data.categories[transaction.categoryId]?.name) ||
          (transaction.type === "transfer" ? "Transfer" : "Unknown"),
        Budget: transaction.budgetId ? data.budgets[transaction.budgetId]?.name || "None" : "None",
        Account: fromWallet,
        "To Account": toWallet,
        Note: transaction.note || "",
      };
    });

    const masterSheet = XLSX.utils.json_to_sheet(masterRows);
    XLSX.utils.book_append_sheet(workbook, masterSheet, "Transactions");

    // 2. Wallets & Accounts sheet
    if (data.wallets && Object.keys(data.wallets).length > 0) {
      const walletRows = Object.values(data.wallets).map((w) => ({
        Name: w.name,
        Type: (w.type || "cash").toUpperCase(),
        "Initial Balance": w.initialBalance || 0,
        Status: w.archived ? "Archived" : "Active",
        Visibility: w.isSecret ? "Secret" : "Standard",
      }));
      const walletSheet = XLSX.utils.json_to_sheet(walletRows);
      XLSX.utils.book_append_sheet(workbook, walletSheet, "Wallets & Accounts");
    }

    // 3. Budgets Summary sheet
    if (data.budgets && Object.keys(data.budgets).length > 0) {
      const budgetRows = Object.values(data.budgets).map((b) => ({
        Name: b.name,
        Amount: b.amount,
        "Current Balance": b.currentBalance,
        Period: (b.period || "monthly").toUpperCase(),
        "Reset Day": b.resetDay,
        Category: (b.categoryId && data.categories[b.categoryId]?.name) || "All Categories",
      }));
      const budgetSheet = XLSX.utils.json_to_sheet(budgetRows);
      XLSX.utils.book_append_sheet(workbook, budgetSheet, "Budgets Summary");
    }

    // 4. Categories sheet
    if (data.categories && Object.keys(data.categories).length > 0) {
      const catRows = Object.values(data.categories).map((c) => ({
        Name: c.name,
        Type: (c.type || "expense").toUpperCase(),
        "Entry Count": c.entryCount || 0,
        Color: c.color || "",
      }));
      const catSheet = XLSX.utils.json_to_sheet(catRows);
      XLSX.utils.book_append_sheet(workbook, catSheet, "Categories");
    }

    // 5. Debts & Loans sheet
    if (data.debts && data.debts.length > 0) {
      const debtRows = data.debts.map((d) => ({
        Name: d.name,
        Type: d.type === "owed_to_me" ? "Owed to Me (Lent)" : "I Owe (Borrowed)",
        "Total Amount": d.totalAmount,
        "Current Balance": d.currentBalance,
        Creditor: d.creditor || "",
        "Due Date": d.dueDate ? formatDate(d.dueDate) : "",
        "Interest Rate (%)": d.interestRate !== undefined && d.interestRate !== null ? d.interestRate : "",
        "Minimum Payment": d.minimumPayment !== undefined && d.minimumPayment !== null ? d.minimumPayment : "",
        Description: d.description || "",
      }));
      const debtSheet = XLSX.utils.json_to_sheet(debtRows);
      XLSX.utils.book_append_sheet(workbook, debtSheet, "Debts & Loans");
    }

    // 6. Debt Payments sheet
    if (data.debtPayments && data.debtPayments.length > 0) {
      const debtsMap = (data.debts || []).reduce((acc, d) => {
        acc[d.id] = d.name;
        return acc;
      }, {} as Record<string, string>);

      const paymentRows = data.debtPayments.map((p) => ({
        Date: formatDate(p.paymentDate || p.date),
        Debt: debtsMap[p.debtId] || p.debtId,
        Amount: p.amount,
        Principal: p.principal,
        Interest: p.interest,
        Note: p.note || "",
      }));
      const paymentSheet = XLSX.utils.json_to_sheet(paymentRows);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, "Debt Payments");
    }

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
      const rows = txForBudget.map((transaction) => {
        const fromWallet = transaction.accountId
          ? data.wallets?.[transaction.accountId]?.name || transaction.accountId
          : "Cash";
        return {
          Date: formatDate(transaction.date),
          Description: transaction.description,
          Amount: transaction.amount,
          Type: transaction.type.toUpperCase(),
          Category:
            (transaction.categoryId && data.categories[transaction.categoryId]?.name) ||
            (transaction.type === "transfer" ? "Transfer" : "Unknown"),
          Account: fromWallet,
          Note: transaction.note || "",
        };
      });

      // Compute totals per category (summing expenses only) directly from transactions
      const totalsMap: Record<string, number> = {};
      txForBudget.forEach((t) => {
        if (t.type !== "expense") return;
        const catName = (t.categoryId && data.categories[t.categoryId]?.name) || "Unknown";
        totalsMap[catName] = (totalsMap[catName] || 0) + t.amount;
      });

      const totalsRows = Object.entries(totalsMap).map(([categoryName, total]) => ({
        Date: "",
        Description: "",
        Amount: total,
        Type: "",
        Category: categoryName,
        Account: "",
        Note: "",
      }));

      // Grand total of category totals
      const grandTotal = Object.values(totalsMap).reduce((s, v) => s + v, 0);
      const grandTotalRow = { Date: "", Description: "", Amount: grandTotal, Type: "", Category: "Total", Account: "", Note: "" };

      // Combine rows and totals (blank row separator)
      const combined = [
        ...rows,
        { Date: "", Description: "", Amount: "", Type: "", Category: "", Account: "", Note: "" },
        { Date: "Category Totals", Description: "", Amount: "", Type: "", Category: "Total", Account: "", Note: "" },
        ...totalsRows,
        { Date: "", Description: "", Amount: "", Type: "", Category: "", Account: "", Note: "" },
        grandTotalRow,
      ];

      const sheetName = safeSheetName(budget.name || `Budget_${i + 1}`, i + 1);
      const ws = XLSX.utils.json_to_sheet(combined, { skipHeader: false });

      // Append the budget sheet (no cell styling)
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    }

    // Unbudgeted transactions
    const txUnbudgeted = data.transactions.filter((t) => !t.budgetId);
    const unbudgetedRows = txUnbudgeted.map((transaction) => {
      const fromWallet = transaction.accountId
        ? data.wallets?.[transaction.accountId]?.name || transaction.accountId
        : "Cash";
      return {
        Date: formatDate(transaction.date),
        Description: transaction.description,
        Amount: transaction.amount,
        Type: transaction.type.toUpperCase(),
        Category:
          (transaction.categoryId && data.categories[transaction.categoryId]?.name) ||
          (transaction.type === "transfer" ? "Transfer" : "Unknown"),
        Account: fromWallet,
        Note: transaction.note || "",
      };
    });

    // Totals for unbudgeted (expenses only)
    const unTotalsMap: Record<string, number> = {};
    txUnbudgeted.forEach((t) => {
      if (t.type !== "expense") return;
      const catName = (t.categoryId && data.categories[t.categoryId]?.name) || "Unknown";
      unTotalsMap[catName] = (unTotalsMap[catName] || 0) + t.amount;
    });

    const unTotalsRows = Object.entries(unTotalsMap).map(([categoryName, total]) => ({
      Date: "",
      Description: "",
      Amount: total,
      Type: "",
      Category: categoryName,
      Account: "",
      Note: "",
    }));

    // Grand total for unbudgeted
    const unGrandTotal = Object.values(unTotalsMap).reduce((s, v) => s + v, 0);
    const unGrandTotalRow = { Date: "", Description: "", Amount: unGrandTotal, Type: "", Category: "Grand Total", Account: "", Note: "" };

    const unCombined = [
      ...unbudgetedRows,
      { Date: "", Description: "", Amount: "", Type: "", Category: "", Account: "", Note: "" },
      { Date: "Category Totals", Description: "", Amount: "", Type: "", Category: "Total", Account: "", Note: "" },
      ...unTotalsRows,
      { Date: "", Description: "", Amount: "", Type: "", Category: "", Account: "", Note: "" },
      unGrandTotalRow,
    ];

    const unWs = XLSX.utils.json_to_sheet(unCombined);

    // Append unbudgeted sheet (no cell styling)
    XLSX.utils.book_append_sheet(workbook, unWs, "Unbudgeted");


    const excelBuffer = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    const filename = `financy_export_${data.period}_${timestamp}.xlsx`;
    const fileUri = documentDirectory + filename;

    await writeAsStringAsync(fileUri, excelBuffer, { encoding: EncodingType.Base64 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
    }
  } catch (error) {
    console.error("Excel export error:", error);
    throw error;
  }
};

export const exportToCSV = async (data: ExportData): Promise<void> => {
  try {

    const headers = ["Date", "Description", "Amount", "Type", "Category", "Budget", "Account", "To Account", "Note"];
    const csvRows = [headers.join(",")];
    data.transactions.forEach((transaction) => {
      const category = transaction.categoryId
        ? data.categories[transaction.categoryId]
        : null;
      const budget = transaction.budgetId
        ? data.budgets[transaction.budgetId]
        : null;
      const fromWallet = transaction.accountId
        ? data.wallets?.[transaction.accountId]?.name || transaction.accountId
        : "Cash";
      const toWallet = transaction.toAccountId
        ? data.wallets?.[transaction.toAccountId]?.name || transaction.toAccountId
        : "";

      const row = [
        formatDate(transaction.date),
        `"${transaction.description.replace(/"/g, '""')}"`,
        transaction.amount.toString(),
        transaction.type.toUpperCase(),
        `"${category?.name || (transaction.type === "transfer" ? "Transfer" : "Unknown")}"`,
        `"${budget?.name || "None"}"`,
        `"${fromWallet.replace(/"/g, '""')}"`,
        `"${toWallet.replace(/"/g, '""')}"`,
        `"${(transaction.note || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });


    const csvContent = csvRows.join("\n");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    const filename = `financy_export_${data.period}_${timestamp}.csv`;
    const fileUri = documentDirectory + filename;

    await writeAsStringAsync(fileUri, csvContent, { encoding: EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
    }
  } catch (error) {
    console.error("CSV export error:", error);
    AlertService.alert("Export Failed", "Failed to create CSV file. Please try again.");
    throw error;
  }
};
