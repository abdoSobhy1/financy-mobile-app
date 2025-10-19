import * as XLSX from "xlsx";
import * as DocumentPicker from "expo-document-picker";
import {
  ImportColumn,
  ImportMapping,
  ImportPreview,
  ImportRow,
  ImportSettings,
  ImportValidation,
  ImportResult,
  ImportProgress,
  ImportError,
  COLUMN_PATTERNS,
  ColumnPattern,
} from "../types/import";
import { Transaction, TransactionType } from "../types";
import { parse, isValid } from "date-fns";
import { db } from "../database/queries";
import * as Crypto from "expo-crypto";

export class ExcelImportService {
  private onProgressUpdate?: (progress: ImportProgress) => void;

  constructor(onProgressUpdate?: (progress: ImportProgress) => void) {
    this.onProgressUpdate = onProgressUpdate;
  }

  private updateProgress(progress: Partial<ImportProgress>) {
    if (this.onProgressUpdate) {
      this.onProgressUpdate({
        current: 0,
        total: 0,
        percentage: 0,
        status: "preparing",
        message: "Starting import...",
        ...progress,
      });
    }
  }

  /**
   * Parse Excel/CSV file and return preview data
   */
  async parseFile(file: DocumentPicker.DocumentPickerAsset): Promise<ImportPreview> {
    this.updateProgress({
      status: "preparing",
      message: "Reading file...",
      percentage: 10,
    });

    try {
      // Read file content
      const fileUri = (file as any).uri;
      let workbook: XLSX.WorkBook;

      if ((file as any).name?.endsWith(".csv")) {
        // Handle CSV files
        const csvData = await this.readFileAsText(fileUri);
        workbook = XLSX.read(csvData, { type: "string" });
      } else {
        // Handle Excel files
        const arrayBuffer = await this.readFileAsArrayBuffer(fileUri);
        workbook = XLSX.read(arrayBuffer, { type: "array" });
      }

      // Get first worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        raw: false, // Keep as strings for better parsing control
      });

      if (jsonData.length === 0) {
        throw new Error("File is empty or contains no data");
      }

