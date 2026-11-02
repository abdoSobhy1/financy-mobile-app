import assert from "node:assert/strict";
import { enqueueToast } from "../../src/shared/ui/toastQueue";

const message = (id: number) => ({ id, message: `Message ${id}`, type: "info" });
let queue = [message(1)];
assert.equal(enqueueToast(queue, message(1)), queue, "Repeated notifications must not extend the queue");
queue = enqueueToast(queue, { ...message(1), type: "error" });
assert.equal(queue.length, 2, "Different severities remain distinct");
queue = [message(1)];
for (let id = 2; id <= 20; id++) queue = enqueueToast(queue, message(id));
assert.deepEqual(queue.map((toast) => toast.id), [20, 19, 18, 17, 16],
  "New messages appear immediately at the front of the bounded stack");
queue = queue.filter((toast) => toast.id !== 20);
assert.deepEqual(queue.map((toast) => toast.id), [19, 18, 17, 16],
  "Dismissing the front toast preserves every remaining message");
queue = enqueueToast(queue, message(21));
assert.equal(queue[0].id, 21, "A new toast does not wait for the previous toast to dismiss");
queue = queue.filter((toast) => toast.id !== 19);
assert.equal(queue[0].id, 21, "A stale dismissal must not remove the newer toast");
const progress = [
  { ...message(30), message: "3 more taps", replaceKey: "debug", expiresAt: 2000 },
  { ...message(29), expiresAt: 1000 },
];
const updated = enqueueToast(progress,
  { ...message(31), message: "2 more taps", replaceKey: "debug", expiresAt: 3000 }, 1500);
assert.equal(updated.length, 1, "Progress updates replace their previous state and discard expired notifications");
assert.equal(updated[0].id, 30, "Updating progress preserves the mounted card for a smooth transition");
assert.equal(updated[0].message, "2 more taps");
assert.equal(updated[0].expiresAt, 3000);
console.log("Toast queue tests passed.");
