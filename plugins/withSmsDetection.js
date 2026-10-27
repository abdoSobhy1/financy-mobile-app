const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SMS_RECEIVER_KT = `package com.sobhy.financy

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Telephony
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context?, intent: Intent?) {
    if (context == null || intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
      return
    }

    try {
      val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
      if (messages.isNullOrEmpty()) return

      // Group multi-part SMS segments by sender so Arabic/long messages stay intact
      val grouped = LinkedHashMap<String, Pair<StringBuilder, Long>>()
      for (sms in messages) {
        if (sms == null) continue
        val sender = sms.displayOriginatingAddress ?: sms.originatingAddress ?: continue
        val bodyPart = sms.displayMessageBody ?: sms.messageBody ?: ""
        val timestamp = sms.timestampMillis

        val existing = grouped[sender]
        if (existing != null) {
          existing.first.append(bodyPart)
        } else {
          grouped[sender] = Pair(StringBuilder(bodyPart), timestamp)
        }
      }

      for ((sender, pair) in grouped) {
        val fullBody = pair.first.toString()
        val timestamp = pair.second
        if (fullBody.isBlank()) continue

        val bundle = Bundle().apply {
          putString("originatingAddress", sender)
          putString("body", fullBody)
          putDouble("timestamp", timestamp.toDouble())
        }

        // Also emit foreground event if ReactContext is currently active
        try {
          val app = context.applicationContext as? ReactApplication
          val reactContext = app?.reactHost?.currentReactContext
          if (reactContext != null && reactContext.hasActiveReactInstance()) {
            val map = Arguments.fromBundle(bundle)
            reactContext
              .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
              .emit("onSMSReceived", map)
          }
        } catch (e: Exception) {
          Log.w("SmsReceiver", "Could not emit foreground SMS event: \${e.message}")
        }

        // Start HeadlessJS service, falling back to goAsync() + HeadlessJsTaskContext on Android 12+ background restrictions
        try {
          val serviceIntent = Intent(context, SmsHeadlessTaskService::class.java).apply {
            putExtras(bundle)
          }
          context.startService(serviceIntent)
          HeadlessJsTaskService.acquireWakeLockNow(context)
        } catch (e: Exception) {
          Log.w("SmsReceiver", "startService blocked in background, falling back to goAsync: \${e.message}")
          runHeadlessTaskViaGoAsync(context, bundle)
        }
      }
    } catch (e: Exception) {
      Log.e("SmsReceiver", "Error receiving SMS", e)
    }
  }

  private fun runHeadlessTaskViaGoAsync(context: Context, bundle: Bundle) {
    val pendingResult = try {
      goAsync()
    } catch (e: Exception) {
      null
    }

    try {
      HeadlessJsTaskService.acquireWakeLockNow(context.applicationContext)
    } catch (_: Exception) {}

    val app = context.applicationContext as? ReactApplication
    val reactHost = app?.reactHost
    if (reactHost == null) {
      try {
        pendingResult?.finish()
      } catch (_: Exception) {}
      return
    }

    UiThreadUtil.runOnUiThread {
      val currentContext = reactHost.currentReactContext
      if (currentContext != null) {
        startTaskOnContext(currentContext, bundle, pendingResult)
      } else {
        val listener = object : ReactInstanceEventListener {
          override fun onReactContextInitialized(reactContext: ReactContext) {
            reactHost.removeReactInstanceEventListener(this)
            startTaskOnContext(reactContext, bundle, pendingResult)
          }
        }
        reactHost.addReactInstanceEventListener(listener)
        reactHost.start()
      }
    }
  }

  private fun startTaskOnContext(
    reactContext: ReactContext,
    bundle: Bundle,
    pendingResult: PendingResult?
  ) {
    try {
      val taskConfig = HeadlessJsTaskConfig(
        "SmsHeadlessTask",
        Arguments.fromBundle(bundle),
        15000,
        true
      )
      val headlessJsTaskContext = HeadlessJsTaskContext.getInstance(reactContext)
      var targetTaskId = -1
      val taskListener = object : HeadlessJsTaskEventListener {
        override fun onHeadlessJsTaskStart(taskId: Int) {}
        override fun onHeadlessJsTaskFinish(taskId: Int) {
          if (taskId == targetTaskId) {
            headlessJsTaskContext.removeTaskEventListener(this)
            try {
              pendingResult?.finish()
            } catch (_: Exception) {}
          }
        }
      }
      headlessJsTaskContext.addTaskEventListener(taskListener)
      UiThreadUtil.runOnUiThread {
        try {
          targetTaskId = headlessJsTaskContext.startTask(taskConfig)
        } catch (e: Exception) {
          Log.e("SmsReceiver", "Failed to start HeadlessJsTask", e)
          headlessJsTaskContext.removeTaskEventListener(taskListener)
          try {
            pendingResult?.finish()
          } catch (_: Exception) {}
        }
      }
    } catch (e: Exception) {
      Log.e("SmsReceiver", "Error in startTaskOnContext", e)
      try {
        pendingResult?.finish()
      } catch (_: Exception) {}
    }
  }
}
`;

const SMS_HEADLESS_SERVICE_KT = `package com.sobhy.financy

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class SmsHeadlessTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig(
      "SmsHeadlessTask",
      Arguments.fromBundle(extras),
      15000,
      true
    )
  }
}
`;

function withSmsDetection(config) {
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    const requiredPermissions = [
      "android.permission.READ_SMS",
      "android.permission.RECEIVE_SMS",
      "android.permission.WAKE_LOCK",
      "android.permission.POST_NOTIFICATIONS",
    ];

    for (const perm of requiredPermissions) {
      const exists = manifest["uses-permission"].some(
        (p) => p.$ && p.$["android:name"] === perm
      );
      if (!exists) {
        manifest["uses-permission"].push({
          $: { "android:name": perm },
        });
      }
    }

    const app = manifest.application?.[0];
    if (app) {
      if (!app.receiver) app.receiver = [];
      const hasReceiver = app.receiver.some(
        (r) => r.$ && r.$["android:name"] === ".SmsReceiver"
      );
      if (!hasReceiver) {
        app.receiver.push({
          $: {
            "android:name": ".SmsReceiver",
            "android:enabled": "true",
            "android:exported": "true",
            "android:permission": "android.permission.BROADCAST_SMS",
          },
          "intent-filter": [
            {
              $: { "android:priority": "999" },
              action: [
                {
                  $: {
                    "android:name": "android.provider.Telephony.SMS_RECEIVED",
                  },
                },
              ],
            },
          ],
        });
      }

      if (!app.service) app.service = [];
      const hasService = app.service.some(
        (s) => s.$ && s.$["android:name"] === ".SmsHeadlessTaskService"
      );
      if (!hasService) {
        app.service.push({
          $: {
            "android:name": ".SmsHeadlessTaskService",
            "android:enabled": "true",
            "android:exported": "false",
          },
        });
      }
    }

    return modConfig;
  });

  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const packagePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        "com",
        "sobhy",
        "financy"
      );
      fs.mkdirSync(packagePath, { recursive: true });
      fs.writeFileSync(
        path.join(packagePath, "SmsReceiver.kt"),
        SMS_RECEIVER_KT,
        "utf8"
      );
      fs.writeFileSync(
        path.join(packagePath, "SmsHeadlessTaskService.kt"),
        SMS_HEADLESS_SERVICE_KT,
        "utf8"
      );
      return modConfig;
    },
  ]);

  return config;
}

module.exports = withSmsDetection;
