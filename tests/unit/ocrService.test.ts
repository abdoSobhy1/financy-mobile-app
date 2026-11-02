function assertStrictEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed! Expected: ${expected}, Got: ${actual}. ${message || ""}`);
  }
}

function assertTrue(actual: any, message?: string) {
  if (!actual) {
    throw new Error(`Assertion failed! Expected truthy, Got: ${actual}. ${message || ""}`);
  }
}

import {
  easternToWestern,
  parseAmount,
  parseReceiptDate,
  parseReceiptText,
} from "../../src/features/receipts/services/ocrService";
import { isReceiptMetadataOrTotal } from "../../src/infrastructure/ai/aiService";

console.log("Running ocrService unit tests...\n");

// Test 1: Eastern and Persian digit conversion
{
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  assertStrictEqual(easternToWestern(arabicDigits), "0123456789", "Arabic-indic digits conversion");
  assertStrictEqual(easternToWestern(persianDigits), "0123456789", "Persian/extended digits conversion");
  console.log("✓ Test 1: Eastern and Persian digit conversion passed");
}

// Test 2: Amount parser
{
  assertStrictEqual(parseAmount("10,000 EGP"), 10000, "10,000 EGP");
  assertStrictEqual(parseAmount("25,264.50"), 25264.5, "25,264.50");
  assertStrictEqual(parseAmount("۲۵۲۶۴ صافي"), 25264, "Arabic digits 25264");
  assertStrictEqual(parseAmount("1200.00"), 1200, "1200.00");
  console.log("✓ Test 2: Amount parsing passed");
}

// Test 3: Date parser
{
  const arabicDate = parseReceiptDate("الثلاثاء / ۱۹ سبتمبر");
  assertTrue(arabicDate instanceof Date, "Arabic date parsed to Date");
  assertStrictEqual(arabicDate?.getMonth(), 8, "September is month 8 (0-indexed)");
  assertStrictEqual(arabicDate?.getDate(), 19, "Day is 19");

  const engDate = parseReceiptDate("23 Oct 2026 02:54 PM");
  assertTrue(engDate instanceof Date, "English date parsed to Date");
  assertStrictEqual(engDate?.getFullYear(), 2026, "Year 2026");
  assertStrictEqual(engDate?.getMonth(), 9, "October is month 9 (0-indexed)");
  assertStrictEqual(engDate?.getDate(), 23, "Day is 23");

  const shortEngDate = parseReceiptDate("Nov17'22 09:52PM");
  assertTrue(shortEngDate instanceof Date, "Nov17'22 parsed to Date");
  assertStrictEqual(shortEngDate?.getFullYear(), 2022, "Year 2022");
  assertStrictEqual(shortEngDate?.getMonth(), 10, "November is month 10");
  assertStrictEqual(shortEngDate?.getDate(), 17, "Day is 17");
  console.log("✓ Test 3: Date parsing passed");
}

// Test 4: InstaPay Slip parsing
{
  const instapayRaw = `تم التحويل بنجاح
10,000 EGP
إلى مصطفى عبدالسلام
mostafaabdelsalam999@instapay
MOSTAFA MOHAMED ABDE
من حساب
المرسل *** *** *** ****
01201725872
المرجع 206694360864
التاريخ: 23 Oct 2026 02:54 PM
مصاريف
0.00 EGP
POWERED BY IPN`;

  const result = parseReceiptText(instapayRaw);
  assertStrictEqual(result.isInstaPay, true, "Recognized as InstaPay");
  assertStrictEqual(result.amount, 10000, "Amount is 10,000");
  assertStrictEqual(Boolean(result.isMultiEntry), false, "InstaPay is single entry");
  assertTrue(result.description?.includes("MOSTAFA") || result.description?.includes("مصطف"), "Recipient extracted");
  assertTrue(result.date instanceof Date, "Date extracted");
  assertStrictEqual(result.date?.getDate(), 23, "Date day 23");
  console.log("✓ Test 4: InstaPay slip parsing passed");
}

// Test 5: Cosmetics Multi-item Receipt (Image 4 from user)
{
  const cosmeticReceipt = `Mostafa Hassan
