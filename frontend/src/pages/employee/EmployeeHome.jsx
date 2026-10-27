import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import LiveCamera from "../../components/LiveCamera";
import { queueAction, getPendingCount } from "../../utils/offlineQueue";
import { syncPendingActions } from "../../utils/syncManager";

const distKm = (lat1, lng1, lat2, lng2) => {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};
const getGPS = (ms=12000) => new Promise((res,rej) =>
  navigator.geolocation.getCurrentPosition(
    p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
    rej, { enableHighAccuracy: true, timeout: ms, maximumAge: 0 }
  )
);
const idMatch = (a,b) => String(a) === String(b);
const fmt = (d) => d ? new Date(d).toLocaleTimeString("en-PK",{hour:"2-digit",minute:"2-digit"}) : "";

export default function EmployeeHome() {
  const { user } = useAuth();

  const [attendance,    setAttendance]    = useState(null);
  const [session,       setSession]       = useState(null);
  const [myRoute,       setMyRoute]       = useState(null);
  const [todayCheckIns, setTodayCheckIns] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [cameraOpen,    setCameraOpen]    = useState(false);
  const [cameraMode,    setCameraMode]    = useState("");
  const [selectedShop,  setSelectedShop]  = useState(null);
  const [cameraTitle,   setCameraTitle]   = useState("");
  const [actionMsg,     setActionMsg]     = useState("");
  const [toast,         setToast]         = useState({ msg: "", type: "success" });
  const [displayKm,     setDisplayKm]     = useState(0);
  const [tracking,      setTracking]      = useState(false);
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [syncing,       setSyncing]       = useState(false);
  const [wakeLockOn,    setWakeLockOn]    = useState(false);

  const watchRef     = useRef(null);
  const intervalRef  = useRef(null);
  const lastPosRef   = useRef(null);
  const totalKmRef   = useRef(0);
  const sessionIdRef = useRef(null);
  const wakeLockRef  = useRef(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:"", type:"success" }), 4000);
  };

  const refreshCount = async () => {
    const c = await getPendingCount();
    setPendingCount(c);
  };

  // ── Network listeners ─────────────────────────────────────
  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      const c = await getPendingCount();
      if (c > 0) {
        showToast(`📶 Internet aa gaya! ${c} actions sync ho rahi hain...`, "info");
        await doSync();
      }
    };
    const goOffline = () => {
      setIsOnline(false);
      showToast("📵 Offline mode — kaam jari rahega!", "warning");
    };
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);

    // SW message listener
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", async e => {
        if (e.data?.type === "SYNC_NOW") await doSync();
      });
    }
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []); // eslint-disable-line

  // Visibility change — wake lock re-acquire
  useEffect(() => {
    const onVis = async () => {
      if (document.visibilityState === "visible" && tracking && "wakeLock" in navigator) {
        try { wakeLockRef.current = await navigator.wakeLock.request("screen"); setWakeLockOn(true); } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [tracking]);

  // ── GPS ───────────────────────────────────────────────────
  const stopGPS = () => {
    if (watchRef.current)    { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    wakeLockRef.current?.release().catch(()=>{});
    wakeLockRef.current = null;
    setWakeLockOn(false);
    setTracking(false);
  };

  const startGPS = async (sessionId) => {
    if (watchRef.current) return;
    setTracking(true);
    sessionIdRef.current = sessionId;

    // Wake Lock
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        setWakeLockOn(true);
        wakeLockRef.current.addEventListener("release", async () => {
          if (document.visibilityState === "visible") {
            try { wakeLockRef.current = await navigator.wakeLock.request("screen"); setWakeLockOn(true); } catch {}
          } else { setWakeLockOn(false); }
        });
      } catch {}
    }

    // Watch position
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (lastPosRef.current) {
          const d = distKm(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng);
          if (d > 0.01 && d < 2) { totalKmRef.current += d; setDisplayKm(Math.round(totalKmRef.current*100)/100); }
        }
        lastPosRef.current = { lat, lng };
      },
      err => console.warn("GPS:", err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    // Har 30 sec server/queue pe bhejo
    intervalRef.current = setInterval(async () => {
      if (!lastPosRef.current || !sessionIdRef.current) return;
      const action = { type:"TRACKING_UPDATE", lat: lastPosRef.current.lat, lng: lastPosRef.current.lng, sessionId: sessionIdRef.current };
      if (navigator.onLine) {
        try { await api.post("/tracking/update", { lat:action.lat, lng:action.lng, sessionId:action.sessionId }); }
        catch { await queueAction(action); await refreshCount(); }
      } else {
        await queueAction(action);
        await refreshCount();
      }
    }, 30000);
  };

  // ── Load Data ──────────────────────────────────────────────
  const loadAll = async () => {
    try {
      const [attR, sesR, routeR, ciR] = await Promise.allSettled([
        api.get("/attendance/today"),
        api.get("/tracking/active"),
        api.get("/routes/my"),
        api.get("/checkin/today")
      ]);
      if (attR.status   === "fulfilled") setAttendance(attR.value.data);
      if (routeR.status === "fulfilled") setMyRoute(routeR.value.data);
      if (ciR.status    === "fulfilled") setTodayCheckIns(ciR.value.data);
      if (sesR.status   === "fulfilled" && sesR.value.data) {
        const s = sesR.value.data;
        setSession(s);
        sessionIdRef.current = s._id;
        totalKmRef.current   = s.totalKm || 0;
        setDisplayKm(totalKmRef.current);
        await startGPS(s._id);
      }
    } catch {
      if (!navigator.onLine) showToast("Offline — data baad mein load hoga", "warning");
    } finally { setLoading(false); }
    await refreshCount();
  };

  useEffect(() => { loadAll(); return () => stopGPS(); }, []); // eslint-disable-line

  // ── Sync ──────────────────────────────────────────────────
  const doSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const r = await syncPendingActions();
      if (r.synced > 0) { showToast(`✅ ${r.synced} actions sync ho gayi!`, "success"); await loadAll(); }
      if (r.failed > 0)   showToast(`⚠️ ${r.failed} fail — dobara hongi`, "warning");
    } catch {} finally { setSyncing(false); await refreshCount(); }
  };

  // ── Camera ─────────────────────────────────────────────────
  const openCamera = (mode, shop=null, title="") => {
    setCameraMode(mode); setSelectedShop(shop); setCameraTitle(title); setCameraOpen(true);
  };

  const handleCapture = async (photo) => {
    setCameraOpen(false);
    setActionMsg("GPS le raha hai...");
    try {
      let location;
      try { location = await getGPS(); }
      catch { location = lastPosRef.current || { lat:0, lng:0 }; }

      const online = navigator.onLine;

      // ── CHECK-IN ──
      if (cameraMode === "checkin") {
        if (online) {
          setActionMsg("Check-in ho rahi hai...");
          await api.post("/attendance/mark", { type:"checkin", photo, location });
          setActionMsg("Session shuru...");
          const r = await api.post("/tracking/start", { location });
          setSession(r.data);
          await startGPS(r.data._id);
          await loadAll();
          showToast("✅ Check-in ho gaya!", "success");
        } else {
          setActionMsg("Offline save kar raha hai...");
          await queueAction({ type:"ATTENDANCE_CHECKIN", photo, location });
          await queueAction({ type:"TRACKING_START", location });
          const fakeId = `offline_${Date.now()}`;
          sessionIdRef.current = fakeId;
          setSession({ _id:fakeId, startTime:new Date(), offline:true });
          setAttendance({ checkInTime:new Date(), offline:true });
          await startGPS(fakeId);
          await refreshCount();
          showToast("📵 Offline — save! Internet aate hi sync hogi", "warning");
        }

      // ── CHECK-OUT ──
      } else if (cameraMode === "checkout") {
        if (online) {
          setActionMsg("Check-out ho rahi hai...");
          await api.post("/attendance/mark", { type:"checkout", photo, location });
          if (sessionIdRef.current && !String(sessionIdRef.current).startsWith("offline_")) {
            setActionMsg("Petrol hisaab...");
            await api.post("/tracking/end", { sessionId:sessionIdRef.current, location });
          }
          stopGPS();
          setSession(null); sessionIdRef.current = null;
          await loadAll();
          showToast("✅ Check-out ho gaya!", "success");
        } else {
          setActionMsg("Offline save...");
          await queueAction({ type:"ATTENDANCE_CHECKOUT", photo, location });
          if (sessionIdRef.current)
            await queueAction({ type:"TRACKING_END", sessionId:sessionIdRef.current, location });
          stopGPS();
          setSession(null); sessionIdRef.current = null;
          setAttendance(p => ({ ...p, checkOutTime:new Date(), offline:true }));
          await refreshCount();
          showToast("📵 Offline — check-out save! Sync baad mein", "warning");
        }

      // ── SHOP CHECK-IN ──
      } else if (cameraMode === "shop" && selectedShop) {
        if (online) {
          setActionMsg(`${selectedShop.name} pe check-in...`);
          const r = await api.post("/checkin", {
            shopId:    selectedShop._id,
            sessionId: String(sessionIdRef.current).startsWith("offline_") ? null : sessionIdRef.current,
            routeId:   myRoute?._id,
            photo, location
          });
          const ci = await api.get("/checkin/today");
          setTodayCheckIns(ci.data);
          showToast(r.data.message, r.data.locationVerified ? "success" : "warning");
        } else {
          setActionMsg("Offline save...");
          await queueAction({ type:"SHOP_CHECKIN", shopId:selectedShop._id, sessionId:sessionIdRef.current, routeId:myRoute?._id, photo, location });
          setTodayCheckIns(p => [...p, { shop:selectedShop, timestamp:new Date(), offline:true }]);
          await refreshCount();
          showToast(`📵 Offline — ${selectedShop.name} save! Sync baad mein`, "warning");
        }
      }
    } catch (err) {
      showToast(`❌ ${err.response?.data?.message || "Error hua"}`, "error");
    } finally { setActionMsg(""); }
  };

  const isCheckedIn  = !!attendance?.checkInTime;
  const isCheckedOut = !!attendance?.checkOutTime;
  const dayStarted   = !!session;
  const shopDone = (shopId) => todayCheckIns.find(c => idMatch(c.shop?._id || c.shop, shopId));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center"><div className="text-5xl mb-3 animate-pulse">📍</div><p className="text-gray-400 text-sm">Load ho raha hai...</p></div>
    </div>
  );

  return (
    <div className="space-y-4 pb-10">

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-16 left-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm text-center shadow-xl font-medium ${
          toast.type==="error" ? "bg-red-600 text-white" :
          toast.type==="warning" ? "bg-orange-500 text-white" :
          toast.type==="info" ? "bg-blue-600 text-white" : "bg-gray-800 text-white"
        }`}>{toast.msg}</div>
      )}

      {/* Action Loading */}
      {actionMsg && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 text-center mx-4 shadow-2xl">
            <div className="text-3xl mb-2 animate-bounce">⏳</div>
            <p className="text-gray-700 text-sm font-medium">{actionMsg}</p>
          </div>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-orange-500 text-white rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">📵 Offline Mode — Kaam Jari Rahega</span>
          {pendingCount > 0 && (
            <span className="bg-white text-orange-600 text-xs px-2 py-0.5 rounded-full font-bold">{pendingCount} pending</span>
          )}
        </div>
      )}

      {/* Sync Banner */}
      {isOnline && pendingCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-blue-700 text-sm font-semibold">📶 {pendingCount} offline actions pending</p>
            <p className="text-blue-400 text-xs">Internet aa gaya — sync karo</p>
          </div>
          <button onClick={doSync} disabled={syncing}
            className="bg-blue-600 text-white text-xs px-3 py-2 rounded-xl font-medium disabled:opacity-50">
            {syncing ? "Sync..." : "🔄 Sync"}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
        <p className="text-blue-200 text-xs font-medium mb-1">
          {new Date().toLocaleDateString("en-PK",{weekday:"long",day:"numeric",month:"short"})}
          {!isOnline && <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">OFFLINE</span>}
        </p>
        <h2 className="text-xl font-bold">Assalam o Alaikum! 👋</h2>
        <p className="text-blue-200 text-sm">{user?.name} · {user?.employeeId}</p>
        {wakeLockOn && <p className="text-green-300 text-xs mt-1">🔒 Screen lock nahi hoga — GPS on</p>}
        {!wakeLockOn && tracking && <p className="text-yellow-300 text-xs mt-1">⚠️ Screen lock karay ga to GPS slow ho sakta</p>}
      </div>

      {/* Attendance */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">
          📸 Attendance
          {attendance?.offline && <span className="ml-2 text-xs text-orange-500 font-normal">⏳ sync pending</span>}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => !isCheckedIn && openCamera("checkin",null,"Check-In — Live Photo")}
            disabled={isCheckedIn}
            className={`py-4 rounded-xl text-sm font-semibold transition-all ${isCheckedIn ? "bg-green-100 text-green-700" : "bg-green-500 hover:bg-green-600 text-white active:scale-95"}`}>
            {isCheckedIn
              ? <div><div>✅ Check-In</div><div className="text-xs font-normal opacity-80">{fmt(attendance.checkInTime)}{attendance?.offline?" ⏳":""}</div></div>
              : "📸 Check In"}
          </button>
          <button onClick={() => isCheckedIn && !isCheckedOut && openCamera("checkout",null,"Check-Out — Live Photo")}
            disabled={!isCheckedIn||isCheckedOut}
            className={`py-4 rounded-xl text-sm font-semibold transition-all ${isCheckedOut ? "bg-red-100 text-red-600" : isCheckedIn ? "bg-red-500 hover:bg-red-600 text-white active:scale-95" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}>
            {isCheckedOut
              ? <div><div>🔴 Check-Out</div><div className="text-xs font-normal opacity-80">{fmt(attendance.checkOutTime)}</div></div>
              : "📸 Check Out"}
          </button>
        </div>
      </div>

      {/* GPS Tracker */}
      {isCheckedIn && !isCheckedOut && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">📍 GPS Tracker</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${tracking ? (isOnline?"bg-green-100 text-green-600":"bg-orange-100 text-orange-600") : "bg-gray-100 text-gray-500"}`}>
              {tracking ? (
                <>
                  <span className={`w-2 h-2 rounded-full ${isOnline?"bg-green-500 animate-pulse":"bg-orange-400"}`} />
                  {isOnline ? "Live" : "Offline GPS"}
                </>
              ) : "⭕ Off"}
            </span>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
            <p className="text-4xl font-bold text-blue-700 font-mono">{displayKm.toFixed(2)}</p>
            <p className="text-blue-400 text-sm font-medium mt-1">km aaj</p>
            {!isOnline && (
              <p className="text-orange-400 text-xs mt-1">GPS chal raha — sync baad mein hoga</p>
            )}
          </div>
          {session?.startTime && <p className="text-xs text-gray-400 text-center mt-2">Shuru: {fmt(session.startTime)}</p>}
        </div>
      )}

      {/* My Route */}
      {myRoute ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-700 text-sm">🗺️ {myRoute.name}</h3>
              {myRoute.routeDate && <p className="text-xs text-gray-400">{myRoute.routeDate}</p>}
            </div>
            <span className="text-xs bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full font-medium">
              {todayCheckIns.length}/{myRoute.shops.length} done
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: myRoute.shops.length ? `${(todayCheckIns.length/myRoute.shops.length)*100}%` : "0%" }} />
          </div>

          <div className="space-y-2">
            {/* Start */}
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">🏭</div>
              <p className="text-sm font-medium text-green-800">Warehouse (Start)</p>
            </div>

            {myRoute.shops.sort((a,b)=>(a.order||0)-(b.order||0)).map((item,i) => {
              const shop = item.shop;
              if (!shop || typeof shop !== "object") return null;
              const done = shopDone(shop._id);
              const isOfflineDone = done?.offline;
              const isWarning     = done?.checkInStatus === "warning";
              return (
                <div key={shop._id||i}>
                  <div className="h-3 w-px bg-gray-200 ml-7" />
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                    done
                      ? isOfflineDone ? "bg-orange-50 border-orange-200"
                        : isWarning   ? "bg-yellow-50 border-yellow-200"
                        :               "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-100"
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      done
                        ? isOfflineDone ? "bg-orange-400 text-white"
                          : isWarning   ? "bg-yellow-400 text-white"
                          :               "bg-green-500 text-white"
                        : "bg-blue-100 text-blue-600"
                    }`}>
                      {done ? (isOfflineDone ? "⏳" : isWarning ? "⚠" : "✓") : i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{shop.name}</p>
                      <p className="text-xs text-gray-400 truncate">{shop.address || shop.area || ""}</p>
                      {done && (
                        <p className={`text-xs mt-0.5 ${isOfflineDone?"text-orange-500":isWarning?"text-yellow-600":"text-green-500"}`}>
                          {isOfflineDone
                            ? `⏳ ${fmt(done.timestamp)} — sync pending`
                            : isWarning
                              ? `⚠️ ${fmt(done.timestamp)} · ${done.distanceFromShop}m dur`
                              : `✅ ${fmt(done.timestamp)} · Verified`}
                        </p>
                      )}
                    </div>
                    {!done && isCheckedIn && !isCheckedOut && dayStarted && (
                      <button onClick={() => openCamera("shop", shop, `${shop.name} — Check-In`)}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-2 rounded-xl font-medium flex-shrink-0 active:scale-95">
                        📸 In
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* End */}
            <div className="h-3 w-px bg-gray-200 ml-7" />
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${isCheckedOut?"bg-green-50 border-green-200":"bg-gray-50 border-gray-100"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isCheckedOut?"bg-green-500 text-white":"bg-gray-200 text-gray-400"}`}>
                {isCheckedOut ? "✓" : "🏭"}
              </div>
              <p className={`text-sm font-medium ${isCheckedOut?"text-green-800":"text-gray-500"}`}>
                Warehouse (Wapas) {isCheckedOut ? `· ${fmt(attendance?.checkOutTime)}` : ""}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-yellow-700 font-medium text-sm">Aaj ka koi route assign nahi</p>
          {!isOnline && <p className="text-yellow-400 text-xs mt-1">Offline — route internet aane pe load hoga</p>}
        </div>
      )}

      {/* Day Done */}
      {isCheckedOut && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-green-700 font-bold text-lg">Din khatam — Masha Allah!</p>
          <p className="text-green-500 text-sm mt-1">{todayCheckIns.length} shops visit kiye</p>
          {pendingCount > 0 && (
            <div className="mt-3">
              <p className="text-orange-500 text-xs mb-2">⏳ {pendingCount} actions sync baaqi</p>
              <button onClick={doSync} disabled={syncing||!isOnline}
                className="bg-orange-500 text-white text-xs px-4 py-2 rounded-xl disabled:opacity-50">
                {syncing?"Sync...":"🔄 Abhi Sync Karo"}
              </button>
            </div>
          )}
        </div>
      )}

      {cameraOpen && <LiveCamera title={cameraTitle} onCapture={handleCapture} onClose={() => setCameraOpen(false)} />}
    </div>
  );
}
