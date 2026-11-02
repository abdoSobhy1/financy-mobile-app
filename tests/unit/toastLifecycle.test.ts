import assert from "node:assert/strict";
import Module from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

// Exercise the component's actual dismissal handlers and effect cleanup without
// native UI dependencies or real animation delays.
const cleanups: Array<(() => void) | void> = [];
const animations: Array<{ start: (callback?: (result: { finished: boolean }) => void) => void; stop: () => void; complete: () => void }> = [];
let hookState: any[] = [];
const react = {
  createElement: (type: any, props: any, ...children: any[]) => ({ type, props: { ...props, children } }),
  useMemo: (factory: () => any) => factory(),
  useRef: (value: any) => ({ current: value }),
  useCallback: (callback: any) => callback,
  useState: () => [hookState, (update: any) => { hookState = typeof update === "function" ? update(hookState) : update; }],
  useEffect: (effect: () => (() => void) | void) => { cleanups.push(effect()); },
};
const native = {
  View: "View", Text: "Text", TouchableOpacity: "TouchableOpacity",
  Platform: { OS: "android" }, StatusBar: { currentHeight: 24 },
  StyleSheet: { create: (styles: any) => styles, absoluteFill: {} },
  Animated: {
    View: "AnimatedView",
    Value: class { constructor(_value: number) {} },
    spring: () => ({}), timing: () => ({}),
    parallel: () => {
      let callback: ((result: { finished: boolean }) => void) | undefined;
      const animation = {
        start: (next?: typeof callback) => { callback = next; },
        stop: () => callback?.({ finished: false }),
        complete: () => callback?.({ finished: true }),
      };
      animations.push(animation);
      return animation;
    },
  },
};
const loader = Module as any;
const originalLoad = loader._load;
loader._load = function(request: string, parent: any, isMain: boolean) {
  if (request === "react") return react;
  if (request === "react-native") return native;
  if (request === "expo-linear-gradient") return { LinearGradient: "LinearGradient" };
  if (request === "@expo/vector-icons") return { Ionicons: "Ionicons" };
  if (request === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ top: 24 }) };
  if (request.endsWith("/theme/ThemeProvider")) return { useAppTheme: () => ({ colors: {} }) };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  const filename = resolve(__dirname, "../../src/shared/ui/Toast.tsx");
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const componentModule = new loader(filename, module);
  componentModule.filename = filename;
  componentModule.paths = module.paths;
  componentModule._compile(compiled.outputText, filename);
  const { Toast, ToastContainer } = componentModule.exports;
  const dismissed: string[] = [];
  const callbacks: string[] = [];
  const message = (id: string) => ({ id, message: id, type: "info", onDismiss: () => callbacks.push(id) });
  const props = (id: string) => ({ toast: message(id), onDismiss: (removed: string) => dismissed.push(removed), index: 0, inStack: true });
  const findTouch = (node: any): any => {
    if (!node || typeof node !== "object") return undefined;
    if (node.type === "TouchableOpacity") return node;
    for (const child of node.props?.children ?? []) {
      const found = findTouch(child);
      if (found) return found;
    }
  };

  const oldCard = Toast(props("old"));
  findTouch(oldCard).props.onPress();
  const interruptedExit = animations[animations.length - 1];
  for (const cleanup of cleanups.splice(0)) cleanup?.();
  const newCard = Toast(props("new"));
  assert.equal(newCard.props.children[0].props.style[1].height, 56,
    "A single toast must not reserve space for an empty notification footer");
  interruptedExit.complete();
  assert.deepEqual(dismissed, [], "Interrupted/unmounted animations must not remove a toast");
  assert.deepEqual(callbacks, [], "Interrupted animations must not fire dismissal callbacks");
  findTouch(newCard).props.onPress();
  const newExit = animations[animations.length - 1];
  newExit.complete();
  assert.deepEqual(dismissed, ["new"], "Dismissing the front card removes only its own ID");
  assert.deepEqual(callbacks, ["new"]);
  findTouch(newCard).props.onPress();
  assert.deepEqual(dismissed, ["new"], "Repeated taps cannot dismiss the underlying toast");
  for (const cleanup of cleanups.splice(0)) cleanup?.();

  const background = Toast({ ...props("background"), index: 1 });
  assert.equal(background.props.pointerEvents, "none");
  findTouch(background).props.onPress();
  assert.deepEqual(dismissed, ["new"], "Covered cards cannot dismiss themselves or other cards");
  for (const cleanup of cleanups.splice(0)) cleanup?.();

  const stack = ToastContainer({ toasts: [message("new"), message("old"), message("older")], onDismiss: () => {} });
  const siblings = stack.props.children[0].props.children[0];
  assert.equal(siblings.length, 3);
  assert.ok(siblings.every((card: any) => card.type === Toast && card.props.toast.message),
    "Every layer must contain a real notification, so dismissing the front cannot reveal an empty card");
  assert.deepEqual(siblings.map((card: any) => card.props.index), [2, 1, 0]);
  assert.equal(siblings[2].props.toast.id, "new");
  assert.equal(siblings[2].props.pendingCount, 2);
  assert.ok(siblings.every((card: any) => card.props.stacked),
    "All cards in a stack need the same height so the rear edges remain visible");

  const hook = componentModule.exports.useToast();
  hook.showSuccess("Older notification");
  hook.showInfo("Newest notification");
  assert.equal(hookState.length, 2);
  assert.equal(hookState[0].message, "Newest notification");
  assert.ok(hookState.every((toast: any) => !toast.expiresAt),
    "Ordinary covered toasts must keep their own display time rather than expiring together");
  hook.dismissToast(hookState[0].id);
  assert.equal(hookState.length, 1);
  assert.equal(hookState[0].message, "Older notification");
  hook.showSuccess("3 more taps", 1500, undefined, "debug");
  const progressId = hookState[0].id;
  hook.showSuccess("2 more taps", 1500, undefined, "debug");
  assert.equal(hookState[0].id, progressId);
  assert.equal(hookState.filter((toast: any) => toast.replaceKey === "debug").length, 1);
  console.log("Toast lifecycle tests passed.");
} finally {
  for (const cleanup of cleanups) cleanup?.();
  loader._load = originalLoad;
}
