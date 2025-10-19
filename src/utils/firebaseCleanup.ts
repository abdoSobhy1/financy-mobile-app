import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, orderBy, limit } from "firebase/firestore";
import { getFirestoreInstance } from "../services/firebase";
import { authService } from "../services/authService";
import { CollectionName, COLLECTIONS } from "../types";
import { TransactionTable, CategoryTable, BudgetTable, BillTable, DebtTable, DebtPaymentTable } from "../database/models";

export interface CleanupReport {
  totalDocuments: number;
  duplicatesRemoved: number;
  fieldsCleanedUp: number;
  orphanedDocuments: number;
  bytesReclaimed: number;
  errors: string[];
  collectionStats: Record<
    string,
    {
      documents: number;
      duplicates: number;
      orphaned: number;
      fieldsRemoved: number;
    }
  >;
}

export interface CleanupOptions {
  removeDuplicates?: boolean;
  cleanupOrphanedRecords?: boolean;
  removeUnusedFields?: boolean;
  optimizeFieldNames?: boolean;
  dryRun?: boolean; // Preview changes without applying them
  collections?: CollectionName[]; // Specific collections to clean, or all if not specified
}

// Fields that should be removed from all documents (legacy/unused fields)
const UNUSED_FIELDS = [
  "key", // Legacy settings format
  "value", // Legacy settings format
  "sync_updated_at", // We use updatedAt now
  "deleted", // Handled differently now
  "sync_status", // Handled differently now
  "lastModified", // Duplicate of updatedAt
  "lastUpdated", // Duplicate of updatedAt
  "created", // We use createdAt
  "updated", // We use updatedAt
  "isDeleted", // We use soft deletes differently
  "deviceId", // Legacy device tracking
  "deviceTimestamp", // Legacy device tracking
];

// Field mappings for standardization (old field -> new field)
const FIELD_MAPPINGS: Record<string, string> = {
  // Standardize date fields
  created_at: "createdAt",
  updated_at: "updatedAt",
  due_date: "dueDate",
  payment_date: "paymentDate",

  // Standardize ID fields
  category_id: "categoryId",
  budget_id: "budgetId",
  debt_id: "debtId",

  // Standardize boolean fields
  is_default: "isDefault",
  is_recurring: "isRecurring",
  firebase_sync: "firebaseSync",

  // Standardize numeric fields
  billing_period_start_day: "billingPeriodStartDay",
  total_amount: "totalAmount",
  current_balance: "currentBalance",
  minimum_payment: "minimumPayment",
  interest_rate: "interestRate",
  due_day: "dueDay",
};

/**
 * Get valid field names for each collection based on current database schema
 */
const getValidFields = (collectionName: CollectionName): Set<string> => {
  const commonFields = new Set([
    "id",
    "createdAt",
    "updatedAt",
    "deleted",
    "syncStatus",
    // Allow both snake_case and camelCase versions during transition
    "created_at",
    "updated_at",
    "sync_updated_at",
    "sync_status",
  ]);

  switch (collectionName) {
    case "transactions":
      return new Set([
        ...commonFields,
        // Current schema fields
        "amount",
        "type",
        "categoryId",
        "budgetId",
        "description",
        "date",
        "note",
        "linkedBillId",
        "linkedDebtPaymentId",
        "duplicatedAt",
        // Legacy snake_case fields (will be converted)
        "category_id",
        "budget_id",
        "linked_bill_id",
        "linked_debt_payment_id",
        "duplicated_at",
      ]);

    case "categories":
      return new Set([
        ...commonFields,
        // Current schema fields
        "name",
        "type",
        "color",
        "entryCount",
        // Legacy snake_case fields (will be converted)
        "entry_count",
      ]);

    case "budgets":
      return new Set([
        ...commonFields,
        // Current schema fields
        "name",
        "amount",
        "currentBalance",
        "resetDay",
        "categoryId",
        // Legacy snake_case fields (will be converted)
        "current_balance",
        "reset_day",
        "category_id",
      ]);

    case "bills":
      return new Set([
        ...commonFields,
        // Current schema fields
        "name",
        "amount",
        "dueDate",
        "paid",
        "budgetId",
        "categoryId",
        "linkedTransactionId",
        "recurring",
        "recurringType",
        // Legacy snake_case fields (will be converted)
        "due_date",
        "budget_id",
        "category_id",
        "linked_transaction_id",
        "recurring_type",
      ]);

    case "debts":
      return new Set([
        ...commonFields,
        // Current schema fields
        "name",
        "totalAmount",
        "remainingAmount",
        "interestRate",
        "dueDay",
        // Legacy snake_case fields (will be converted)
        "total_amount",
        "remaining_amount",
        "interest_rate",
        "due_day",
      ]);

    case "debt_payments":
      return new Set([
        ...commonFields,
        // Current schema fields
        "debtId",
        "amount",
        "date",
        "paymentDate",
        "principal",
        "interest",
        "note",
        "linkedTransactionId",
        // Legacy snake_case fields (will be converted)
        "debt_id",
        "payment_date",
        "linked_transaction_id",
      ]);

    default:
      return commonFields;
  }
};

