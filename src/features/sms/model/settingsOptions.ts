import { Ionicons } from "@expo/vector-icons";

import { SmsDetectorConfig, DEFAULT_SMS_CONFIG } from "../services/smsConfigService";

export type KeywordGroupKey = keyof Omit<SmsDetectorConfig, "ignoreAtmWithdrawals">;
export interface GroupConfig {
  key: KeywordGroupKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  defaultValues: string[];
}
export const GROUPS: GroupConfig[] = [
  {
    key: "bankSenders",
    title: "Bank Senders Whitelist",
    subtitle: "Incoming SMS from these senders trigger auto-detection",
    icon: "business-outline",
    placeholder: "e.g. CIB, NBE, FAWRY",
    defaultValues: DEFAULT_SMS_CONFIG.bankSenders,
  },
  {
    key: "incomeKeywords",
    title: "Income Keywords",
    subtitle: "Classifies detected transaction as Income when found",
    icon: "arrow-down-circle-outline",
    placeholder: "e.g. تحويل وارد, deposit, salary",
    defaultValues: DEFAULT_SMS_CONFIG.incomeKeywords,
  },
  {
    key: "expenseKeywords",
    title: "Expense Keywords",
    subtitle: "Classifies detected transaction as Expense when found",
    icon: "arrow-up-circle-outline",
    placeholder: "e.g. تم خصم, purchase, paid",
    defaultValues: DEFAULT_SMS_CONFIG.expenseKeywords,
  },
  {
    key: "atmKeywords",
    title: "ATM & Withdrawal Patterns",
    subtitle: "Patterns identifying cash withdrawals from ATMs",
    icon: "card-outline",
    placeholder: "e.g. ATM, سحب نقدي, cash withdrawal",
    defaultValues: DEFAULT_SMS_CONFIG.atmKeywords,
  },
  {
    key: "currencyKeywords",
    title: "Recognized Currencies",
    subtitle: "Currency symbols and tags recognized for amount extraction",
    icon: "cash-outline",
    placeholder: "e.g. EGP, USD, جم, LE",
    defaultValues: DEFAULT_SMS_CONFIG.currencyKeywords,
  },
];
export const SAMPLE_MESSAGES = [
  {
    label: "Card Purchase (NBE)",
    sender: "BANK-ALAHLY",
    body: "تم خصم 450.50 EGP من بطاقة ماستركارد عند CARREFOUR يوم 22/10/26 المتاح 12500.00 EGP",
  },
  {
    label: "InstaPay Transfer (CIB)",
    sender: "CIB",
    body: "تم تنفيذ تحويل لحظي من حسابكم بمبلغ 1200.00 جم إلى AHMED MOHAMED رقم مرجعي 987654",
  },
  {
    label: "Salary / Income (BM)",
    sender: "BANQUEMISR",
    body: "تم إضافة تحويل لحظي لحسابكم بمبلغ 8500.00 جم من SALARY رقم مرجعي 112233",
  },
  {
    label: "ATM Cash Withdrawal",
    sender: "NBE",
    body: "عملية سحب نقدي بمبلغ 2000.00 EGP من ماكينة الصراف الآلي ATM186 يوم 22/10/26",
  },
];
