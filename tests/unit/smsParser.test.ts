import {
  isBankSender,
  isAtmWithdrawal,
  parseSmsTransaction,
} from "../../src/features/sms/services/smsParser";
import { DEFAULT_SMS_CONFIG, SmsDetectorConfig } from "../../src/features/sms/services/smsConfigService";

function assertStrictEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed! Expected: ${expected}, Got: ${actual}. ${message || ""}`
    );
  }
}

console.log("\nRunning smsParser unit tests...\n");

// Test 1: Bank sender recognition
{
  assertStrictEqual(isBankSender("BANK-ALAHLY"), true, "Should recognize BANK-ALAHLY");
  assertStrictEqual(isBankSender("CIB"), true, "Should recognize CIB");
  assertStrictEqual(isBankSender("VodafoneCash"), true, "Should recognize Vodafone");
  assertStrictEqual(isBankSender("RandomFriend"), false, "Should reject non-bank sender");
  console.log("✓ Test 1: Bank sender recognition passed");
}

// Test 2: Card purchase expense parsing & balance stripping
{
  const sms =
    "تم خصم 450.50 EGP من بطاقة ماستركارد عند CARREFOUR يوم 22/10/26 المتاح 12500.00 EGP";
  const parsed = parseSmsTransaction(sms, [
    { id: "cat_groceries", name: "Groceries" },
    { id: "cat_carrefour", name: "Carrefour" },
  ]);
  assertStrictEqual(parsed !== null, true);
  assertStrictEqual(parsed?.amount, 450.5);
  assertStrictEqual(parsed?.type, "expense");
  assertStrictEqual(parsed?.description, "CARREFOUR");
  assertStrictEqual(parsed?.categoryId, "cat_carrefour");
  console.log("✓ Test 2: Card purchase expense parsing passed");
}

// Test 3: Outgoing InstaPay transfer expense & Arabic-Indic digits
{
  const sms =
    "تم تنفيذ تحويل لحظي من حسابكم بمبلغ ١٢٠٠.٥٠ جم إلى AHMED MOHAMED رقم مرجعي 987654";
  const parsed = parseSmsTransaction(sms);
  assertStrictEqual(parsed !== null, true);
  assertStrictEqual(parsed?.amount, 1200.5);
  assertStrictEqual(parsed?.type, "expense");
  assertStrictEqual(parsed?.description, "تحويل إلى: AHMED MOHAMED");
  console.log("✓ Test 3: Outgoing transfer with Arabic-Indic digits passed");
}

// Test 4: Incoming transfer (income) vs merchant name containing 'موارد'
{
  const incomeSms =
    "تم إضافة تحويل لحظي لحسابكم بمبلغ 8500.00 جم من SALARY رقم مرجعي 112233";
  const parsedIncome = parseSmsTransaction(incomeSms);
  assertStrictEqual(parsedIncome?.type, "income");
  assertStrictEqual(parsedIncome?.amount, 8500);
  assertStrictEqual(parsedIncome?.description, "من: SALARY");

  const expenseAtMawared =
    "تم خصم 320 EGP من بطاقة فيزا عند شركة موارد للتجارة يوم 22/10/26";
  const parsedExpense = parseSmsTransaction(expenseAtMawared);
  assertStrictEqual(
    parsedExpense?.type,
    "expense",
    "'موارد' should not falsely trigger 'وارد' income keyword"
  );
  assertStrictEqual(parsedExpense?.amount, 320);
  console.log("✓ Test 4: Income detection & 'موارد' false-positive prevention passed");
}

// Test 5: ATM cash withdrawal filtering & custom toggle
{
  const atmSms =
    "عملية سحب نقدي بمبلغ 2000.00 EGP من ماكينة الصراف الآلي ATM186 يوم 22/10/26";
  assertStrictEqual(isAtmWithdrawal(atmSms), true);
  assertStrictEqual(parseSmsTransaction(atmSms), null, "ATM withdrawal should be ignored by default");

  const customConfig: SmsDetectorConfig = {
    ...DEFAULT_SMS_CONFIG,
    ignoreAtmWithdrawals: false,
  };
  const parsedWhenEnabled = parseSmsTransaction(
    atmSms,
    [],
    undefined,
    undefined,
    customConfig
  );
  assertStrictEqual(parsedWhenEnabled !== null, true);
  assertStrictEqual(parsedWhenEnabled?.amount, 2000);
  console.log("✓ Test 5: ATM cash withdrawal filtering & custom toggle passed");
}

console.log("\nAll smsParser unit tests passed successfully! 🎉");