Cosmatics
10391 فاتورة رقم
مشتريات فاتورة
الثلاثاء / ۱۹ سبتمبر
09:38:22 م
الاجمالي السعر الكمية الصنف
4579 4579 1 برفان سي بوزيشن اورجينال الاحمر
2740 2740 1 برفان فكتوريا سيكرت لافي
540 540 1 مزيل بيزلين رول اون ورد
590 590 1 سيلك لوشن اوريجنال جونسون
925 925 1 سيلك لوشن اوريجنال جونسون
770 385 2 كولاجين + فيتامين سي 300 مجم ميلودي
780 780 1 كريم بانثينول اورجينال
890 890 1 ماسك تفتيح وتوحيد اللون بوبانا
2450 2450 1 باليت كنتور بودر كاستيل
240 240 1 روج كاستيل سائل مات كيكو
245 245 1 بودرة اضاءة هايلايتر روز
2880 2880 1 سيروم حمض الهيالورونيك 2% + بي 5 ديسيم
570 570 1 غسول جل رغوي تنظيف عميق للبشرة
285 285 1 كريم اساس لومينوس سيلك كاستيل
1320 1320 1 مورد خدود وشفاه سائل بنفت
990 990 1 مسكرة بارادايس اكستاتيك لوريال باريس
55 55 1 ليفة وجه سيليكون تنظيف عميق
160 160 1 اسفنجة مكياج بيوتي بليندر
340 340 1 بودرة مضغوطة مات فيت مي ميبيلين
1240 1240 1 بلسم مرطب ومجدد للشعر التالف
1800 1800 1 زيت الارغان المغربي النقي
245 245 1 كونسيلر ايريسر ميبيلين
720 720 1 قلم تحديد حواجب بريسايز
480 480 1 احمر شفاه غير لامع سوبر ستاي
25264 صافي`;

  const result = parseReceiptText(cosmeticReceipt);
  assertStrictEqual(result.isMultiEntry, true, "Is multi-entry");
  assertStrictEqual(result.amount, 25264, "Total net amount is 25,264");
  assertStrictEqual(result.items?.length, 24, "All 24 items detected");
  assertStrictEqual(result.itemsSum, 25834, "Items sum before discount is 25,834");
  assertStrictEqual(result.items?.[0].price, 4579, "First item total 4579");
  assertTrue(result.items?.[0].name.includes("برفان"), "First item name includes برفان");
  assertStrictEqual(result.description, "Mostafa Hassan", "Store name extracted");
  console.log("✓ Test 5: Cosmetics multi-item receipt passed");
}

// Test 6: Restaurant Multi-item POS Receipt (media_1792785427155_b02b3fce.png)
{
  const restaurantReceipt = `Tbl 66/1 Chk 850 Gst 14
