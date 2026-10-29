const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");

const mockImagePicker = {
  launchCameraAsync: () => Promise.resolve({ canceled: true, assets: [] }),
  launchImageLibraryAsync: () => Promise.resolve({ canceled: true, assets: [] }),
  requestCameraPermissionsAsync: () => Promise.resolve({ granted: true, status: "granted" }),
  requestMediaLibraryPermissionsAsync: () => Promise.resolve({ granted: true, status: "granted" }),
};
const mockDocPicker = {
  getDocumentAsync: () => Promise.resolve({ canceled: true, assets: [] }),
};
const mockNetInfo = {
  fetch: () => Promise.resolve({ isConnected: true }),
};
const storageMap = new Map();
const mockAsyncStorage = {
  __esModule: true,
  default: {
    getItem: (key) => Promise.resolve(storageMap.has(key) ? storageMap.get(key) : null),
    setItem: (key, val) => { storageMap.set(key, String(val)); return Promise.resolve(); },
    removeItem: (key) => { storageMap.delete(key); return Promise.resolve(); },
    clear: () => { storageMap.clear(); return Promise.resolve(); },
  },
};
const mockNotifications = {
  scheduleNotificationAsync: (opts) => Promise.resolve(opts.identifier || "mock_notif_id"),
  setNotificationHandler: () => {},
  getPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  requestPermissionsAsync: () => Promise.resolve({ status: "granted" }),
};
const mockTaskManager = {
  defineTask: () => {},
  isTaskRegisteredAsync: () => Promise.resolve(false),
};
const mockFileSystem = {
  readAsStringAsync: () => Promise.resolve(""),
  EncodingType: { Base64: "base64" },
};
const mockTextRec = {
  default: { recognize: () => Promise.resolve([]) },
};
const mockImgManip = {
  manipulateAsync: () => Promise.resolve({ base64: "", width: 1080, height: 1920, uri: "" }),
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
};
const mockDocScan = {
  default: { scanDocument: () => Promise.resolve({ scannedImages: [], status: "success" }) },
  ResponseType: { Base64: "base64", ImageFilePath: "imageFilePath" },
  ScanDocumentResponseStatus: { Success: "success", Cancel: "cancel" },
};

// Intercept Module._load which Node uses internally for all CJS require calls
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (typeof request === "string") {
    if (request === "react-native" || request.startsWith("react-native/")) {
      return {
        Platform: { OS: "android" },
        NativeModules: {
          DeviceIdModule: {
            getAndroidId: () => Promise.resolve("android_test_hw_aid_12345"),
          },
        },
        PermissionsAndroid: {
          PERMISSIONS: { READ_SMS: "android.permission.READ_SMS", RECEIVE_SMS: "android.permission.RECEIVE_SMS" },
          RESULTS: { GRANTED: "granted" },
          check: () => Promise.resolve(true),
          requestMultiple: () => Promise.resolve({
            "android.permission.READ_SMS": "granted",
            "android.permission.RECEIVE_SMS": "granted",
          }),
        },
        DeviceEventEmitter: {
          addListener: () => ({ remove: () => {} }),
          emit: () => {},
        },
        Dimensions: { get: () => ({ width: 1080, height: 2400 }) },
        Image: { getSize: (u, cb) => cb(1000, 1000) },
      };
    }
    if (request.includes("@react-native-community/netinfo")) return mockNetInfo;
    if (request.includes("@react-native-async-storage/async-storage")) return mockAsyncStorage;
    if (request === "expo-notifications" || request.includes("expo-notifications")) return mockNotifications;
    if (request.includes("expo-file-system")) return mockFileSystem;
    if (request.includes("@dariyd/react-native-text-recognition")) return mockTextRec;
    if (request.includes("expo-image-manipulator")) return mockImgManip;
    if (request.includes("react-native-document-scanner-plugin")) return mockDocScan;
    if (request.includes("expo-image-picker")) return mockImagePicker;
    if (request.includes("expo-document-picker")) return mockDocPicker;
    if (request.includes("expo-sqlite")) {
      return {
        openDatabaseSync: () => ({ execSync: () => {}, getAllSync: () => [], getFirstSync: () => null, runSync: () => ({}) }),
        openDatabaseAsync: () => Promise.resolve({
          execAsync: () => Promise.resolve(),
          getAllAsync: () => Promise.resolve([]),
          getFirstAsync: () => Promise.resolve(null),
          runAsync: () => Promise.resolve({ lastInsertRowId: 1, changes: 1 }),
        }),
      };
    }
    if (request.includes("expo-modules-core")) return { requireNativeModule: () => ({}), NativeModulesProxy: {}, EventEmitter: class {} };
    if (request.includes("expo-task-manager")) return mockTaskManager;
    if (request.includes("expo-crypto")) {
      return {
        randomUUID: () => "mock-uuid",
        CryptoDigestAlgorithm: { SHA256: "SHA-256" },
        digestStringAsync: () => Promise.resolve("mock-crypto-digest"),
      };
    }
  }
  return origLoad.apply(this, arguments);
};

// Register .ts require hook using typescript
require.extensions[".ts"] = function (module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    fileName: filename,
  });
  return module._compile(compiled.outputText, filename);
};

// Run the unit tests
require("../src/__tests__/geminiQuotaService.test.ts");
require("../src/__tests__/calculateWalletBalances.test.ts");
require("../src/__tests__/transactionCalculationsAndFilters.test.ts");
require("../src/__tests__/ocrService.test.ts");
require("../src/__tests__/smsParser.test.ts");
require("../src/__tests__/smsService.test.ts");