export class FirebaseCleanup {
  private db: any = null;
  private userId: string | null = null;

  constructor() {
    // Don't initialize db in constructor - wait for actual usage
  }

  private getDb() {
    if (!this.db) {
      this.db = getFirestoreInstance();
    }
    return this.db;
  }

  /**
   * Main cleanup function - analyzes and cleans Firebase data
   */
  async cleanupFirebaseData(options: CleanupOptions = {}): Promise<CleanupReport> {
    const report: CleanupReport = {
      totalDocuments: 0,
      duplicatesRemoved: 0,
      fieldsCleanedUp: 0,
      orphanedDocuments: 0,
      bytesReclaimed: 0,
      errors: [],
      collectionStats: {},
    };

    try {
      // Ensure user is authenticated
      this.userId = await authService.requireUserIdAsync();
      console.log(`🧹 Starting Firebase cleanup for user: ${this.userId}`);

      const collectionsToClean = options.collections || Object.values(COLLECTIONS);

      for (const collectionName of collectionsToClean) {
        console.log(`🔍 Processing collection: ${collectionName}`);

        try {
          const collectionReport = await this.cleanupCollection(collectionName, options);
          report.collectionStats[collectionName] = collectionReport;

          // Aggregate stats
          report.totalDocuments += collectionReport.documents;
          report.duplicatesRemoved += collectionReport.duplicates;
          report.fieldsCleanedUp += collectionReport.fieldsRemoved;
          report.orphanedDocuments += collectionReport.orphaned;
        } catch (error) {
          const errorMsg = `Failed to clean collection ${collectionName}: ${error}`;
          console.error(errorMsg);
          report.errors.push(errorMsg);
        }
      }

      // Additional cleanup operations
      if (options.cleanupOrphanedRecords) {
        await this.cleanupOrphanedRecords(report, options.dryRun);
      }

      // Print detailed summary
      console.log(`\n🎉 Firebase cleanup completed!`);
      console.log(`📊 Summary:`);
      console.log(`   • Documents processed: ${report.totalDocuments}`);
      console.log(`   • Fields cleaned up: ${report.fieldsCleanedUp}`);
      console.log(`   • Duplicates removed: ${report.duplicatesRemoved}`);
      console.log(`   • Orphaned records: ${report.orphanedDocuments}`);

      if (report.errors.length > 0) {
        console.log(`⚠️ Errors encountered: ${report.errors.length}`);
        report.errors.forEach((error) => console.log(`   - ${error}`));
      }

      if (report.fieldsCleanedUp === 0) {
        console.log(`ℹ️ No fields needed cleanup - your Firebase data is already optimized!`);
      }

      return report;
    } catch (error) {
      const errorMsg = `Firebase cleanup failed: ${error}`;
      console.error(errorMsg);
      report.errors.push(errorMsg);
      return report;
    }
  }

