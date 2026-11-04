package com.fieldforce

import android.annotation.SuppressLint
import android.app.AppOpsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/**
 * ================================================================
 * OS-LEVEL MOCK LOCATION DETECTOR
 * ================================================================
 * Yeh module 4 OS-level checks karta hai — browser yeh kabhi nahi
 * kar sakta:
 *
 * 1. AppOpsManager OP_MOCK_LOCATION — kaunsi app ko "Select mock
 *    location app" permission di gayi hai (Developer Options).
 *    Har fake GPS app ko yeh grant chahiye hota hai injection ke liye.
 * 2. Known fake GPS app install scan — 30+ known package names.
 * 3. Developer Options + ADB enabled check.
 * 4. Root detection (su binaries, Magisk files).
 *
 * Output ek JSON report hai jo JS side fakeLocationDetector.js use
 * karta hai.
 * ================================================================
 */
class MockLocationDetectorModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MockLocationDetector"

  // Known fake GPS app ke package prefixes
  private val fakeGpsPackages = listOf(
    "com.blogspot.newappavoids",          // Fake GPS Location Spoofer / Joystick
    "com.theappninjas.fakegpsjoystick",   // Fake GPS Joystick
    "com.theappninjas.gpsjoystick",
    "com.incorporateapps.fakegps_fre",    // Fake GPS (IncorporateApps)
    "com.incorporateapps.fakegps_route",
    "com.gsmartstudio.fakegps",
    "com.ea.locationchanger",
    "net.whatslocation.android",
    "ru.gavrilov.fakenumber",
    "com.lkr.fakemap",
    "com.tih.showhideselectedappicon",
    "air.com.ssd.androidlocation",
    "com.mesalabs.mocklocation",
    "com.justharvi.fakegps",
    "com.yukulart.locationchanger",
    "com.lphta.mockgpswithjoystick",
    "com.android.mocklocation",
    "com.hyper innovations"               // (whitespace-safe match hoga)
  )

  private val fakeGpsKeywords = listOf(
    "fakegps", "fake_gps", "fake.gps", "fakedlocation", "fakelocation",
    "ffgps", "locationhacker", "gpscheat", "mockgps", "gpsspoofer"
  )

  // ── MAIN REPORT ────────────────────────────────────────────────
  @ReactMethod
  fun getFullReport(promise: com.facebook.react.bridge.Promise) {
    try {
      val ctx = reactContext
      val map = Arguments.createMap()

      // Runtime device info
      map.putString("deviceId", Settings.Secure.getString(
        ctx.contentResolver, Settings.Secure.ANDROID_ID
      ))
      map.putString("androidVersion", Build.VERSION.RELEASE)
      map.putInt("sdkInt", Build.VERSION.SDK_INT)
      map.putString("deviceModel", Build.MODEL)

      // ── CHECK 1: AppOps se mock location grant wali app pakdo ──
      val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
      val pm = ctx.packageManager
      var mockGranted: String? = null
      val fakeApps = Arguments.createArray()
      var suspiciousCount = 0

      if (ops != null) {
        val packages = pm.getInstalledPackages(0)
        for (app in packages) {
          val pkg = app.packageName ?: continue
          try {
            val uid = app.applicationInfo?.uid ?: continue
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
              // OP_MOCK_LOCATION constant newer SDKs se remove ho chuka —
              // string form use karte hain (same op ka naam hai)
              ops.unsafeCheckOpNoThrow(
                "android:mock_location", uid, pkg
              )
            } else {
              @Suppress("DEPRECATION")
              ops.checkOpNoThrow(
                "android:mock_location", uid, pkg
              )
            }
            if (mode == AppOpsManager.MODE_ALLOWED) {
              // Yeh app ko mock location grant mila hai!
              if (mockGranted == null) mockGranted = pkg
            }
          } catch (_: Exception) {
          }
          if (isFakeGpsPackage(pkg)) {
            fakeApps.pushString(pkg)
            suspiciousCount++
          }
        }
      }

      map.putString("mockGrantedPackage", mockGranted)
      map.putBoolean("mockGranted", mockGranted != null)
      map.putArray("installedFakeGpsApps", fakeApps)
      map.putInt("fakeGpsAppCount", suspiciousCount)

      // ── CHECK 3: Developer options + ADB ──
      val devMode = try {
        Settings.Global.getInt(
          ctx.contentResolver,
          Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0
        ) == 1
      } catch (_: Exception) { false }

      val adbEnabled = try {
        Settings.Global.getInt(
          ctx.contentResolver,
          Settings.Global.ADB_ENABLED, 0
        ) == 1
      } catch (_: Exception) { false }

      map.putBoolean("developerModeEnabled", devMode)
      map.putBoolean("adbEnabled", adbEnabled)

      // ── CHECK 4: Root detect ──
      val rooted = checkRooted()
      map.putBoolean("rooted", rooted)

      // ── FINAL:.Block status ──
      val shouldBlock = mockGranted != null || suspiciousCount > 0 || rooted
      map.putBoolean("shouldBlock", shouldBlock)
      map.putString("blockReason", when {
        mockGranted != null -> "Mock location app enabled: $mockGranted"
        suspiciousCount > 0 -> "Fake GPS app installed: $suspiciousCount"
        rooted -> "Rooted device — Manipulate ho sakta hai"
        else -> ""
      })
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("DETECT_ERROR", e.message, e)
    }
  }

  // ── Location provider se mock flag nikalo ─────────────────────
  // (react-native-geolocation-service service `mocked: true` bhi
  // degi — yeh backup hai ager geolocation lib missing ho)
  @SuppressLint("MissingPermission")
  @ReactMethod
  fun isLastLocationMocked(promise: Promise) {
    try {
      val lm = reactContext.getSystemService(Context.LOCATION_SERVICE)
        as? android.location.LocationManager ?: return promise.resolve(null)
      if (lm.allProviders.isEmpty()) return promise.resolve(null)

      val provider = if (lm.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER))
        android.location.LocationManager.GPS_PROVIDER else "passive"
      val loc = lm.getLastKnownLocation(provider) ?: return promise.resolve(null)

      val isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        loc.isMock
      } else {
        @Suppress("DEPRECATION")
        loc.isFromMockProvider
      }

      val map = Arguments.createMap()
      map.putBoolean("isMock", isMock)
      map.putDouble("lat", loc.latitude)
      map.putDouble("lng", loc.longitude)
      map.putDouble("accuracy", loc.accuracy.toDouble())
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("LOCATION_ERROR", e.message, e)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  private fun isFakeGpsPackage(pkg: String): Boolean {
    val lower = pkg.lowercase().replace(" ", "")
    if (fakeGpsPackages.any { lower.startsWith(it.lowercase().replace(" ", "")) })
      return true
    return fakeGpsKeywords.any { lower.contains(it) }
  }

  private fun checkRooted(): Boolean {
    val paths = listOf(
      "/system/bin/su", "/system/xbin/su", "/sbin/su",
      "/system/sd/xbin/su", "/data/local/xbin/su",
      "/data/local/bin/su", "/data/local/su"
    )
    if (paths.any { File(it).exists() }) return true
    // Magisk files
    if (File("/data/adb/magisk/").exists()) return true
    if (File("/sbin/.magisk/").exists()) return true

    // Test-keys check (custom ROM without root bhi ho sakta hai)
    return try {
      Build.TAGS?.contains("test-keys") == true
    } catch (_: Exception) { false }
  }
}