Nov17'22 09:52PM
5 Beef Carpaccio 1200.00
2 Golden Ottoman 5500.00
2 Golden Sirt 3 4500.00
GOLDN SIRT 300GR
1 OPEN FOOD 1125.00
2 Golden Istanbul 9000.00
11 1 Lokum 3905.00
4 Onion Flower 320.00
4 French Fries 180.00
15 Golden Baklava 5850.00
1 Heineken 55.00`;

  const result = parseReceiptText(restaurantReceipt);
  assertStrictEqual(result.isMultiEntry, true, "Is multi-entry");
  assertStrictEqual(result.amount, 31635, "Total amount computed from items sum is 31,635");
  assertStrictEqual(result.items?.length, 10, "All 10 items detected");
  assertStrictEqual(result.itemsSum, 31635, "Items sum is 31,635");

  // Check Item 1: 5 Beef Carpaccio 1200.00 (Qty=5, Name=Beef Carpaccio, Price=1200, UnitPrice=240)
  const item1 = result.items?.[0];
  assertStrictEqual(item1?.name, "Beef Carpaccio", "Item 1 name");
  assertStrictEqual(item1?.quantity, 5, "Item 1 quantity");
  assertStrictEqual(item1?.price, 1200, "Item 1 total price");
  assertStrictEqual(item1?.unitPrice, 240, "Item 1 unit price");

  // Check Item 3 with digit in name: 2 Golden Sirt 3 4500.00 (Qty=2, Name=Golden Sirt 3, Price=4500)
  const item3 = result.items?.[2];
  assertStrictEqual(item3?.name, "Golden Sirt 3", "Item 3 name with inner number preserved");
  assertStrictEqual(item3?.quantity, 2, "Item 3 quantity");
  assertStrictEqual(item3?.price, 4500, "Item 3 price");
  assertStrictEqual(item3?.unitPrice, 2250, "Item 3 unit price");

  // Check Item 6 with seat/course prefix: 11 1 Lokum 3905.00 (Seat=11, Qty=1, Name=Lokum, Price=3905)
  const item6 = result.items?.[5];
  assertStrictEqual(item6?.name, "Lokum", "Item 6 name");
  assertStrictEqual(item6?.quantity, 1, "Item 6 quantity");
  assertStrictEqual(item6?.price, 3905, "Item 6 price");

  // Check Item 9 with 2-digit quantity: 15 Golden Baklava 5850.00 (Qty=15, Price=5850, UnitPrice=390)
  const item9 = result.items?.[8];
  assertStrictEqual(item9?.name, "Golden Baklava", "Item 9 name");
  assertStrictEqual(item9?.quantity, 15, "Item 9 quantity is 15");
  assertStrictEqual(item9?.price, 5850, "Item 9 price");
  assertStrictEqual(item9?.unitPrice, 390, "Item 9 unit price (5850 / 15)");

  // Check date parsed: Nov17'22
  assertStrictEqual(result.date?.getFullYear(), 2022, "Year 2022");
  assertStrictEqual(result.date?.getMonth(), 10, "Month 10 (November)");
  assertStrictEqual(result.date?.getDate(), 17, "Day 17");

  console.log("✓ Test 6: Restaurant multi-item POS receipt passed");
}

// Test 7: Exclusion of Totals, Subtotals, Receipt Numbers, and Metadata from Items
{
  // 1. Check isReceiptMetadataOrTotal classification
  assertTrue(isReceiptMetadataOrTotal("Total 150.00"), "Total excluded");
  assertTrue(isReceiptMetadataOrTotal("Grand Total: 250"), "Grand total excluded");
  assertTrue(isReceiptMetadataOrTotal("Subtotal"), "Subtotal excluded");
  assertTrue(isReceiptMetadataOrTotal("المجموع: 350"), "Arabic total excluded");
  assertTrue(isReceiptMetadataOrTotal("الإجمالي"), "Arabic grand total excluded");
  assertTrue(isReceiptMetadataOrTotal("الصافي 400"), "Arabic net total excluded");
  assertTrue(isReceiptMetadataOrTotal("Receipt # 12049"), "Receipt number excluded");
  assertTrue(isReceiptMetadataOrTotal("Invoice # 9872"), "Invoice number excluded");
  assertTrue(isReceiptMetadataOrTotal("رقم الفاتورة: 104"), "Arabic invoice number excluded");
  assertTrue(isReceiptMetadataOrTotal("فاتورة رقم 202"), "Arabic bill number excluded");
  assertTrue(isReceiptMetadataOrTotal("VAT 14%"), "VAT excluded");
  assertTrue(isReceiptMetadataOrTotal("Cash: 500"), "Cash payment excluded");
  assertTrue(isReceiptMetadataOrTotal("Visa"), "Visa payment excluded");
  assertTrue(isReceiptMetadataOrTotal("Table 12"), "Table number excluded");
  assertTrue(isReceiptMetadataOrTotal("Thank you for your visit"), "Thank you greeting excluded");

  // Legitimate products should NEVER be excluded
  assertStrictEqual(isReceiptMetadataOrTotal("Milk 1L"), false, "Milk 1L is a valid product");
  assertStrictEqual(isReceiptMetadataOrTotal("Golden Sirt 3"), false, "Golden Sirt 3 is a valid product");
  assertStrictEqual(isReceiptMetadataOrTotal("Latte Large"), false, "Latte Large is a valid product");
  assertStrictEqual(isReceiptMetadataOrTotal("برفان سي بوزيشن"), false, "Arabic perfume is a valid product");

  // 2. Receipt containing metadata and total lines
  const receiptWithTotalAndMeta = `Supermarket Express
