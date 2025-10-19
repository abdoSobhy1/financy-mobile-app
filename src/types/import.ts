export type WizardStep = "file-selection" | "preview" | "column-mapping" | "settings" | "validation" | "import" | "summary";

export interface ImportColumn {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "boolean";
  required: boolean;
  mappedTo?: string;
  sampleValues?: string[]; // First few values for preview
}

export interface ImportMapping {
  amount: ImportColumn;
  description: ImportColumn;
  date: ImportColumn;
  category?: ImportColumn;
  type?: ImportColumn; // income/expense (optional if set globally)
  note?: ImportColumn;
}

export interface ImportSettings {
  globalTransactionType?: "income" | "expense";
  globalBudgetId?: string;
  globalBudgetName?: string;
  allowIndividualTypeOverride: boolean;
  createMissingCategories: boolean;
}

export interface ImportRow {
  [key: string]: string | number | Date | null;
}

export interface ImportPreview {
  columns: ImportColumn[];
  rows: ImportRow[]; // Limited preview rows
  allRows?: ImportRow[]; // Full dataset for import
  totalRows: number;
  fileName: string;
  fileSize: number;
}

export interface ImportValidation {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportWarning[];
  validRowCount: number;
  totalRowCount: number;
}

export interface ImportError {
  row: number;
  column: string;
  message: string;
  severity: "error" | "warning";
}

export interface ImportWarning extends ImportError {
  suggestion?: string;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  createdCategories: string[];
  errors: ImportError[];
  transactionIds: string[];
}

export interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
  status: "preparing" | "validating" | "importing" | "complete" | "error";
  message: string;
}

export const COLUMN_PATTERNS = {
  amount: ["amount", "value", "price", "cost", "total", "sum", "money", "dollars", "usd", "السعر", "المبلغ", "القيمة", "التكلفة", "المجموع"],
  description: [
    "description",
    "note",
    "memo",
    "details",
    "item",
    "name",
    "title",
    "reference",
    "اسم المنتج",
    "الوصف",
    "التفاصيل",
    "البيان",
    "اسم",
    "عنوان",
  ],
  date: ["date", "time", "when", "timestamp", "created", "transaction_date", "day", "التاريخ", "الوقت", "تاريخ المعاملة", "اليوم"],
  category: ["category", "type", "class", "group", "tag", "classification", "التصنيف", "النوع", "الفئة", "المجموعة", "التصنيف"],
  transactionType: ["type", "kind", "transaction_type", "income_expense", "debit_credit", "نوع المعاملة", "النوع", "دخل_مصروف"],
  note: ["note", "notes", "comment", "remarks", "additional_info", "ملاحظة", "ملاحظات", "تعليق", "معلومات إضافية"],
} as const;

export type ColumnPattern = keyof typeof COLUMN_PATTERNS;
