import assert from "node:assert/strict";
import Module from "node:module";

// Isolate native/Firebase dependencies while exercising the real sync workflow.
const loader = Module as any;
const originalLoad = loader._load;
const writes: Array<{ sql: string; params: any[] }> = [];
const database = {
  runAsync: async (sql: string, params: any[]) => { writes.push({ sql, params }); },
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
};
const db = { ensureInitialized: async () => {}, getDatabase: () => database, recalculateEntryCounts: async () => {} };
const auth = { isCloudSyncAllowedAsync: async () => true, requireUserIdAsync: async () => "login-regression-user" };
const events: string[] = [];
const remote = { initializeSync: async () => { events.push("listeners"); } };
loader._load = function(request: string, parent: any, isMain: boolean) {
  if (request.endsWith("/database")) return { DatabaseManager: { getInstance: () => db } };
  if (request.endsWith("/authService")) return { authService: auth };
  if (request === "./syncService") return { syncService: remote };
  if (request.endsWith("/deviceTracking")) return { addDeviceTracking: async (value: any) => value };
  if (request.endsWith("/notificationService")) return { __esModule: true, default: {} };
  return originalLoad.call(this, request, parent, isMain);
};
const { offlineFirstSync: sync } = require("../../src/infrastructure/sync/OfflineFirstSync");
const { SettingsRepository } = require("../../src/features/settings/repositories/settingsRepository");

async function run() {
  const originalProcess = sync.processUnSyncedOperations;
  sync.performComprehensiveCloudRestore = async () => {
    events.push("restore");
    return { itemsCreated: 0, itemsUpdated: 0, errors: [] };
  };
  sync.processUnSyncedOperations = async () => { events.push("queue"); };
  sync.pushAllDataToCloud = async () => {
    events.push("push");
    return { totalUploaded: 0, totalSkipped: 0, collections: {}, errors: [] };
  };
  await sync.syncWithFirebase();
  assert.deepEqual(events, ["restore", "queue", "push", "listeners"]);
  assert.equal(writes.length, 0, "Empty account restore must never insert defaults or edit settings");

  const { hasRestoredCloudData, invalidateCloudRestore } = require("../../src/infrastructure/sync/cloudRestoreState");
  assert.equal(await hasRestoredCloudData("login-regression-user"), true);
  assert.equal(await hasRestoredCloudData("another-account"), false,
    "A different account must restore its own data before uploading");

  // A new service instance simulates a cold open with no in-memory restore state.
  const reopened = new sync.constructor();
  let repeatedRestores = 0;
  reopened.syncWithFirebase = async () => { repeatedRestores++; throw new Error("Unexpected full restore"); };
  (remote as any).performDeltaSync = async () => { events.push("delta"); };
  events.length = 0;
  await reopened.forceSyncAll();
  await reopened.initializeFirebaseListeners();
  assert.equal(repeatedRestores, 0, "Reopening the same local account must not trigger a full refresh");
  assert.deepEqual(events, ["listeners", "delta"], "Normal startup only starts listeners and fetches changes");
  await invalidateCloudRestore();
  await assert.rejects(reopened.forceSyncAll(), /Unexpected full restore/);
  assert.equal(repeatedRestores, 1, "Clearing the local database requires a fresh restore");

  events.length = 0;
  sync.performComprehensiveCloudRestore = async () => ({ itemsCreated: 0, itemsUpdated: 0, errors: ["server unavailable"] });
  await assert.rejects(sync.syncWithFirebase(), /server unavailable/);
  assert.deepEqual(events, [], "Partial/failed restore must not flush queues or push local data");

  sync.processUnSyncedOperations = originalProcess;
  sync.cancelScheduledRetry();
  await assert.rejects(sync.forceSyncAll(), /server unavailable/, "Background uploads also require successful restore");

  const settings = new SettingsRepository();
  await settings.setLastSyncAttempt(123456);
  assert.equal(await settings.getLastSyncAttempt(), 123456);
  assert.equal(writes.length, 0, "Sync cursor changes must not change preference timestamps/status");

  const cloudSettings = { id: "default", updatedAt: 4321, data: { currency: "EGP", billingPeriodStartDay: 15, theme: "dark" } };
  await sync.updateLocalDocumentFromCloud("settings", cloudSettings);
  assert.match(writes[0].sql, /sync_updated_at/);
  assert.match(writes[0].sql, /sync_status/);
  assert.equal(writes[0].params[1], 4321);
  assert.equal(writes[0].params[2], "synced");

  const { cleanSettingsData } = require("../../src/shared/utils/validation");
  const timestampCases: Array<[unknown, number]> = [
    ["2026-11-02T12:00:00.000Z", Date.parse("2026-11-02T12:00:00.000Z")],
    [{ seconds: 1234, nanoseconds: 500000000 }, 1234500],
    [{ toMillis: () => 123456 }, 123456],
    [{ toDate: () => new Date(9876) }, 9876],
    ["123456", 123456], [0, 0], [NaN, 0], [Infinity, 0],
    ["invalid-date", 0], [null, 0], [undefined, 0],
    [{ toMillis: () => { throw new Error("invalid timestamp"); } }, 0],
  ];
  (database as any).getFirstAsync = async () => ({ id: "default", sync_updated_at: 0 });
  for (const [value, expected] of timestampCases) {
    assert.equal(cleanSettingsData({ syncUpdatedAt: value }).syncUpdatedAt, expected);
    const before = writes.length;
    await settings.updateSettings({ syncUpdatedAt: value as number }, { skipSync: true });
    const boundTimestamp = writes[before].params[1];
    assert.equal(boundTimestamp, expected);
    assert.ok(Number.isFinite(boundTimestamp), "SQLite must never receive null/NaN for sync_updated_at");
    assert.equal(writes[before].params[2], "synced");
  }
  assert.equal(cleanSettingsData({ sync_updated_at: 3456 }).syncUpdatedAt, 3456);
  assert.equal(cleanSettingsData({ updatedAt: "2026-11-02T12:00:00.000Z" }).syncUpdatedAt,
    Date.parse("2026-11-02T12:00:00.000Z"));

  const uploads: any[] = [];
  (remote as any).syncLocalChanges = async (...args: any[]) => { uploads.push(args); };
  (remote as any).getAllDocumentsFromCollection = async () => [];
  const queuedEdit = {
    log_id: 1, table_name: "categories", record_id: "category-1",
    operation: "update", payload: JSON.stringify({ name: "Old default" }),
  };
  (database as any).getFirstAsync = async () => ({ id: "category-1", name: "Cloud custom name", sync_status: "synced" });
  await sync.processSingleOperation(queuedEdit);
  assert.equal(uploads.length, 0, "A restored row must not be overwritten by its stale queued default");

  (database as any).getFirstAsync = async () => ({ id: "category-1", name: "Latest local edit", sync_status: "pending" });
  await sync.processSingleOperation(queuedEdit);
  assert.equal(uploads[0][3].name, "Latest local edit", "Queued edits upload the latest value before marking it synced");

  uploads.length = 0;
  sync.getLocalDocumentsByTable = async () => [{ id: "deleted-on-another-device", sync_status: "synced" }];
  const result = await sync.pushCollectionToCloud("categories", "categories");
  assert.equal(result.skipped, 1);
  assert.equal(uploads.length, 0, "A synced category removed remotely must not be recreated");
  console.log("Login cloud sync regression tests passed.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => { loader._load = originalLoad; });
