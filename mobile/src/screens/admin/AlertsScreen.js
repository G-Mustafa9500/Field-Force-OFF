// ================================================================
// ADMIN ALERTS — web AlertsPage.jsx ka port
// SSE ki jagah 15s polling (serverless pe SSE timeout hota hai),
// baaki sab same: filter, mark read, fake location details
// ================================================================
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { api } from "../../api/client";
import { Card, Loading, Button } from "../../ui/kit";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

const TYPE_LABELS = {
  route_deviation: { icon: "🗺️", label: "Route Deviation" },
  fake_location:   { icon: "🎭", label: "FAKE LOCATION" }
};

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unread");

  const load = async () => {
    try {
      const params = filter === "unread" ? "?isRead=false" : "";
      const res = await api.alerts(params);
      if (res.ok) setAlerts(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [filter]); // eslint-disable-line

  const markRead = async (id) => { await api.markAlertRead(id); load(); };
  const markAllRead = async () => { await api.markAllAlertsRead(); load(); };
  const unreadCount = alerts.filter(a => !a.isRead).length;
  const fakeCount = alerts.filter(a => a.type === "fake_location" && !a.isRead).length;

  const getColors = (a) => {
    if (a.type === "fake_location") return { border: C.purple, bg: C.purpleL };
    if (a.severity === "critical")  return { border: C.red, bg: C.redL };
    if (a.severity === "alert")     return { border: C.orange, bg: C.orangeL };
    return { border: "#fde047", bg: C.yellowL };
  };

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      {/* Header */}
      <View style={st.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>🚨 Alerts</Text>
          <View style={st.subRow}>
            {unreadCount > 0 && <Text style={st.unreadText}>{unreadCount} unread</Text>}
            {fakeCount > 0 && (
              <View style={st.fakePill}>
                <Text style={st.fakePillText}>🎭 {fakeCount} FAKE LOCATION</Text>
              </View>
            )}
            <View style={st.livePill}>
              <View style={st.liveDot} />
              <Text style={st.liveText}>Polling</Text>
            </View>
          </View>
        </View>
        <View style={st.headActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={st.markAll}>Sab Read</Text>
            </TouchableOpacity>
          )}
          <View style={st.filterRow}>
            {["unread", "all"].map(f => (
              <TouchableOpacity key={f} style={[st.filterBtn, filter === f && st.filterBtnActive]}
                onPress={() => setFilter(f)}>
                <Text style={[st.filterText, filter === f && st.filterTextActive]}>
                  {f === "unread" ? "Unread" : "Sab"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Fake Location Warning Banner */}
      {fakeCount > 0 && (
        <View style={st.fakeBanner}>
          <Text style={{ fontSize: 26 }}>🎭</Text>
          <View style={{ flex: 1, marginLeft: S.md }}>
            <Text style={st.fakeBannerTitle}>Fake Location Detect Hua!</Text>
            <Text style={st.fakeBannerSub}>{fakeCount} employee(s) fake GPS use kar rahe hain</Text>
          </View>
        </View>
      )}

      {loading ? (
        <Loading />
      ) : alerts.length === 0 ? (
        <View style={st.allClear}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>✅</Text>
          <Text style={st.allClearText}>Koi alert nahi! Sab genuine hain.</Text>
        </View>
      ) : alerts.map(a => {
        const typeInfo = TYPE_LABELS[a.type] || { icon: "⚠️", label: a.type };
        const isFake = a.type === "fake_location";
        const colors = a.isRead ? { border: C.border2, bg: "#fff" } : getColors(a);
        return (
          <View key={a._id} style={[st.alertCard, {
            backgroundColor: colors.bg,
            borderLeftColor: a.isRead ? C.border2 : colors.border,
            opacity: a.isRead ? 0.65 : 1
          }]}>
            <View style={st.alertRow}>
              <Text style={{ fontSize: 20 }}>{typeInfo.icon}</Text>
              <View style={{ flex: 1, marginLeft: S.sm }}>
                {/* Type badge */}
                <View style={st.badgeRow}>
                  <View style={[st.typeBadge, {
                    backgroundColor: isFake ? "#f3e8ff" :
                      a.severity === "critical" ? C.redL :
                      a.severity === "alert" ? C.orangeL : C.yellowL
                  }]}>
                    <Text style={[st.typeBadgeText, {
                      color: isFake ? C.purple :
                        a.severity === "critical" ? C.red :
                        a.severity === "alert" ? C.orange : C.yellow
                    }]}>
                      {typeInfo.label}{a.metadata?.confidence ? ` — ${a.metadata.confidence}` : ""}
                    </Text>
                  </View>
                  {!a.isRead && (
                    <View style={st.newBadge}><Text style={st.newBadgeText}>New</Text></View>
                  )}
                </View>

                <Text style={st.empName}>
                  {a.employee?.name}
                  <Text style={st.empId}> ({a.employee?.employeeId})</Text>
                </Text>
                <Text style={st.desc}>{a.description}</Text>

                {/* Fake location extra details */}
                {isFake && a.metadata && (
                  <View style={st.metaBox}>
                    {(a.metadata.reasons || []).map((r, i) => (
                      <Text key={i} style={st.metaReason}>🔍 {r}</Text>
                    ))}
                    {a.metadata.accuracy !== undefined && (
                      <Text style={st.metaInfo}>📡 GPS Accuracy: {a.metadata.accuracy}m</Text>
                    )}
                    {a.metadata.speed > 0 && (
                      <Text style={st.metaInfo}>🏎️ Speed: {a.metadata.speed} km/h</Text>
                    )}
                  </View>
                )}

                <View style={st.footRow}>
                  <Text style={st.time}>{new Date(a.timestamp).toLocaleString("en-PK")}</Text>
                  {a.location?.lat && (
                    <TouchableOpacity onPress={() =>
                      Linking.openURL(`https://maps.google.com/?q=${a.location.lat},${a.location.lng}&z=16`)}>
                      <Text style={st.mapLink}>📍 Map pe dekho</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {!a.isRead && (
                <TouchableOpacity style={st.readBtn} onPress={() => markRead(a._id)}>
                  <Text style={st.readBtnText}>✓</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },

  headRow: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: S.lg },
  title: { fontSize: 20, fontWeight: "bold", color: C.text },
  subRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" },
  unreadText: { fontSize: 12, color: C.red, fontWeight: "600" },
  fakePill: { backgroundColor: "#f3e8ff", paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full },
  fakePillText: { fontSize: 10, color: C.purple, fontWeight: "bold" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.gray, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#9ca3af" },
  liveText: { fontSize: 10, color: C.textFaint },
  headActions: { alignItems: "flex-end", gap: 8 },
  markAll: { color: C.primary, fontSize: 13, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 4, backgroundColor: "#fff",
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border2, padding: 2 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm },
  filterBtnActive: { backgroundColor: C.primary },
  filterText: { fontSize: 11, color: C.textSoft },
  filterTextActive: { color: "#fff", fontWeight: "600" },

  fakeBanner: { backgroundColor: C.purple, borderRadius: RADIUS.lg, padding: S.lg,
    marginBottom: S.md, flexDirection: "row", alignItems: "center" },
  fakeBannerTitle: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  fakeBannerSub: { color: "#e9d5ff", fontSize: 12, marginTop: 2 },

  allClear: { backgroundColor: C.greenL, borderWidth: 1, borderColor: "#bbf7d0",
    borderRadius: RADIUS.lg, padding: 40, alignItems: "center" },
  allClearText: { color: "#166534", fontWeight: "600", fontSize: 14 },

  alertCard: { borderLeftWidth: 4, borderRadius: RADIUS.lg, padding: S.lg,
    marginBottom: S.md, borderWidth: 1, borderTopColor: "transparent",
    borderRightColor: "transparent", borderBottomColor: "transparent" },
  alertRow: { flexDirection: "row" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  typeBadgeText: { fontSize: 10, fontWeight: "bold" },
  newBadge: { backgroundColor: C.primaryL, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.full },
  newBadgeText: { fontSize: 10, color: C.primary },
  empName: { fontSize: 14, fontWeight: "600", color: C.text },
  empId: { fontSize: 12, fontWeight: "400", color: C.textFaint },
  desc: { fontSize: 13, color: C.textSoft, marginTop: 2 },
  metaBox: { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: S.md,
    borderWidth: 1, borderColor: "#e9d5ff", marginTop: 8 },
  metaReason: { fontSize: 11, color: C.purple, marginBottom: 2 },
  metaInfo: { fontSize: 11, color: C.textFaint },
  footRow: { flexDirection: "row", alignItems: "center", gap: S.md, marginTop: 8 },
  time: { fontSize: 11, color: C.textFaint },
  mapLink: { color: C.primary, fontSize: 11 },
  readBtn: { borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  readBtnText: { color: C.textFaint, fontSize: 12 },
});
