// ================================================================
// EMPLOYEE HOME — web EmployeeHome.jsx ka full mobile port
// ================================================================
// Flow:
// 1. App open  → OS report (native module) — fake GPS check +
//                warning + admin ko silent report
// 2. Load data → attendance/today, tracking/active, routes/my,
//                checkin/today + offline state hydrate
// 3. Check-In  → native camera photo + GPS → /attendance/mark +
//                /tracking/start → GPS watch shuru
// 4. GPS tick  → fake detect → report | real → /tracking/update +
//                km counter
// 5. Shop In   → photo + GPS → /checkin (verified/warning)
// 6. Check-Out → photo → /attendance/mark + /tracking/end
// 7. Offline   → queue AsyncStorage, netinfo pe auto-sync
// ================================================================
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert as RNAlert, ScrollView, Image, Linking
} from "react-native";
import Geolocation from "react-native-geolocation-service";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { launchCamera } from "react-native-image-picker";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { GPS_UPDATE_INTERVAL } from "../../config";
import {
  detectFakeLocation, resetDetector, getOsStatusOnStart
} from "../../utils/fakeLocationDetector";
import { queueAction, getPending, getPendingCount } from "../../utils/offlineQueue";
import { syncPendingActions } from "../../utils/syncManager";
import { fmtTime, distKm } from "../../utils/date";
import { Card, Button, Toast, Loading, Badge, Confirm } from "../../ui/kit";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

// ── Helpers ──────────────────────────────────────────────────
const getGPS = (ms = 12000) => new Promise((res, rej) =>
  Geolocation.getCurrentPosition(
    p => res({
      lat: p.coords.latitude,
      lng: p.coords.longitude,
      accuracy: Math.round(p.coords.accuracy || 0)
    }),
    rej,
    { accuracy: { android: "high" }, enableHighAccuracy: true,
      timeout: ms, maximumAge: 0, showLocationDialog: true,
      forceRequestLocation: true }
  )
);

const requestLocationPermission = async () => {
  let result = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
  if (result !== RESULTS.GRANTED) {
    result = await request(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION);
  }
  return result === RESULTS.GRANTED;
};

const requestCameraPermission = async () => {
  const result = await request(PERMISSIONS.ANDROID.CAMERA);
  return result === RESULTS.GRANTED;
};

// Native camera → base64 data URI (backend validation isi format ko
// expect karta hai: data:image/jpeg;base64,...)
const capturePhoto = async () => {
  const ok = await requestCameraPermission();
  if (!ok) { RNAlert.alert("Permission", "Camera permission zaroori hai"); return null; }
  const res = await launchCamera({
    mediaType: "photo",
    quality: 0.5,
    maxWidth: 720,
    maxHeight: 720,
    includeBase64: true,
    cameraType: "front",
    saveToPhotos: false,
  });
  if (res.didCancel || !res.assets?.[0]?.base64) return null;
  return `data:image/jpeg;base64,${res.assets[0].base64}`;
};

const idMatch = (a, b) => String(a) === String(b);

