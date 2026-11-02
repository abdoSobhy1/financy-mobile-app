import assert from "node:assert/strict";
import { ToastHosts } from "../../src/shared/ui/toastHosts";

const hosts = new ToastHosts();
const closeRoot = hosts.register("root", 0);
assert.equal(hosts.getActive(), "root");
const closeModal = hosts.register("modal", 1);
assert.equal(hosts.getActive(), "modal", "Only the visible modal should own rendering and timers");
const closeNestedModal = hosts.register("nested", 1);
assert.equal(hosts.getActive(), "nested");
closeNestedModal();
assert.equal(hosts.getActive(), "modal");
closeModal();
assert.equal(hosts.getActive(), "root", "Closing a modal returns ownership to the main overlay");
closeRoot();
assert.equal(hosts.getActive(), null);
console.log("Toast overlay ownership tests passed.");