Date: 2026-10-29
Receipt # 99482
Cashier: Ahmed
1 Milk 1L 35.00
2 Bread 20.00
1 Cheese 45.00
Subtotal 100.00
VAT 14.00
Total 114.00
Cash 150.00
Change 36.00
Thank you for shopping with us!`;

  const parsed = parseReceiptText(receiptWithTotalAndMeta);
  // Items must contain ONLY the 3 purchased products: Milk, Bread, Cheese
  assertStrictEqual(parsed.items?.length, 3, "Only the 3 real items extracted, not total or receipt #");
  assertStrictEqual(parsed.items?.[0].name, "Milk 1L", "First item is Milk 1L");
  assertStrictEqual(parsed.items?.[1].name, "Bread", "Second item is Bread");
  assertStrictEqual(parsed.items?.[2].name, "Cheese", "Third item is Cheese");
  assertStrictEqual(parsed.itemsSum, 100, "Items sum is exactly 35 + 20 + 45 = 100");

  console.log("✓ Test 7: Exclusion of Totals, Subtotals, Receipt Numbers, and Metadata from Items passed");
}

// Test 8: Commercial Invoice / Delivery Slip with Order Numbers, Timestamps, and Tax Metadata
{
  // 1. Verify metadata exclusions
  assertTrue(isReceiptMetadataOrTotal("اذن صرف رقم / 48683612"), "Order slip number excluded");
  assertTrue(isReceiptMetadataOrTotal("اذن صرف رقم 48683612"), "Order slip excluded");
  assertTrue(isReceiptMetadataOrTotal("أمر توريد رقم 98124"), "Purchase order excluded");
  assertTrue(isReceiptMetadataOrTotal("10:37:25 AM 2012"), "Timestamp excluded");
  assertTrue(isReceiptMetadataOrTotal("تاريخ الطباعة: 20/12/2024"), "Print date excluded");
  assertTrue(isReceiptMetadataOrTotal("السجل التجاري: 12345"), "Commercial registry excluded");
  assertTrue(isReceiptMetadataOrTotal("الرقم الضريبي: 987654321"), "Tax registration excluded");
  assertTrue(isReceiptMetadataOrTotal("مخزن: المعرض الرئيسي"), "Warehouse excluded");
  assertTrue(isReceiptMetadataOrTotal("مندوب المبيعات: محمد"), "Sales rep excluded");
  assertTrue(isReceiptMetadataOrTotal("Order # 882910"), "English order number excluded");
  assertTrue(isReceiptMetadataOrTotal("Dispatch Slip: 9912"), "Dispatch slip excluded");

  // 2. Full invoice text containing slip numbers, timestamps, items, discount, and net total
  const commercialInvoiceRaw = `شركة النصر للتجارة
سجل تجاري: 98765
الرقم الضريبي: 123-456-789
اذن صرف رقم / 48683612
تاريخ الطباعة: 20/12/2024 10:37:25 AM
مخزن: المعرض الرئيسي
الصنف الكمية السعر الاجمالي
سيراميك ارضيات سيلفر 35.64 397 14149.08
بورسلين حوائط مارفيل 41.76 498 20796.48
سيراميك رمادي 11.28 459.24 5180.23
اجمالي الفاتورة 40125.79
خصم 9127.00
صافي الفاتورة 30989.00
شكرا لتعاملكم معنا`;

  const parsed = parseReceiptText(commercialInvoiceRaw);

  // Must detect only the 3 actual items, NOT the order slip number 48683612 or timestamps!
  assertStrictEqual(parsed.items?.length, 3, "Only the 3 tile items extracted");
  assertStrictEqual(parsed.items?.[0].name, "سيراميك ارضيات سيلفر", "Item 1 name");
  assertStrictEqual(parsed.items?.[1].name, "بورسلين حوائط مارفيل", "Item 2 name");
  assertStrictEqual(parsed.items?.[2].name, "سيراميك رمادي", "Item 3 name");

  // Totals must not be $48 million!
  assertStrictEqual(parsed.amount, 30989, "Grand total net amount is 30,989, NOT 48 million!");
  assertStrictEqual(parsed.discount, 9127, "Discount is 9,127");

  console.log("✓ Test 8: Commercial invoice with order slips and timestamps passed");
}

console.log("\nAll ocrService unit tests passed successfully! 🎉\n");
