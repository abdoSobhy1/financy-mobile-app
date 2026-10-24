const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");

// Mock native/React Native dependencies when running unit tests in plain Node
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "react-native" || id === "react-native/index.js") {
    return { Platform: { OS: "android" }, NativeModules: {} };
  }
  if (id === "@react-native-community/netinfo") {
    return { fetch: () => Promise.resolve({ isConnected: true }) };
  }
  if (id === "expo-file-system/legacy") {
    return { readAsStringAsync: () => Promise.resolve(""), EncodingType: { Base64: "base64" } };
  }
  if (id === "@dariyd/react-native-text-recognition") {
    return { default: { recognize: () => Promise.resolve([]) } };
  }
  if (id === "expo-image-manipulator") {
    return {
      manipulateAsync: () => Promise.resolve({ base64: "", width: 1080, height: 1920, uri: "" }),
      SaveFormat: { JPEG: "jpeg", PNG: "png" },
    };
  }
  if (id === "react-native-document-scanner-plugin") {
    return {
      default: {
        scanDocument: () => Promise.resolve({ scannedImages: [], status: "success" }),
      },
      ResponseType: { Base64: "base64", ImageFilePath: "imageFilePath" },
      ScanDocumentResponseStatus: { Success: "success", Cancel: "cancel" },
    };
  }
  if (id === "expo-image-picker") {
    return {
      launchCameraAsync: () => Promise.resolve({ canceled: true, assets: [] }),
      launchImageLibraryAsync: () => Promise.resolve({ canceled: true, assets: [] }),
      requestCameraPermissionsAsync: () => Promise.resolve({ granted: true, status: "granted" }),
      requestMediaLibraryPermissionsAsync: () => Promise.resolve({ granted: true, status: "granted" }),
    };
  }
  if (id === "expo-document-picker") {
    return {
      getDocumentAsync: () => Promise.resolve({ canceled: true, assets: [] }),
    };
  }
  return origRequire.apply(this, arguments);
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
require("../src/__tests__/calculateWalletBalances.test.ts");
require("../src/__tests__/ocrService.test.ts");