  /**
   * Clean a specific collection
   */
  private async cleanupCollection(
    collectionName: CollectionName,
    options: CleanupOptions
  ): Promise<{ documents: number; duplicates: number; orphaned: number; fieldsRemoved: number }> {
    const collectionRef = collection(this.getDb(), "users", this.userId!, collectionName);
    const snapshot = await getDocs(collectionRef);

    const stats = {
      documents: snapshot.docs.length,
      duplicates: 0,
      orphaned: 0,
      fieldsRemoved: 0,
    };

    console.log(`📊 Found ${stats.documents} documents in ${collectionName}`);

    // Debug: Show valid fields for this collection
    const validFields = getValidFields(collectionName);
    console.log(`🔍 Valid fields for ${collectionName}:`, Array.from(validFields).join(", "));

    // Debug: Show sample document fields (first doc only)
    if (snapshot.docs.length > 0) {
      const sampleDoc = snapshot.docs[0].data();
      const existingFields = Object.keys(sampleDoc);
      console.log(`📄 Sample document fields in ${collectionName}:`, existingFields.join(", "));

      // Find fields that don't match schema
      const invalidFields = existingFields.filter((field) => !validFields.has(field));
      if (invalidFields.length > 0) {
        console.log(`⚠️ Invalid fields found in ${collectionName}:`, invalidFields.join(", "));
      }
    }

    // Track documents by content hash to find duplicates
    const documentHashes = new Map<string, string[]>(); // hash -> [docIds]
    const documentsToUpdate: Array<{ id: string; data: any }> = [];
    const documentsToDelete: string[] = [];

    for (const docSnap of snapshot.docs) {
      const docId = docSnap.id;
      const docData = docSnap.data();

      try {
        // Clean up fields in this document
        const { cleanedData, fieldsRemoved } = this.cleanDocumentFields(docData, options, collectionName);
        stats.fieldsRemoved += fieldsRemoved;

        // Check for duplicates
        if (options.removeDuplicates) {
          const contentHash = this.createContentHash(cleanedData);
          if (!documentHashes.has(contentHash)) {
            documentHashes.set(contentHash, []);
          }
          documentHashes.get(contentHash)!.push(docId);
        }

        // Queue for update if changes were made
        if (fieldsRemoved > 0) {
          documentsToUpdate.push({ id: docId, data: cleanedData });
        }
      } catch (error) {
        console.error(`❌ Error processing document ${docId}:`, error);
      }
    }

    // Identify duplicates
    if (options.removeDuplicates) {
      for (const [hash, docIds] of documentHashes) {
        if (docIds.length > 1) {
          // Keep the most recent document, delete the rest
          const docsToDelete = docIds.slice(1); // Keep first, delete rest
          documentsToDelete.push(...docsToDelete);
          stats.duplicates += docsToDelete.length;

          console.log(`🔍 Found ${docIds.length} duplicates with hash ${hash.substring(0, 8)}...`);
        }
      }
    }

    // Apply changes (if not dry run)
    if (!options.dryRun) {
      await this.applyDocumentChanges(collectionName, documentsToUpdate, documentsToDelete);
    } else {
      console.log(`🔍 DRY RUN: Would update ${documentsToUpdate.length} documents and delete ${documentsToDelete.length} duplicates`);
    }

    return stats;
  }

  /**
   * Clean fields in a single document
   */
  private cleanDocumentFields(docData: any, options: CleanupOptions, collectionName: CollectionName): { cleanedData: any; fieldsRemoved: number } {
    const cleanedData = { ...docData };
    let fieldsRemoved = 0;

    // Get valid fields for this collection
    const validFields = getValidFields(collectionName);

    // Remove fields that don't exist in the current schema
    if (options.removeUnusedFields) {
      // First remove explicitly unused fields
      for (const field of UNUSED_FIELDS) {
        if (field in cleanedData) {
          delete cleanedData[field];
          fieldsRemoved++;
          console.log(`🗑️ Removed unused field: ${field}`);
        }
      }

      // Then remove any fields not in the valid schema
      for (const field of Object.keys(cleanedData)) {
        if (!validFields.has(field)) {
          delete cleanedData[field];
          fieldsRemoved++;
          console.log(`🗑️ Removed invalid field for ${collectionName}: ${field}`);
        }
      }
    }

    // Optimize field names (snake_case to camelCase)
    if (options.optimizeFieldNames) {
      for (const [oldField, newField] of Object.entries(FIELD_MAPPINGS)) {
        if (oldField in cleanedData && !(newField in cleanedData)) {
          cleanedData[newField] = cleanedData[oldField];
          delete cleanedData[oldField];
          fieldsRemoved++; // Count as cleanup
          console.log(`🔄 Converted field: ${oldField} → ${newField}`);
        }
      }
    }

    // Remove undefined/null values
    for (const [key, value] of Object.entries(cleanedData)) {
      if (value === undefined) {
        delete cleanedData[key];
        fieldsRemoved++;
        console.log(`🗑️ Removed undefined field: ${key}`);
      }
    }

    // Ensure required fields exist with proper types
    this.ensureRequiredFields(cleanedData);

    return { cleanedData, fieldsRemoved };
  }

  /**
   * Ensure documents have required fields with proper types
   */
  private ensureRequiredFields(docData: any): void {
    // Ensure all documents have timestamps
    if (!docData.createdAt) {
      docData.createdAt = docData.created_at || Date.now();
    }
    if (!docData.updatedAt) {
      docData.updatedAt = docData.updated_at || docData.createdAt || Date.now();
    }

    // Ensure numeric fields are actually numbers
    const numericFields = ["amount", "totalAmount", "currentBalance", "interestRate", "minimumPayment", "billingPeriodStartDay"];
    for (const field of numericFields) {
      if (field in docData && typeof docData[field] !== "number") {
        const numValue = parseFloat(docData[field]);
        if (!isNaN(numValue)) {
          docData[field] = numValue;
        }
      }
    }

    // Ensure boolean fields are actually booleans
    const booleanFields = ["isDefault", "isRecurring", "firebaseSync"];
    for (const field of booleanFields) {
      if (field in docData && typeof docData[field] !== "boolean") {
        docData[field] = Boolean(docData[field]);
      }
    }
  }

