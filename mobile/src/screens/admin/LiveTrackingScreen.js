// ================================================================
// ADMIN LIVE TRACKING — web LiveTracking.jsx ka port
// Odometer, status dots, employee cards, 30s auto-refresh,
// Google Maps deep link (bina API key)
// ================================================================
import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Switch } from "react-native";
import { api } from "../../api/client";
import { Card, Loading, EmptyState, Badge } from "../../ui/kit";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

// ── Odometer ─────────────────────────────────────────────────
const Odometer = ({ km }) => {
  const str = Number(km || 0).toFixed(1);
  const [whole, dec] = str.split(".");
  const padded = whole.padStart(5, "0");
  return (
    <View style={st.odoWrap}>
      {[...padded, ".", dec].map((d, i) => (
        <View key={i} style={[st.odoDigit, d === "." && st.odoDot]}>
          <Text style={st.odoText}>{d}</Text>
        </View>
      ))}
      <Text style={st.odoUnit}>km</Text>
    </View>
  );
};

// ── Time ago ─────────────────────────────────────────────────
const timeAgo = (minutes) => {
  if (minutes === null || minutes === undefined) return "No data";
  if (minutes < 1)  return "Abhi abhi";
  if (minutes < 60) return `${minutes} min pehle`;
  return `${Math.round(minutes / 60)} ghante pehle`;
};

// ── Status dot ───────────────────────────────────────────────
const StatusDot = ({ minutes }) => {
  const fresh = minutes !== null && minutes < 2;
  const stale = minutes !== null && minutes >= 2 && minutes < 10;
  return <View style={[st.dot, { backgroundColor: fresh ? C.green : stale ? C.yellow : "#9ca3af" }]} />;
};