      // Extract headers (first row)
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1).filter((row) => row.some((cell: any) => cell !== null && cell !== ""));

      // Create column definitions with sample values
      const columns: ImportColumn[] = headers.map((header, index) => ({
        id: `col_${index}`,
        name: header || `Column ${index + 1}`,
        type: this.detectColumnType(dataRows, index),
        required: false,
        mappedTo: this.suggestMapping(header),
        sampleValues: dataRows.slice(0, 3).map((row) => {
          const value = String(row[index] || "");
          // Add date parsing preview for potential date columns
          if (this.detectColumnType(dataRows, index) === "date" && value) {
            const parsedDate = this.parseDate(value);
            return parsedDate ? `${value} → ${parsedDate.toLocaleDateString()}` : `${value} ⚠️ Invalid`;
          }
          return value;
        }),
      }));

      // Convert rows to objects - keep preview limited but store full data
      const rows: ImportRow[] = dataRows.slice(0, 10).map((row) => {
        const rowObj: ImportRow = {};
        headers.forEach((header, index) => {
          rowObj[header || `Column ${index + 1}`] = row[index] || null;
        });
        return rowObj;
      });

      // Store full dataset for actual import
      const allRows: ImportRow[] = dataRows.map((row) => {
        const rowObj: ImportRow = {};
        headers.forEach((header, index) => {
          rowObj[header || `Column ${index + 1}`] = row[index] || null;
        });
        return rowObj;
      });

      this.updateProgress({
        status: "preparing",
        message: "File parsed successfully",
        percentage: 50,
      });

      return {
        columns,
        rows, // Limited preview
        allRows, // Full dataset for import
        totalRows: dataRows.length,
        fileName: (file as any).name || "unknown",
        fileSize: (file as any).size || 0,
      };
    } catch (error) {
      throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Validate mapped data before import
   */
  async validateImport(preview: ImportPreview, mapping: ImportMapping, settings: ImportSettings): Promise<ImportValidation> {
    this.updateProgress({
      status: "validating",
      message: "Validating data...",
      percentage: 0,
    });

    const errors: ImportError[] = [];
    let validRowCount = 0;

    // Validate mapping requirements
    if (!mapping.amount) {
      errors.push({
        row: 0,
        column: "amount",
        message: "Amount column is required",
        severity: "error",
      });
    }

    if (!mapping.description) {
      errors.push({
        row: 0,
        column: "description",
        message: "Description column is required",
        severity: "error",
      });
    }

    if (!mapping.date) {
      errors.push({
        row: 0,
        column: "date",
        message: "Date column is required",
        severity: "error",
      });
    }

    // Get all data for validation (not just preview)
    const allRows = await this.getAllRows(preview);

    // Validate each row
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      let rowValid = true;

      // Validate amount
      if (mapping.amount) {
        const amount = this.parseAmount(row[mapping.amount.name]);
        if (amount === null || amount <= 0) {
          errors.push({
            row: i + 2, // +2 because of header and 0-based index
            column: mapping.amount.name,
            message: "Amount must be a positive number",
            severity: "error",
          });
          rowValid = false;
        }
      }

      // Validate description
      if (mapping.description) {
        const description = String(row[mapping.description.name] || "").trim();
        if (!description) {
          errors.push({
            row: i + 2,
            column: mapping.description.name,
            message: "Description cannot be empty",
            severity: "error",
          });
          rowValid = false;
        }
      }

      // Validate date
      if (mapping.date) {
        const date = this.parseDate(row[mapping.date.name]);
        if (!date) {
          errors.push({
            row: i + 2,
            column: mapping.date.name,
            message: "Invalid date format",
            severity: "error",
          });
          rowValid = false;
        }
      }

      if (rowValid) {
        validRowCount++;
      }

      // Update progress
      if (i % 100 === 0) {
        this.updateProgress({
          status: "validating",
          message: `Validating row ${i + 1} of ${allRows.length}...`,
          percentage: Math.round((i / allRows.length) * 100),
        });
      }
    }

    return {
      isValid: errors.filter((e) => e.severity === "error").length === 0,
      errors: errors.filter((e) => e.severity === "error"),
      warnings: errors.filter((e) => e.severity === "warning"),
      validRowCount,
      totalRowCount: allRows.length,
    };
  }

  /**
   * Import validated data to database
   */
  async importData(preview: ImportPreview, mapping: ImportMapping, settings: ImportSettings): Promise<ImportResult> {
    this.updateProgress({
      status: "importing",
      message: "Starting import...",
      percentage: 0,
    });

    const result: ImportResult = {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      createdCategories: [],
      errors: [],
      transactionIds: [],
    };

    try {
      console.log("Getting all rows from preview...");
      // Get all rows
      const allRows = await this.getAllRows(preview);
      console.log(`Found ${allRows.length} rows to import`);

      console.log("Preparing categories map...");
      // Get or create categories
      const categoryMap = await this.prepareCategoriesMap(allRows, mapping, settings);
      console.log("Categories map prepared:", Object.keys(categoryMap));

      console.log("Starting transaction imports...");
      // Import transactions
      for (let i = 0; i < allRows.length; i++) {
        try {
          const row = allRows[i];
          const transaction = await this.convertRowToTransaction(row, mapping, settings, categoryMap);

          if (transaction) {
            console.log(`Creating transaction ${i + 1}/${allRows.length}:`, transaction);
            // Remove id and createdAt since createTransaction generates them
            const { id, createdAt, ...transactionData } = transaction;
            const createdTransaction = await db.transactions.createTransaction(transactionData);
            console.log("Transaction created successfully:", createdTransaction.id);
            result.transactionIds.push(createdTransaction.id);
            result.importedCount++;
          } else {
            console.log(`Skipping row ${i + 1} - no transaction generated`);
            result.skippedCount++;
          }
        } catch (error) {
          result.errorCount++;
          console.error("Error importing transaction at row", i + 2, ":", error);
          result.errors.push({
            row: i + 2,
            column: "general",
            message: error instanceof Error ? error.message : "Unknown error",
            severity: "error",
          });
        }

        // Update progress
        if (i % 10 === 0) {
          this.updateProgress({
            status: "importing",
            message: `Imported ${result.importedCount} of ${allRows.length} transactions...`,
            percentage: Math.round((i / allRows.length) * 100),
          });
        }
      }

      result.success = result.importedCount > 0;
      result.createdCategories = Object.keys(categoryMap).filter((name) => categoryMap[name].isNew);

      this.updateProgress({
        status: "complete",
        message: `Import complete! Imported ${result.importedCount} transactions.`,
        percentage: 100,
      });

      return result;
    } catch (error) {
      this.updateProgress({
        status: "error",
        message: error instanceof Error ? error.message : "Import failed",
        percentage: 0,
      });
      throw error;
    }
  }

  // Helper methods

  private async readFileAsText(uri: string): Promise<string> {
    try {
      const { File } = await import("expo-file-system");
      const file = new File(uri);
      return await file.text();
    } catch (error) {
      throw new Error(`Failed to read CSV file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
    try {
      const { File } = await import("expo-file-system");
      const file = new File(uri);
      const base64String = await file.base64();

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      throw new Error(`Failed to read Excel file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private detectColumnType(rows: any[][], columnIndex: number): "text" | "number" | "date" | "boolean" {
    const samples = rows
      .slice(0, 10)
      .map((row) => row[columnIndex])
      .filter(Boolean);

    if (samples.length === 0) return "text";

    // Check if all samples are numbers
    const numberCount = samples.filter((sample) => !isNaN(Number(sample))).length;
    if (numberCount === samples.length) return "number";

    // Check if samples look like dates
    const dateCount = samples.filter((sample) => {
      const date = new Date(sample);
      return !isNaN(date.getTime());
    }).length;
    if (dateCount > samples.length * 0.8) return "date";

    return "text";
  }

  private suggestMapping(header: string): string | undefined {
    const lowerHeader = header.toLowerCase().trim();

    for (const [pattern, keywords] of Object.entries(COLUMN_PATTERNS)) {
      if (keywords.some((keyword) => lowerHeader.includes(keyword))) {
        return pattern;
      }
    }

    return undefined;
  }

  private async getAllRows(preview: ImportPreview): Promise<ImportRow[]> {
    // Return full dataset if available, fallback to preview rows
    return preview.allRows || preview.rows;
  }

  private parseAmount(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;

    const numStr = String(value).replace(/[,$\s]/g, "");
    const num = parseFloat(numStr);

    return isNaN(num) ? null : Math.abs(num); // Always positive
  }

  private parseDate(value: any): Date | null {
    if (value === null || value === undefined || value === "") return null;

    const stringValue = String(value).trim();
    if (!stringValue) return null;

    // Try direct Date parsing first (works for many formats)
    let date = new Date(stringValue);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try human-friendly formats (e.g. 'Oct 06, 2025', 'October 6, 2025') using date-fns
    try {
      const formats = ["MMM dd, yyyy", "MMM d, yyyy", "MMMM dd, yyyy", "MMMM d, yyyy", "MM/dd/yyyy", "M/d/yyyy"];
      for (const fmt of formats) {
        try {
          const parsed = parse(stringValue, fmt, new Date());
          if (isValid(parsed)) return parsed;
        } catch (e) {
          // ignore and try next
        }
      }
    } catch (e) {
      // parsing failed with date-fns - fall back to existing logic
    }

    // Handle dd/mm/yyyy and dd-mm-yyyy formats
    const ddmmyyyyRegex = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
    const ddmmMatch = stringValue.match(ddmmyyyyRegex);
    if (ddmmMatch) {
      const [, day, month, year] = ddmmMatch;
      // Create date with month-1 since JavaScript months are 0-indexed
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Handle yyyy-mm-dd format
    const yyyymmddRegex = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/;
    const yyyymmMatch = stringValue.match(yyyymmddRegex);
    if (yyyymmMatch) {
      const [, year, month, day] = yyyymmMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Handle mm/dd/yyyy format
    const mmddyyyyRegex = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
    const mmddMatch = stringValue.match(mmddyyyyRegex);
    if (mmddMatch) {
      const [, month, day, year] = mmddMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    console.warn("Could not parse date:", stringValue);
    return null;
  }

  private async prepareCategoriesMap(
    rows: ImportRow[],
    mapping: ImportMapping,
    settings: ImportSettings
  ): Promise<Record<string, { id: string; isNew: boolean }>> {
    const categoryMap: Record<string, { id: string; isNew: boolean }> = {};

    if (!mapping.category) return categoryMap;

    // Get existing categories
    const existingCategories = await db.categories.getAllCategories();
    const existingByName = existingCategories.reduce((acc, cat) => {
      acc[cat.name.toLowerCase()] = cat;
      return acc;
    }, {} as Record<string, any>);

    // Collect unique category names from import
    const categoryNames = new Set<string>();
    rows.forEach((row) => {
      const categoryName = String(row[mapping.category!.name] || "").trim();
      if (categoryName) {
        categoryNames.add(categoryName);
      }
    });

    // Map categories
    const categoryNameArray = Array.from(categoryNames);
    for (const name of categoryNameArray) {
      const existing = existingByName[name.toLowerCase()];
      if (existing) {
        categoryMap[name] = { id: existing.id, isNew: false };
      } else if (settings.createMissingCategories) {
        // Create new category - let the repository generate the real ID and use that
        const newCategoryData = {
          name,
          type: (settings.globalTransactionType || "expense") as "income" | "expense",
          color: undefined,
          entryCount: 0,
          updatedAt: Date.now(),
          deleted: false,
          syncStatus: "pending" as const,
        } as any;

        const createdCategory = await db.categories.createCategory(newCategoryData);
        categoryMap[name] = { id: createdCategory.id, isNew: true };
      }
    }

    return categoryMap;
  }

  private async convertRowToTransaction(
    row: ImportRow,
    mapping: ImportMapping,
    settings: ImportSettings,
    categoryMap: Record<string, { id: string; isNew: boolean }>
  ): Promise<Transaction | null> {
    // Parse required fields
    const amount = this.parseAmount(row[mapping.amount.name]);
    const description = String(row[mapping.description.name] || "").trim();
    const date = this.parseDate(row[mapping.date.name]);

    if (!amount || !description || !date) {
      return null; // Skip invalid rows
    }

    // Determine transaction type
    let type: TransactionType = "expense"; // default
    if (settings.globalTransactionType) {
      type = settings.globalTransactionType;
    } else if (mapping.type) {
      const typeValue = String(row[mapping.type.name] || "").toLowerCase();
      if (typeValue.includes("income") || typeValue.includes("credit")) {
        type = "income";
      }
    }

    // Get category ID
    let categoryId: string | null = null;
    if (mapping.category) {
      const categoryName = String(row[mapping.category.name] || "").trim();
      if (categoryName && categoryMap[categoryName]) {
        categoryId = categoryMap[categoryName].id;
      }
    }

    // Get note
    const note = mapping.note ? String(row[mapping.note.name] || "").trim() : "";

    const now = Date.now();

    return {
      id: Crypto.randomUUID(),
      amount,
      description,
      date: date.toISOString(),
      type,
      categoryId: categoryId || "", // Transaction requires categoryId as string
      budgetId: settings.globalBudgetId || undefined,
      note: note || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: now,
      // Add sync fields to ensure Firebase sync
      syncStatus: "pending" as const,
      deleted: false,
    };
  }
}
