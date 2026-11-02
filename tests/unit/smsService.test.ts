import {
  smsService,
  storeSmsTransaction,
  retrieveSmsTransaction,
  clearSmsTransaction,
  getSmsDetectionEnabled,
  setSmsDetectionEnabled,
  processIncomingSms,
} from "../../src/features/sms/services/smsService";
import { getPersistentDeviceKeys } from "../../src/infrastructure/device/deviceId";

declare const module: any;

function assertStrictEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed! Expected: ${expected}, Got: ${actual}. ${message || ""}`
    );
  }
}

async function runSmsServiceTests() {
  console.log("\nRunning smsService & native module unit tests...\n");

  // Test 1: Native module DeviceIdModule integration
  {
    const keys = await getPersistentDeviceKeys();
    assertStrictEqual(Array.isArray(keys), true, "Keys should be an array");
    const hasAndroidId = keys.some((k) => k.startsWith("hw_aid_"));
    assertStrictEqual(hasAndroidId, true, "Should resolve hardware ANDROID_ID from native DeviceIdModule");
    console.log("✓ Test 1: DeviceIdModule native method resolution passed");
  }

  // Test 2: smsService platform support & permission check
  {
    assertStrictEqual(smsService.isSupported(), true, "smsService should be supported on Android");
    const hasPerm = await smsService.hasPermissions();
    assertStrictEqual(hasPerm, true, "hasPermissions should return true when granted");
    const reqPerm = await smsService.requestPermissions();
    assertStrictEqual(reqPerm, true, "requestPermissions should return true when granted");
    console.log("✓ Test 2: Platform check and permissions management passed");
  }

  // Test 3: Enable / Disable toggle persistence
  {
    await setSmsDetectionEnabled(false);
    assertStrictEqual(await getSmsDetectionEnabled(), false, "Should persist disabled state");
    await setSmsDetectionEnabled(true);
    assertStrictEqual(await getSmsDetectionEnabled(), true, "Should persist enabled state");
    console.log("✓ Test 3: SMS detection toggle persistence passed");
  }

  // Test 4: Transaction storage, retrieval, and cleanup
  {
    const testNotifId = "test_notif_999";
    const sampleTx = {
      type: "expense" as const,
      amount: 450,
      description: "CARREFOUR",
      date: new Date(),
      confidence: 1.0,
      rawText: "CARREFOUR",
    };

    await storeSmsTransaction(testNotifId, sampleTx);
    const retrieved = await retrieveSmsTransaction(testNotifId);
    assertStrictEqual(retrieved !== null, true);
    assertStrictEqual(retrieved?.amount, 450);
    assertStrictEqual(retrieved?.description, "CARREFOUR");

    await clearSmsTransaction(testNotifId);
    const cleared = await retrieveSmsTransaction(testNotifId);
    assertStrictEqual(cleared, null, "Cleared transaction should be null");
    console.log("✓ Test 4: SMS transaction storage, retrieval, and cleanup passed");
  }

  // Test 5: Full simulation pipeline (simulateSms)
  {
    const simResult = await smsService.simulateSms({
      originatingAddress: "CIB",
      body: "تم خصم 350.00 EGP من بطاقة عند HyperOne يوم 29/10/26",
    });
    assertStrictEqual(simResult.success, true, "simulateSms should succeed for CIB bank SMS");
    assertStrictEqual(simResult.transaction?.amount, 350);
    assertStrictEqual(simResult.transaction?.description, "HyperOne");
    assertStrictEqual(simResult.transaction?.type, "expense");
    console.log("✓ Test 5: Full SMS simulation pipeline passed");
  }

  // Test 6: processIncomingSms deduplication guard
  {
    const msg = {
      originatingAddress: "NBE",
      body: "تم خصم 120.00 EGP من بطاقة عند Costa يوم 29/10/26",
    };
    const firstCall = await processIncomingSms(msg);
    assertStrictEqual(firstCall !== null, true, "First SMS event should be processed");
    const duplicateCall = await processIncomingSms(msg);
    assertStrictEqual(duplicateCall, null, "Duplicate SMS event within 8s window should be blocked");
    console.log("✓ Test 6: Foreground/Background deduplication guard passed");
  }

  console.log("\nAll smsService & native module unit tests passed successfully! 🎉\n");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = runSmsServiceTests();
}