  /**
   * Create a hash of document content to identify duplicates
   */
  private createContentHash(docData: any): string {
    try {
      // Validate input
      if (!docData || typeof docData !== "object") {
        console.warn("Invalid document data for hashing:", docData);
        return Date.now().toString();
      }

      // Create hash based on key content fields (excluding timestamps and IDs)
      const { createdAt, updatedAt, id, ...contentData } = docData;

      // Filter out any problematic values that might cause serialization issues
      const cleanedContent = this.sanitizeForSerialization(contentData);

      // Sort keys for consistent hashing
      const sortedContent = Object.keys(cleanedContent)
        .sort()
        .reduce((obj: any, key) => {
          obj[key] = cleanedContent[key];
          return obj;
        }, {});

      // Use a simple hash function instead of btoa to avoid Unicode issues
      const jsonString = JSON.stringify(sortedContent);
      return this.simpleHash(jsonString);
    } catch (error) {
      console.warn("Error creating content hash:", error);
      // Fallback: use current timestamp as unique identifier
      return Date.now().toString();
    }
  }

  /**
   * Sanitize object for safe JSON serialization
   */
  private sanitizeForSerialization(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (typeof obj !== "object") {
      // Handle primitive types, but ensure they're serializable
      if (typeof obj === "string") {
        // Remove any potentially problematic characters
        return obj.replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeForSerialization(item));
    }

    // Handle objects
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      try {
        sanitized[key] = this.sanitizeForSerialization(value);
      } catch (error) {
        console.warn(`Skipping problematic field ${key}:`, error);
        // Skip this field if it can't be sanitized
      }
    }

