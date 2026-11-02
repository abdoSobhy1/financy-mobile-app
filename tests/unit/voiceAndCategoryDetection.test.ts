import assert from "assert";
import { detectCategory, parseVoiceInput } from "../../src/features/voice/services/voiceParser";

console.log("\nRunning voiceAndCategoryDetection unit tests...\n");

const categories = [
  { id: "cat_food", name: "طعام ومشروبات" },
  { id: "cat_cafe", name: "قهوة" },
  { id: "cat_fuel", name: "بنزين ومحروقات" },
  { id: "cat_groceries", name: "سوبرماركت" },
  { id: "cat_entertainment", name: "رفاهية" },
  { id: "cat_salary", name: "راتب شهري" },
];

const mockPastTransactions = [
  { description: "Costa Coffee", categoryId: "cat_cafe" },
  { description: "كارفور المعادي", categoryId: "cat_groceries" },
  { description: "Starbucks Drive Thru", categoryId: "cat_cafe" },
];

// Test 1: Full name category match
const match1 = detectCategory("صرفت 50 جنيه قهوة", categories);
assert.strictEqual(match1, "cat_cafe", "Failed full name category match");
console.log("✓ Test 1: Full name category match passed");

// Test 2: Partial word category match
const match2 = detectCategory("شراء طعام سريع", categories);
assert.strictEqual(match2, "cat_food", "Failed partial word category match");
console.log("✓ Test 2: Partial word category match passed");

// Test 3: ML History matching
const match3 = detectCategory("فاتورة Costa", categories, mockPastTransactions);
assert.strictEqual(match3, "cat_cafe", "Failed ML history category match");
console.log("✓ Test 3: ML History matching based on past transactions passed");

// Test 4: Dictionary fallback matching
const match4 = detectCategory("اندومي وشيبسي", categories);
assert.strictEqual(match4, "cat_entertainment", "Failed dictionary fallback match");
console.log("✓ Test 4: Dictionary fallback category match passed");

// Test 5: Multi-transaction voice parsing
const multiVoice = "صرفت 50 جنيه قهوة و 120 جنيه سوبرماركت";
const parsed = parseVoiceInput(multiVoice, categories);
assert.strictEqual(parsed.length, 2, "Expected 2 transactions from multi-voice input");
assert.strictEqual(parsed[0].amount, 50, "First transaction amount mismatch");
assert.strictEqual(parsed[0].categoryId, "cat_cafe", "First transaction category mismatch");
assert.strictEqual(parsed[1].amount, 120, "Second transaction amount mismatch");
assert.strictEqual(parsed[1].categoryId, "cat_groceries", "Second transaction category mismatch");
console.log("✓ Test 5: Multi-transaction voice input parsing passed");

console.log("\nAll voiceAndCategoryDetection unit tests passed successfully! 🎙️✨\n");
