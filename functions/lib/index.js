"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCollectionWrite = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize the admin SDK (uses default credentials on Cloud Functions)
admin.initializeApp();
/**
 * Generic onWrite trigger for any collection under users/{userId}/{collectionName}/{docId}
 * - Ensures a server-side `updatedAt` timestamp is written when a document is created or updated
 * - Updates a small per-user per-collection metadata doc at users/{userId}/__meta__/{collectionName}
 *
 * Notes:
 * - The function only sets `updatedAt` when the incoming document does not already contain a Firestore Timestamp
 *   (for example when clients write a numeric epoch). This prevents a write loop because once `updatedAt` is a
 *   server Timestamp the function will not overwrite it again.
 */
exports.onUserCollectionWrite = functions
    .runWith({ memory: "128MB", timeoutSeconds: 30 })
    .firestore.document("users/{userId}/{collectionName}/{docId}")
    .onWrite(async (change, context) => {
    const { userId, collectionName } = context.params;
    try {
        const afterExists = change.after.exists;
        const beforeExists = change.before.exists;
        const afterData = afterExists ? change.after.data() : null;
        // Handle deletions by updating meta and returning
        if (!afterExists) {
            try {
                const metaRef = admin.firestore().doc(`users/${userId}/__meta__/${collectionName}`);
                await metaRef.set({ lastModified: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            }
            catch (err) {
                console.error("Failed to update meta on delete:", err);
            }
            return null;
        }
        // Write server timestamp if updatedAt is absent or is a plain number
        const existingUpdatedAt = afterData?.updatedAt;
        const needsServerTimestamp = !existingUpdatedAt || typeof existingUpdatedAt === "number";
        if (needsServerTimestamp) {
            try {
                await change.after.ref.update({ updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            catch (err) {
                console.error("Failed to set server updatedAt on document:", err);
            }
        }
        // Update per-collection metadata doc with lastModified
        try {
            const metaRef = admin.firestore().doc(`users/${userId}/__meta__/${collectionName}`);
            await metaRef.set({ lastModified: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        catch (err) {
            console.error("Failed to update collection meta:", err);
        }
        return null;
    }
    catch (error) {
        console.error("Cloud Function onUserCollectionWrite error:", error);
        return null;
    }
});