    return sanitized;
  }

  /**
   * Simple hash function that can handle Unicode characters
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36).padStart(8, "0").substring(0, 32);
  }

  /**
   * Apply document changes using batch operations
   */
  private async applyDocumentChanges(
    collectionName: CollectionName,
    documentsToUpdate: Array<{ id: string; data: any }>,
    documentsToDelete: string[]
  ): Promise<void> {
    const batch = writeBatch(this.getDb());
    let operationCount = 0;

    // Update documents
    for (const { id, data } of documentsToUpdate) {
      const docRef = doc(this.getDb(), "users", this.userId!, collectionName, id);
      batch.set(docRef, data, { merge: true });
      operationCount++;

      // Firestore batch limit is 500 operations
      if (operationCount >= 450) {
        await batch.commit();
        operationCount = 0;
        console.log(`📦 Committed batch of updates for ${collectionName}`);
      }
    }

    // Delete duplicate documents
    for (const docId of documentsToDelete) {
      const docRef = doc(this.getDb(), "users", this.userId!, collectionName, docId);
      batch.delete(docRef);
      operationCount++;

      if (operationCount >= 450) {
        await batch.commit();
        operationCount = 0;
        console.log(`🗑️ Committed batch of deletions for ${collectionName}`);
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit();
      console.log(`✅ Final batch committed for ${collectionName}: ${operationCount} operations`);
    }
  }

  /**
   * Clean up orphaned records (e.g., transactions without valid categories)
   */
  private async cleanupOrphanedRecords(report: CleanupReport, dryRun?: boolean): Promise<void> {
    console.log(`🔍 Checking for orphaned records...`);

    try {
      // Get all categories to validate references
      const categoriesRef = collection(this.getDb(), "users", this.userId!, "categories");
      const categoriesSnapshot = await getDocs(categoriesRef);
      const validCategoryIds = new Set(categoriesSnapshot.docs.map((doc) => doc.id));

      // Get all budgets to validate references
      const budgetsRef = collection(this.getDb(), "users", this.userId!, "budgets");
      const budgetsSnapshot = await getDocs(budgetsRef);
      const validBudgetIds = new Set(budgetsSnapshot.docs.map((doc) => doc.id));

      // Check transactions for invalid references
      await this.cleanupOrphanedTransactions(validCategoryIds, validBudgetIds, report, dryRun);

      // Check debt_payments for invalid debt references
      await this.cleanupOrphanedDebtPayments(report, dryRun);
    } catch (error) {
      console.error(`❌ Error during orphaned record cleanup:`, error);
      report.errors.push(`Orphaned record cleanup failed: ${error}`);
    }
  }

  private async cleanupOrphanedTransactions(
    validCategoryIds: Set<string>,
    validBudgetIds: Set<string>,
    report: CleanupReport,
    dryRun?: boolean
  ): Promise<void> {
    const transactionsRef = collection(this.getDb(), "users", this.userId!, "transactions");
    const transactionsSnapshot = await getDocs(transactionsRef);

    const orphanedTransactions: string[] = [];

    for (const docSnap of transactionsSnapshot.docs) {
      const data = docSnap.data();
      const hasInvalidCategory = data.categoryId && !validCategoryIds.has(data.categoryId);
      const hasInvalidBudget = data.budgetId && !validBudgetIds.has(data.budgetId);

      if (hasInvalidCategory || hasInvalidBudget) {
        orphanedTransactions.push(docSnap.id);
        console.log(`🔍 Found orphaned transaction: ${docSnap.id} (invalid category: ${hasInvalidCategory}, invalid budget: ${hasInvalidBudget})`);
      }
    }

    if (orphanedTransactions.length > 0) {
      report.orphanedDocuments += orphanedTransactions.length;

      if (!dryRun) {
        // Fix orphaned transactions by removing invalid references
        const batch = writeBatch(this.getDb());

        for (const transactionId of orphanedTransactions) {
          const docRef = doc(this.getDb(), "users", this.userId!, "transactions", transactionId);
          const updateData: any = {};

          // Remove invalid references
          const docSnap = await getDocs(query(transactionsRef, where("__name__", "==", transactionId), limit(1)));
          if (!docSnap.empty) {
            const data = docSnap.docs[0].data();
            if (data.categoryId && !validCategoryIds.has(data.categoryId)) {
              updateData.categoryId = null;
            }
            if (data.budgetId && !validBudgetIds.has(data.budgetId)) {
              updateData.budgetId = null;
            }
          }

          batch.update(docRef, updateData);
        }

        await batch.commit();
        console.log(`✅ Fixed ${orphanedTransactions.length} orphaned transactions`);
      }
    }
  }

  private async cleanupOrphanedDebtPayments(report: CleanupReport, dryRun?: boolean): Promise<void> {
    // Get all debts to validate references
    const debtsRef = collection(this.getDb(), "users", this.userId!, "debts");
    const debtsSnapshot = await getDocs(debtsRef);
    const validDebtIds = new Set(debtsSnapshot.docs.map((doc) => doc.id));

    // Check debt payments
    const paymentsRef = collection(this.getDb(), "users", this.userId!, "debt_payments");
    const paymentsSnapshot = await getDocs(paymentsRef);

    const orphanedPayments: string[] = [];

    for (const docSnap of paymentsSnapshot.docs) {
      const data = docSnap.data();
      if (data.debtId && !validDebtIds.has(data.debtId)) {
        orphanedPayments.push(docSnap.id);
      }
    }

    if (orphanedPayments.length > 0) {
      report.orphanedDocuments += orphanedPayments.length;

      if (!dryRun) {
        // Delete orphaned debt payments
        const batch = writeBatch(this.getDb());

        for (const paymentId of orphanedPayments) {
          const docRef = doc(this.getDb(), "users", this.userId!, "debt_payments", paymentId);
          batch.delete(docRef);
        }

        await batch.commit();
        console.log(`🗑️ Deleted ${orphanedPayments.length} orphaned debt payments`);
      }
    }
  }

  /**
   * Get cleanup statistics without making changes
   */
  async analyzeFirebaseData(): Promise<CleanupReport> {
    return this.cleanupFirebaseData({
      dryRun: true,
      removeDuplicates: true,
      cleanupOrphanedRecords: true,
      removeUnusedFields: true,
      optimizeFieldNames: true,
    });
  }

  /**
   * Perform quick cleanup - removes unused fields and optimizes field names
   */
  async quickCleanup(): Promise<CleanupReport> {
    return this.cleanupFirebaseData({ removeUnusedFields: true, optimizeFieldNames: true });
  }

  /**
   * Perform full cleanup - removes duplicates, orphaned records, and unused fields
   */
  async fullCleanup(): Promise<CleanupReport> {
    return this.cleanupFirebaseData({
      removeDuplicates: true,
      cleanupOrphanedRecords: true,
      removeUnusedFields: true,
      optimizeFieldNames: true,
    });
  }
}

// Export singleton instance
export const firebaseCleanup = new FirebaseCleanup();
