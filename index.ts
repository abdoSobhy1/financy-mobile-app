import { registerRootComponent } from "expo";
import { AppRegistry } from "react-native";

import App from "./App";

// Register Headless JS task for background SMS processing
AppRegistry.registerHeadlessTask("SmsHeadlessTask", () => require("./src/features/sms/services/smsBackground").default);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
