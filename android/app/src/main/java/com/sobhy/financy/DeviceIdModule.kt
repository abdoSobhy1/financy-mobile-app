package com.sobhy.financy

import android.provider.Settings
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class DeviceIdModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DeviceIdModule"

  @ReactMethod
  fun getAndroidId(promise: Promise) {
    try {
      val androidId = Settings.Secure.getString(
        reactContext.contentResolver,
        Settings.Secure.ANDROID_ID
      )
      promise.resolve(androidId ?: "")
    } catch (e: Exception) {
      promise.reject("ERR_ANDROID_ID", e)
    }
  }
}

class DeviceIdPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(DeviceIdModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