// Google Maps link parser — "https://maps.google.com/?q=lat,lng" /
// "https://www.google.com/maps/@lat,lng,15z" / "!3dlat!4dlng"
export const parseGeoLink = (text) => {
  if (!text) return null;
  const patterns = [
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/, // plain "lat,lng"
  ];
  for (const re of patterns) {
    const m = String(text).match(re);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
};

export default function EmployeeHomeScreen() {
  const { user, actionLogout } = useAuth();

  const [attendance,    setAttendance]    = useState(null);
  const [session,       setSession]       = useState(null);
  const [myRoute,       setMyRoute]       = useState(null);
  const [todayCheckIns, setTodayCheckIns] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [actionMsg,     setActionMsg]     = useState("");
  const [toast,         setToast]         = useState({ msg: "", type: "success" });
  const [displayKm,     setDisplayKm]     = useState(0);
  const [tracking,      setTracking]      = useState(false);
  const [isOnline,      setIsOnline]      = useState(true);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [syncing,       setSyncing]       = useState(false);
  const [osWarning,     setOsWarning]     = useState(null);
  const [gpsStatus,     setGpsStatus]     = useState("");
  const [confirmOut,    setConfirmOut]    = useState(false);

  const watchRef     = useRef(null);
  const intervalRef  = useRef(null);
  const lastPosRef   = useRef(null);
  const totalKmRef   = useRef(0);
  const sessionIdRef = useRef(null);
  const toastRef     = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ msg: "", type: "success" }), 4000);
  };

  const refreshCount = async () => setPendingCount(await getPendingCount());

  // ── Fake location ko backend ko report karo ─────────────────
  const reportFake = useCallback(async (detection) => {
    if (detection.confidence === "REAL") return;
    try {
      await api.reportFakeLocation({
        sessionId: sessionIdRef.current,
        confidence: detection.confidence,
        reasons: detection.reasons,
        realLat: detection.realLat,
        realLng: detection.realLng,
        accuracy: detection.accuracy,
        speed: detection.speed,
        flagCount: detection.flagCount
      });
    } catch { /* silent — employee ko pata nahi chalega */ }
  }, []);

  // ── GPS watch ───────────────────────────────────────────────
  const stopGPS = () => {
    if (watchRef.current != null) { Geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setTracking(false);
    resetDetector();
  };

  const startGPS = async (sessionId) => {
    if (watchRef.current != null) return;
    setTracking(true);
    sessionIdRef.current = sessionId;

    const onPosition = (position) => {
      const detection = detectFakeLocation(position);

      if (detection.isFake || detection.confidence === "SUSPICIOUS") {
        // Server pe report bhejo (silently — employee ko pata nahi chalega)
        reportFake(detection);
        setGpsStatus(`🚨 ${detection.confidence}: ${detection.reasons[0]}`);
      } else {
        setGpsStatus(`✅ Real GPS (${detection.accuracy}m)`);
      }

      const lat = detection.realLat, lng = detection.realLng;
      if (lat == null || lng == null) return;

      // KM counter
      if (lastPosRef.current) {
        const d = distKm(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng);
        if (d > 0.01 && d < 2) {
          totalKmRef.current += d;
          setDisplayKm(Math.round(totalKmRef.current * 100) / 100);
        }
      }
      lastPosRef.current = { lat, lng, accuracy: Math.round(detection.accuracy || 0) };
    };

    watchRef.current = Geolocation.watchPosition(
      onPosition,
      () => setGpsStatus("❌ GPS signal nahi mil raha"),
      {
        accuracy: { android: "high" },
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: GPS_UPDATE_INTERVAL * 1000,
        fastestInterval: 5000,
        showLocationDialog: true,
        forceRequestLocation: true
      }
    );

    // Har 30 sec server/queue pe bhejo
    intervalRef.current = setInterval(async () => {
      if (!lastPosRef.current || !sessionIdRef.current) return;
      const a = lastPosRef.current;
      if (isOnline) {
        const res = await api.updateTracking(sessionIdRef.current, a.lat, a.lng, a.accuracy);
        if (!res.ok) { await queueAction({ type: "TRACKING_UPDATE", ...a, sessionId: sessionIdRef.current }); await refreshCount(); }
      } else {
        await queueAction({ type: "TRACKING_UPDATE", ...a, sessionId: sessionIdRef.current });
        await refreshCount();
      }
    }, 30000);
  };

  // ── Offline state hydrate (app band hone pe session rebuild) ─
  const hydrateOfflineState = async () => {
    try {
      const actions = await getPending();
      const lastOf = (type) => [...actions].reverse().find(a => a.type === type);

      const checkin  = lastOf("ATTENDANCE_CHECKIN");
      const checkout = lastOf("ATTENDANCE_CHECKOUT");
      if (checkin && !checkout) {
        setAttendance(prev => prev || { checkInTime: new Date(checkin.queuedAt), offline: true });
      }
      if (checkin && checkout) {
        setAttendance(prev => ({
          ...(prev || {}),
          checkInTime: prev?.checkInTime || new Date(checkin.queuedAt),
          checkOutTime: prev?.checkOutTime || new Date(checkout.queuedAt),
          offline: true
        }));
      }

      const start = lastOf("TRACKING_START");
      const end   = lastOf("TRACKING_END");
      if (start && !end) {
        const fakeId = start.offlineSessionId || `offline_${start.id}`;
        setSession(prev => prev || { _id: fakeId, startTime: new Date(start.queuedAt), offline: true });
        if (!sessionIdRef.current) sessionIdRef.current = fakeId;
        if (watchRef.current == null) await startGPS(sessionIdRef.current);
      }
    } catch { /* ignore */ }
  };

  // ── Load data ───────────────────────────────────────────────
  const loadAll = async () => {
    try {
      const [attR, sesR, routeR, ciR] = await Promise.allSettled([
        api.todayAttendance(),
        api.activeTracking(),
        api.myRoute(),
        api.todayCheckins()
      ]);
      if (attR.status === "fulfilled" && attR.value.ok) setAttendance(attR.value.data);
      if (routeR.status === "fulfilled" && routeR.value.ok) setMyRoute(routeR.value.data);
      if (ciR.status === "fulfilled" && ciR.value.ok) setTodayCheckIns(ciR.value.data);
      if (sesR.status === "fulfilled" && sesR.value.ok && sesR.value.data) {
        const s = sesR.value.data;
        setSession(s);
        sessionIdRef.current = s._id;
        totalKmRef.current = s.totalKm || 0;
        setDisplayKm(totalKmRef.current);
        await startGPS(s._id);
      }
      await hydrateOfflineState();
    } catch { /* offline */ }
    setLoading(false);
    await refreshCount();
  };

  // ── Boot: OS report + permissions + data load ───────────────
  useEffect(() => {
    let unsubNet = () => {};
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) setGpsStatus("❌ Location permission deny hai");

      const os = await getOsStatusOnStart();
      if (os?.available && (os.mockGranted || os.fakeGpsAppCount > 0)) {
        setOsWarning(
          os.mockGranted
            ? `Mock location app enable hai: ${os.mockGrantedPackage}`
            : `Fake GPS app installed: ${(os.installedFakeGpsApps || []).join(", ")}`
        );
        // Admin ko pehle hi bata do — even before check-in
        await reportFake({
          confidence: "FAKE",
          reasons: [os.mockGranted
            ? "OS: mock location grant active"
            : "OS: fake GPS app installed"],
          flagCount: 2
        });
      }

      // NetInfo listener — online/offline + auto sync
      unsubNet = NetInfo.addEventListener(state => {
        const online = !!state.isConnected;
        setIsOnline(online);
        if (online) {
          getPendingCount().then(c => {
            if (c > 0) { showToast(`📶 Internet aa gaya! ${c} actions sync ho rahi hain...`, "info"); doSync(); }
          });
        } else {
          showToast("📵 Offline mode — kaam jari rahega!", "warning");
        }
      });

      await loadAll();
    })();
    return () => { unsubNet(); stopGPS(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync ────────────────────────────────────────────────────
  const doSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const r = await syncPendingActions();
      if (r.synced > 0) { showToast(`✅ ${r.synced} actions sync ho gayi!`, "success"); await loadAll(); }
      if (r.failed > 0) showToast(`⚠️ ${r.failed} fail — dobara hongi`, "warning");
    } catch { /* ignore */ }
    finally { setSyncing(false); await refreshCount(); }
  };

  // ── Capture + action dispatch ───────────────────────────────
  const handleCapture = async (mode, shop = null) => {
    const photo = await capturePhoto();
    if (!photo) return;

    setActionMsg("GPS le raha hai...");
    let location;
    try {
      location = await getGPS();
    } catch {
      if (lastPosRef.current) {
        location = lastPosRef.current;
        showToast("GPS weak hai — last known location use ho rahi hai", "warning");
      } else {
        setActionMsg("");
        showToast("GPS on karo aur dobara try karo (location zaroori hai)", "error");
        return;
      }
    }

    const online = isOnline;

    try {
      // ── CHECK-IN ──
      if (mode === "checkin") {
        // FAKE GPS BLOCK — fake start nahi hoga
        const detection = detectFakeLocation({ coords: { latitude: location.lat, longitude: location.lng, accuracy: location.accuracy } });
        if (detection.isFake) {
          setActionMsg("");
          await reportFake(detection);
          RNAlert.alert("🚨 Fake GPS Detected",
            `Day start BLOCK hua!\n\n${detection.reasons[0]}\n\nReal GPS se aao — admin ko alert chala gaya hai.`);
          return;
        }

        if (online) {
          setActionMsg("Check-in ho rahi hai...");
          const r1 = await api.markAttendance("checkin", photo, location);
          if (!r1.ok) throw new Error(r1.data?.message || "Check-in fail");
          setActionMsg("Session shuru...");
          const r2 = await api.startTracking({ location });
          if (r2.ok) {
            setSession(r2.data);
            sessionIdRef.current = r2.data._id;
            await startGPS(r2.data._id);
          }
          await loadAll();
          showToast("✅ Check-in ho gaya!", "success");
        } else {
          setActionMsg("Offline save kar raha hai...");
          const fakeId = `offline_${Date.now()}`;
          await queueAction({ type: "ATTENDANCE_CHECKIN", photo, location });
          await queueAction({ type: "TRACKING_START", location, offlineSessionId: fakeId });
          sessionIdRef.current = fakeId;
          setSession({ _id: fakeId, startTime: new Date(), offline: true });
          setAttendance({ checkInTime: new Date(), offline: true });
          await startGPS(fakeId);
          await refreshCount();
          showToast("📵 Offline — save! Internet aate hi sync hogi", "warning");
        }

      // ── CHECK-OUT ──
      } else if (mode === "checkout") {
        if (online) {
          setActionMsg("Check-out ho rahi hai...");
          const r1 = await api.markAttendance("checkout", photo, location);
          if (!r1.ok) throw new Error(r1.data?.message || "Check-out fail");
          if (sessionIdRef.current) {
            setActionMsg("Petrol hisaab...");
            const r2 = await api.endTracking(sessionIdRef.current, location);
            if (!r2.ok) {
              // Never lose the day's KM because the end call failed.
              await queueAction({ type: "TRACKING_END", sessionId: sessionIdRef.current, location });
              showToast("Tracking end sync pending — internet check karo", "warning");
            }
          }
          stopGPS();
          setSession(null); sessionIdRef.current = null;
          await loadAll();
          showToast("✅ Check-out ho gaya!", "success");
        } else {
          setActionMsg("Offline save...");
          await queueAction({ type: "ATTENDANCE_CHECKOUT", photo, location });
          if (sessionIdRef.current)
            await queueAction({ type: "TRACKING_END", sessionId: sessionIdRef.current, location });
          stopGPS();
          setSession(null); sessionIdRef.current = null;
          setAttendance(p => ({ ...(p || {}), checkOutTime: new Date(), offline: true }));
          await refreshCount();
          showToast("📵 Offline — check-out save! Sync baad mein", "warning");
        }

      // ── SHOP CHECK-IN ──
      } else if (mode === "shop" && shop) {
        if (online) {
          setActionMsg(`${shop.name} pe check-in...`);
          const r = await api.shopCheckin({
            shopId: shop._id,
            sessionId: sessionIdRef.current,
            routeId: myRoute?._id,
            photo, location
          });
          if (!r.ok) throw new Error(r.data?.message || "Check-in fail");
          const ci = await api.todayCheckins();
          if (ci.ok) setTodayCheckIns(ci.data);
          showToast(r.data.message, r.data.locationVerified ? "success" : "warning");
        } else {
          setActionMsg("Offline save...");
          await queueAction({ type: "SHOP_CHECKIN", shopId: shop._id, sessionId: sessionIdRef.current, routeId: myRoute?._id, photo, location });
          setTodayCheckIns(p => [...p, { shop, timestamp: new Date(), offline: true }]);
          await refreshCount();
          showToast(`📵 Offline — ${shop.name} save! Sync baad mein`, "warning");
        }
      }
    } catch (err) {
      showToast(`❌ ${err.message || "Error hua"}`, "error");
    } finally { setActionMsg(""); }
  };

  // ── Derived ─────────────────────────────────────────────────
  const isCheckedIn  = !!attendance?.checkInTime;
  const isCheckedOut = !!attendance?.checkOutTime;
  const dayStarted   = !!session;
  const routeShops   = Array.isArray(myRoute?.shops) ? myRoute.shops : [];
  const shopDone = (shopId) => todayCheckIns.find(c => idMatch(c.shop?._id || c.shop, shopId));

  if (loading) return <Loading text="Data load ho raha hai..." />;

  return (
    <View style={st.root}>
      <Toast msg={toast.msg} type={toast.type} />

      {/* Action Loading overlay */}
      {actionMsg ? (
        <View style={st.overlay}>
          <View style={st.overlayBox}>
            <Text style={{ fontSize: 30, marginBottom: 8 }}>⏳</Text>
            <Text style={st.overlayText}>{actionMsg}</Text>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={st.scroll}>

        {/* Offline Banner */}
        {!isOnline && (
          <View style={st.offlineBanner}>
            <Text style={st.offlineText}>📵 Offline Mode — Kaam Jari Rahega</Text>
            {pendingCount > 0 && (
              <View style={st.pendingPill}><Text style={st.pendingText}>{pendingCount}</Text></View>
            )}
          </View>
        )}

        {/* Sync Banner */}
        {isOnline && pendingCount > 0 && (
          <View style={st.syncBanner}>
            <View style={{ flex: 1 }}>
              <Text style={st.syncTitle}>📶 {pendingCount} offline actions pending</Text>
              <Text style={st.syncSub}>Internet aa gaya — sync karo</Text>
            </View>
            <Button title={syncing ? "Sync..." : "🔄 Sync"} small
              onPress={doSync} disabled={syncing} />
          </View>
        )}

        {/* OS-level Fake GPS Warning */}
        {osWarning && (
          <View style={st.warnBox}>
            <Text style={st.warnTitle}>⚠️ OS-level Security Warning</Text>
            <Text style={st.warnText}>{osWarning}</Text>
            <Text style={st.warnSub}>
              Isko disable karo — warna real GPS pakda jayega aur admin ko report hoga.
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={st.header}>
          <Text style={st.headerDate}>
            {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "short" })}
            {!isOnline ? "  🔴 OFFLINE" : ""}
          </Text>
          <Text style={st.headerHi}>Assalam o Alaikum! 👋</Text>
          <Text style={st.headerName}>{user?.name} · {user?.employeeId}</Text>
          {tracking && (
            <Text style={st.headerGps}>{gpsStatus || "📍 GPS chal raha hai"}</Text>
          )}
        </View>

        {/* Attendance */}
        <Card>
          <Text style={st.cardTitle}>📸 Attendance</Text>
          <View style={st.attRow}>
            <TouchableOpacity
              onPress={() => !isCheckedIn && handleCapture("checkin")}
              disabled={isCheckedIn}
              style={[st.attBtn, isCheckedIn ? st.attDone : st.attCheckin]}>
              {isCheckedIn
                ? (<>
                    <Text style={[st.attBtnTitle, st.attBtnTitleDone]}>✅ Check-In</Text>
                    <Text style={[st.attBtnSub, { color: C.green }]}>
                      {fmtTime(attendance.checkInTime)}{attendance?.offline ? " ⏳" : ""}
                    </Text>
                  </>)
                : <Text style={st.attBtnTitle}>📸 Check In</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => isCheckedIn && !isCheckedOut && setConfirmOut(true)}
              disabled={!isCheckedIn || isCheckedOut}
              style={[st.attBtn, isCheckedOut ? st.attDone : (isCheckedIn ? st.attCheckout : st.attDisabled)]}>
              {isCheckedOut
                ? (<>
                    <Text style={[st.attBtnTitle, { color: C.red }]}>🔴 Check-Out</Text>
                    <Text style={[st.attBtnSub, { color: C.red }]}>
                      {fmtTime(attendance.checkOutTime)}
                    </Text>
                  </>)
                : <Text style={st.attBtnTitle}>📸 Check Out</Text>}
            </TouchableOpacity>
          </View>
        </Card>

        {/* GPS Tracker */}
        {isCheckedIn && !isCheckedOut && (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.sm }}>
              <Text style={st.cardTitle}>📍 GPS Tracker</Text>
              <Badge color={tracking ? (isOnline ? C.greenL : C.orangeL) : C.gray}
                textColor={tracking ? (isOnline ? C.green : C.orange) : C.textFaint}>
                {tracking ? (isOnline ? "● Live" : "● Offline GPS") : "○ Off"}
              </Badge>
            </View>
            <View style={st.kmBox}>
              <Text style={st.kmValue}>{displayKm.toFixed(2)}</Text>
              <Text style={st.kmLabel}>km aaj</Text>
              {!isOnline && <Text style={st.kmOffline}>GPS chal raha — sync baad mein hoga</Text>}
            </View>
            {session?.startTime && (
              <Text style={st.kmStart}>Shuru: {fmtTime(session.startTime)}</Text>
            )}
          </Card>
        )}

        {/* My Route */}
        {myRoute ? (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={st.cardTitle}>🗺️ {myRoute.name}</Text>
                {myRoute.routeDate ? <Text style={st.routeDate}>{myRoute.routeDate}</Text> : null}
              </View>
              <Badge>{todayCheckIns.length}/{routeShops.length} done</Badge>
            </View>

            {/* Progress bar */}
            <View style={st.progressBg}>
              <View style={[st.progressFill, {
                width: routeShops.length ? `${(todayCheckIns.length / routeShops.length) * 100}%` : "0%"
              }]} />
            </View>

            {/* Warehouse start */}
            <View style={[st.shopRow, st.shopStart]}>
              <View style={[st.shopIcon, { backgroundColor: C.green }]}><Text style={st.shopIconText}>🏭</Text></View>
              <Text style={st.shopNameGreen}>Warehouse (Start)</Text>
            </View>

            {/* Shops */}
            {[...routeShops].sort((a, b) => (a.order || 0) - (b.order || 0)).map((item, i) => {
              const shop = item.shop;
              if (!shop || typeof shop !== "object") return null;
              const done = shopDone(shop._id);
              const isOfflineDone = done?.offline;
              const isWarning = done?.checkInStatus === "warning";
              return (
                <View key={shop._id || i}>
                  <View style={st.connector} />
                  <View style={[st.shopRow,
                    done
                      ? isOfflineDone ? st.shopOffline : isWarning ? st.shopWarn : st.shopDoneSt
                      : st.shopPending]}>
                    <View style={[st.shopIcon,
                      done
                        ? isOfflineDone ? { backgroundColor: "#fb923c" } : isWarning ? { backgroundColor: C.yellow } : { backgroundColor: C.green }
                        : { backgroundColor: C.primaryL }]}>
                      <Text style={[st.shopIconText, !done && { color: C.primary }]}>
                        {done ? (isOfflineDone ? "⏳" : isWarning ? "⚠" : "✓") : i + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.shopName}>{shop.name}</Text>
                      <Text style={st.shopAddr}>{shop.address || shop.area || ""}</Text>
                      {done && (
                        <Text style={[st.shopStatus,
                          isOfflineDone ? { color: C.orange } : isWarning ? { color: C.yellow } : { color: C.green }]}>
                          {isOfflineDone
                            ? `⏳ ${fmtTime(done.timestamp)} — sync pending`
                            : isWarning
                              ? `⚠️ ${fmtTime(done.timestamp)} · ${done.distanceFromShop}m dur`
                              : `✅ ${fmtTime(done.timestamp)} · Verified`}
                        </Text>
                      )}
                    </View>
                    {!done && isCheckedIn && !isCheckedOut && dayStarted && (
                      <Button title="📸 In" small onPress={() => handleCapture("shop", shop)} />
                    )}
                  </View>
                </View>
              );
            })}

            {/* Warehouse end */}
            <View style={st.connector} />
            <View style={[st.shopRow, isCheckedOut ? st.shopDoneSt : st.shopPending]}>
              <View style={[st.shopIcon, { backgroundColor: isCheckedOut ? C.green : C.gray }]}>
                <Text style={st.shopIconText}>{isCheckedOut ? "✓" : "🏭"}</Text>
              </View>
              <Text style={[st.shopName, { color: isCheckedOut ? C.green : C.textFaint }]}>
                Warehouse (Wapas){isCheckedOut ? ` · ${fmtTime(attendance?.checkOutTime)}` : ""}
              </Text>
            </View>
          </Card>
        ) : (
          <View style={st.noRoute}>
            <Text style={{ fontSize: 30, marginBottom: 8 }}>⚠️</Text>
            <Text style={st.noRouteTitle}>Aaj ka koi route assign nahi</Text>
            {!isOnline && <Text style={st.noRouteSub}>Offline — route internet aane pe load hoga</Text>}
          </View>
        )}

        {/* Day Done */}
        {isCheckedOut && (
          <View style={st.dayDone}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
            <Text style={st.dayDoneTitle}>Din khatam — Masha Allah!</Text>
            <Text style={st.dayDoneSub}>{todayCheckIns.length} shops visit kiye</Text>
            {pendingCount > 0 && (
              <View style={{ marginTop: S.md }}>
                <Text style={st.dayDonePending}>⏳ {pendingCount} actions sync baaqi</Text>
                <Button title={syncing ? "Sync..." : "🔄 Abhi Sync Karo"}
                  onPress={doSync} disabled={syncing || !isOnline} color={C.orange} />
              </View>
            )}
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity onPress={actionLogout} style={st.logoutBtn}>
          <Text style={st.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Check-out confirm */}
      <Confirm visible={confirmOut} title="Check-Out?"
        message="Photo + location ke saath check-out hogi. Day khatam ho jayega."
        onYes={() => { setConfirmOut(false); handleCapture("checkout"); }}
        onNo={() => setConfirmOut(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },

  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)", zIndex: 90,
    justifyContent: "center", alignItems: "center" },
  overlayBox: { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: S.xl,
    alignItems: "center", marginHorizontal: S.xl },
  overlayText: { color: C.text, fontSize: 13, fontWeight: "500", textAlign: "center" },

  offlineBanner: { backgroundColor: C.orange, borderRadius: RADIUS.lg,
    paddingHorizontal: S.lg, paddingVertical: 12, marginBottom: S.md,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  offlineText: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
  pendingPill: { backgroundColor: "#fff", borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2 },
  pendingText: { color: C.orange, fontSize: 11, fontWeight: "bold" },

  syncBanner: { backgroundColor: C.primaryL, borderWidth: 1, borderColor: "#bfdbfe",
    borderRadius: RADIUS.lg, paddingHorizontal: S.lg, paddingVertical: 12,
    marginBottom: S.md, flexDirection: "row", alignItems: "center", gap: S.sm },
  syncTitle: { color: C.primary, fontSize: 13, fontWeight: "600" },
  syncSub: { color: "#93c5fd", fontSize: 11 },

  warnBox: { backgroundColor: "#7f1d1d", borderRadius: RADIUS.lg, padding: S.lg,
    marginBottom: S.md },
  warnTitle: { color: "#fca5a5", fontWeight: "bold", marginBottom: 6, fontSize: 13 },
  warnText: { color: "#fff", fontWeight: "bold", marginBottom: 4, fontSize: 14 },
  warnSub: { color: "#fecaca", fontSize: 12 },

  header: { backgroundColor: C.primary, borderRadius: RADIUS.lg, padding: S.xl,
    marginBottom: S.md },
  headerDate: { color: "#bfdbfe", fontSize: 11, fontWeight: "500", marginBottom: 4 },
  headerHi: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerName: { color: "#bfdbfe", fontSize: 13, marginTop: 2 },
  headerGps: { color: "#86efac", fontSize: 11, marginTop: 6 },

  cardTitle: { fontSize: 13, fontWeight: "600", color: C.textSoft, marginBottom: S.sm },
  attRow: { flexDirection: "row", gap: S.sm },
  attBtn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 16,
    alignItems: "center", justifyContent: "center" },
  attCheckin: { backgroundColor: C.green },
  attCheckout: { backgroundColor: C.red },
  attDone: { backgroundColor: C.greenL },
  attDisabled: { backgroundColor: C.gray },
  attBtnTitle: { color: "#fff", fontWeight: "600", fontSize: 14 },
  attBtnTitleDone: { color: C.green, fontWeight: "600", fontSize: 14 },
  attBtnSub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },

  kmBox: { backgroundColor: "#eef2ff", borderRadius: RADIUS.md, padding: S.lg,
    alignItems: "center", borderWidth: 1, borderColor: "#c7d2fe" },
  kmValue: { fontSize: 36, fontWeight: "bold", color: C.primary },
  kmLabel: { color: "#93c5fd", fontSize: 13, fontWeight: "500", marginTop: 2 },
  kmOffline: { color: C.orange, fontSize: 11, marginTop: 4 },
  kmStart: { fontSize: 11, color: C.textFaint, textAlign: "center", marginTop: 8 },

  routeDate: { fontSize: 11, color: C.textFaint },
  progressBg: { height: 8, backgroundColor: C.gray, borderRadius: 4,
    marginBottom: S.md, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.green, borderRadius: 4 },

  shopRow: { flexDirection: "row", alignItems: "center", gap: S.sm,
    padding: S.md, borderRadius: RADIUS.md, borderWidth: 1 },
  shopStart: { backgroundColor: C.greenL, borderColor: "#bbf7d0" },
  shopDoneSt: { backgroundColor: C.greenL, borderColor: "#bbf7d0" },
  shopWarn: { backgroundColor: C.yellowL, borderColor: "#fde68a" },
  shopOffline: { backgroundColor: C.orangeL, borderColor: "#fed7aa" },
  shopPending: { backgroundColor: C.gray, borderColor: C.border },
  shopIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: "center",
    alignItems: "center" },
  shopIconText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  shopName: { fontSize: 14, fontWeight: "500", color: C.text },
  shopNameGreen: { fontSize: 14, fontWeight: "500", color: "#166534" },
  shopAddr: { fontSize: 11, color: C.textFaint },
  shopStatus: { fontSize: 11, marginTop: 2 },
  connector: { width: 1, height: 10, backgroundColor: C.border2, marginLeft: 28 },

  noRoute: { backgroundColor: C.yellowL, borderWidth: 1, borderColor: "#fde68a",
    borderRadius: RADIUS.lg, padding: S.xl, alignItems: "center" },
  noRouteTitle: { color: "#a16207", fontWeight: "600", fontSize: 14 },
  noRouteSub: { color: "#ca8a04", fontSize: 12, marginTop: 4 },

  dayDone: { backgroundColor: C.greenL, borderWidth: 1, borderColor: "#bbf7d0",
    borderRadius: RADIUS.lg, padding: S.xl, alignItems: "center" },
  dayDoneTitle: { color: "#166534", fontWeight: "bold", fontSize: 17 },
  dayDoneSub: { color: C.green, fontSize: 13, marginTop: 4 },
  dayDonePending: { color: C.orange, fontSize: 12, marginBottom: 8 },

  logoutBtn: { alignItems: "center", padding: S.lg, marginTop: S.sm },
  logoutText: { color: C.textFaint, fontSize: 14 },
});