// ── Employee card ────────────────────────────────────────────
const EmployeeTrackCard = ({ data }) => {
  const { employee, route, totalKm, deviations, startTime, latestLoc,
    shopsDone, totalShops, lastUpdateAgo } = data;

  const roleColors = {
    order_booker: { bg: C.primaryL, text: C.primary },
    delivery_boy: { bg: C.orangeL, text: C.orange },
  };
  const roleLabels = {
    order_booker: "📋 Order Booker",
    delivery_boy: "🛵 Delivery Boy",
  };
  const rc = roleColors[employee?.role] || { bg: C.gray, text: C.textSoft };

  const shopProgress = totalShops > 0 ? (shopsDone / totalShops) * 100 : 0;
  const openMap = () =>
    Linking.openURL(`https://maps.google.com/?q=${latestLoc.lat},${latestLoc.lng}&z=15`);

  return (
    <Card>
      {/* Header */}
      <View style={st.cardHead}>
        <View style={st.avatar}><Text style={st.avatarText}>{employee?.name?.charAt(0) || "?"}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.empName}>{employee?.name}</Text>
          <Text style={st.empId}>{employee?.employeeId}</Text>
        </View>
        <StatusDot minutes={lastUpdateAgo} />
        <View style={[st.roleBadge, { backgroundColor: rc.bg }]}>
          <Text style={[st.roleText, { color: rc.text }]}>{roleLabels[employee?.role] || employee?.role}</Text>
        </View>
      </View>

      {/* Odometer */}
      <Text style={st.secLabel}>⚡ Live KM Counter</Text>
      <Odometer km={totalKm} />

      {/* Route + Shops */}
      <View style={st.twoCol}>
        <View style={[st.miniBox, { backgroundColor: C.primaryL }]}>
          <Text style={st.miniLabel}>🗺️ Route</Text>
          <Text style={[st.miniValue, { color: C.primary }]}>{route?.name || "No route"}</Text>
        </View>
        <View style={[st.miniBox, { backgroundColor: C.purpleL }]}>
          <Text style={st.miniLabel}>🏪 Shops</Text>
          <Text style={[st.miniValue, { color: C.purple }]}>{shopsDone}/{totalShops} done</Text>
        </View>
      </View>

      {/* Shop progress */}
      {totalShops > 0 && (
        <View style={{ marginBottom: S.md }}>
          <View style={st.progressHead}>
            <Text style={st.progressLabel}>Shop Progress</Text>
            <Text style={st.progressPct}>{Math.round(shopProgress)}%</Text>
          </View>
          <View style={st.progressBg}>
            <View style={[st.progressFill, { width: `${shopProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Location */}
      <View style={[st.locBox, latestLoc ? st.locOk : st.locNone]}>
        <View style={{ flex: 1 }}>
          <Text style={st.locLabel}>
            📍 Last Known Location
            {deviations > 0 && (
              <Text style={st.devBadge}>  ⚠️ {deviations} deviations</Text>
            )}
          </Text>
          {latestLoc ? (
            <>
              <Text style={st.locCoords}>{latestLoc.lat?.toFixed(5)}, {latestLoc.lng?.toFixed(5)}</Text>
              <Text style={[st.locUpdate, {
                color: lastUpdateAgo < 2 ? C.green : lastUpdateAgo < 10 ? C.yellow : C.textFaint
              }]}>🕐 Update: {timeAgo(lastUpdateAgo)}</Text>
            </>
          ) : (
            <Text style={st.locNoneText}>Location update nahi mila abhi tak</Text>
          )}
        </View>
        {latestLoc && (
          <TouchableOpacity style={st.mapBtn} onPress={openMap}>
            <Text style={st.mapBtnText}>🗺️ Map</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={st.cardFoot}>
        <Text style={st.footText}>Din shuru: {startTime ? new Date(startTime).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : "—"}</Text>
        <Text style={st.footText}>Bike avg: {employee?.bikeAverage || "—"} km/L</Text>
      </View>
    </Card>
  );
};

export default function LiveTrackingScreen() {
  const [liveData, setLiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await api.liveTracking();
      if (res.ok) {
        setLiveData(res.data);
        setLastRefresh(new Date());
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 30000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  const activeCount = liveData.length;
  const totalKm = liveData.reduce((s, d) => s + (d.totalKm || 0), 0);
  const totalDevs = liveData.reduce((s, d) => s + (d.deviations || 0), 0);
  const totalShopsDone = liveData.reduce((s, d) => s + (d.shopsDone || 0), 0);

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      {/* Header */}
      <View style={st.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>📍 Live Tracking</Text>
          <Text style={st.sub}>
            Abhi dekho — har banda kahan hai
            {lastRefresh && ` · ${lastRefresh.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
          </Text>
        </View>
        <View style={st.autoRow}>
          <Text style={st.autoLabel}>Auto 30s</Text>
          <Switch value={autoRefresh} onValueChange={setAutoRefresh}
            trackColor={{ true: C.primary }} style={{ transform: [{ scale: 0.8 }] }} />
        </View>
      </View>

      {/* Summary cards */}
      <View style={st.statsRow}>
        {[
          { label: "Active", value: activeCount, icon: "👥", bg: C.greenL, border: "#bbf7d0", color: C.green },
          { label: "Total KM", value: `${totalKm.toFixed(1)}`, icon: "📏", bg: C.primaryL, border: "#bfdbfe", color: C.primary },
          { label: "Shops Done", value: totalShopsDone, icon: "🏪", bg: C.purpleL, border: "#e9d5ff", color: C.purple },
          { label: "Deviations", value: totalDevs, icon: "⚠️", bg: totalDevs > 0 ? C.redL : C.gray, border: totalDevs > 0 ? "#fecaca" : C.border, color: totalDevs > 0 ? C.red : C.textSoft },
        ].map(s => (
          <View key={s.label} style={[st.statBox, { backgroundColor: s.bg, borderColor: s.border }]}>
            <Text style={{ fontSize: 18 }}>{s.icon}</Text>
            <Text style={[st.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[st.statLabel, { color: s.color }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Cards */}
      {loading ? (
        <Loading text="Live data load ho raha hai..." />
      ) : activeCount === 0 ? (
        <EmptyState icon="😴" title="Abhi koi active nahi"
          subtitle="Jab employees check-in karenge, yahan dikhenge" />
      ) : (
        liveData.map(d => <EmployeeTrackCard key={d.sessionId} data={d} />)
      )}

      {/* Legend */}
      <Card>
        <Text style={st.legendTitle}>LEGEND</Text>
        <View style={st.legendRow}>
          <View style={[st.dot, { backgroundColor: C.green }]} />
          <Text style={st.legendText}>Live (under 2 min)</Text>
        </View>
        <View style={st.legendRow}>
          <View style={[st.dot, { backgroundColor: C.yellow }]} />
          <Text style={st.legendText}>Recent (2-10 min)</Text>
        </View>
        <View style={st.legendRow}>
          <View style={[st.dot, { backgroundColor: "#9ca3af" }]} />
          <Text style={st.legendText}>Stale (over 10 min)</Text>
        </View>
        <View style={st.legendRow}>
          <Text style={{ fontSize: 12 }}>🗺️</Text>
          <Text style={st.legendText}>Map button = Google Maps pe exact location</Text>
        </View>
        <View style={st.legendRow}>
          <Text style={{ fontSize: 12 }}>⚡</Text>
          <Text style={st.legendText}>Odometer = har 30 sec update hota hai</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },

  headRow: { flexDirection: "row", alignItems: "center", marginBottom: S.lg },
  title: { fontSize: 20, fontWeight: "bold", color: C.text },
  sub: { fontSize: 11, color: C.textFaint, marginTop: 2 },
  autoRow: { flexDirection: "row", alignItems: "center" },
  autoLabel: { fontSize: 11, color: C.textSoft },

  statsRow: { flexDirection: "row", marginBottom: S.lg, marginHorizontal: -3 },
  statBox: { flex: 1, borderRadius: RADIUS.lg, borderWidth: 1, padding: S.sm,
    marginHorizontal: 3, alignItems: "flex-start" },
  statValue: { fontSize: 16, fontWeight: "bold" },
  statLabel: { fontSize: 9, fontWeight: "500", opacity: 0.7, marginTop: 1 },

  cardHead: { flexDirection: "row", alignItems: "center", gap: 8,
    paddingBottom: S.md, marginBottom: S.md, borderBottomWidth: 1,
    borderBottomColor: C.border },
  avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primary,
    justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  empName: { fontSize: 14, fontWeight: "600", color: C.text },
  empId: { fontSize: 11, color: C.textFaint },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  roleText: { fontSize: 10, fontWeight: "600" },

  dot: { width: 10, height: 10, borderRadius: 5 },

  secLabel: { fontSize: 10, color: C.textFaint, fontWeight: "600",
    textTransform: "uppercase", marginBottom: 6 },
  odoWrap: { flexDirection: "row", alignItems: "center", marginBottom: S.md },
  odoDigit: { width: 30, height: 38, backgroundColor: "#1f2937", justifyContent: "center",
    alignItems: "center", borderRadius: 4, marginHorizontal: 1 },
  odoDot: { width: 10, backgroundColor: "transparent" },
  odoText: { color: "#4ade80", fontWeight: "bold", fontSize: 16, fontFamily: "monospace" },
  odoUnit: { color: C.textFaint, fontSize: 11, marginLeft: 6, fontWeight: "600" },

  twoCol: { flexDirection: "row", gap: S.sm, marginBottom: S.md },
  miniBox: { flex: 1, borderRadius: RADIUS.md, padding: S.md },
  miniLabel: { fontSize: 10, color: C.textFaint, fontWeight: "500", marginBottom: 2 },
  miniValue: { fontSize: 13, fontWeight: "600" },

  progressHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  progressLabel: { fontSize: 11, color: C.textSoft },
  progressPct: { fontSize: 11, fontWeight: "600", color: C.textSoft },
  progressBg: { height: 8, backgroundColor: C.gray, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.green, borderRadius: 4 },

  locBox: { borderRadius: RADIUS.md, padding: S.md, borderWidth: 1,
    flexDirection: "row", alignItems: "center", marginBottom: S.sm },
  locOk: { backgroundColor: C.greenL, borderColor: "#bbf7d0" },
  locNone: { backgroundColor: C.gray, borderColor: C.border },
  locLabel: { fontSize: 11, fontWeight: "600", color: C.textSoft, marginBottom: 2 },
  devBadge: { color: C.red, fontSize: 10 },
  locCoords: { fontSize: 11, color: C.text, fontFamily: "monospace" },
  locUpdate: { fontSize: 10, marginTop: 2, fontWeight: "500" },
  locNoneText: { fontSize: 11, color: C.textFaint },
  mapBtn: { backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.md, marginLeft: S.sm },
  mapBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  cardFoot: { flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: S.sm },
  footText: { fontSize: 10, color: C.textFaint },

  legendTitle: { fontSize: 10, fontWeight: "600", color: C.textFaint,
    textTransform: "uppercase", marginBottom: S.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  legendText: { fontSize: 11, color: C.textSoft },
});
