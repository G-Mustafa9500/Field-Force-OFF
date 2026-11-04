// ================================================================
// ADMIN DASHBOARD — web Dashboard.jsx ka port
// ================================================================
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { api } from "../../api/client";
import { todayStr, fmtTime } from "../../utils/date";
import { Card, Loading, Badge, StatCard } from "../../ui/kit";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

export default function DashboardScreen() {
  const nav = useNavigation();
  const [summary, setSummary] = useState(null);
  const [alerts,  setAlerts]  = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = todayStr();
        const [s, a, se] = await Promise.all([
          api.reportSummary(),
          api.alerts("?isRead=false"),
          api.trackingSessions(today)
        ]);
        if (s.ok) setSummary(s.data);
        if (a.ok) setAlerts((a.data || []).slice(0, 5));
        if (se.ok) setSessions((se.data || []).slice(0, 6));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Loading />;

  const STATS = [
    { label: "Aaj Attendance",  value: summary?.todayAttendance || 0, icon: "📸", bg: "#eff6ff", border: "#bfdbfe", color: C.primary },
    { label: "Active Trackers", value: summary?.activeSessions  || 0, icon: "📍", bg: C.greenL,  border: "#bbf7d0", color: C.green },
    { label: "Shop Check-ins",  value: summary?.todayCheckIns   || 0, icon: "🏪", bg: C.purpleL, border: "#e9d5ff", color: C.purple },
    { label: "Unread Alerts",   value: summary?.unreadAlerts    || 0, icon: "🚨", bg: C.redL,    border: "#fecaca", color: C.red },
  ];

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      <Text style={st.title}>Dashboard</Text>
      <Text style={st.date}>
        {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </Text>

      {/* Stats */}
      <View style={st.statsRow}>
        {STATS.map(s => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label}
            bg={s.bg} border={s.border} textColor={s.color} />
        ))}
      </View>

      {/* Live Sessions */}
      <Card>
        <View style={st.cardHead}>
          <Text style={st.cardTitle}>📍 Live Sessions Aaj</Text>
          <TouchableOpacity onPress={() => nav.navigate("More", { screen: "Reports" })}>
            <Text style={st.link}>Sab dekho</Text>
          </TouchableOpacity>
        </View>
        {sessions.length === 0
          ? <Text style={st.empty}>Koi active session nahi</Text>
          : sessions.map(s => (
              <View key={s._id} style={st.sessionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={st.sessionName}>{s.employee?.name}</Text>
                  <Text style={st.sessionRoute}>{s.route?.name || "No route"}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={st.sessionKm}>{(s.totalKm || 0).toFixed(1)} km</Text>
                  <Badge color={s.status === "active" ? C.greenL : C.gray}
                    textColor={s.status === "active" ? C.green : C.textFaint}>
                    {s.status === "active" ? "🟢 Live" : "✅ Done"}
                  </Badge>
                </View>
              </View>
            ))}
      </Card>

      {/* Recent Alerts */}
      <Card>
        <View style={st.cardHead}>
          <Text style={st.cardTitle}>🚨 Haaliya Alerts</Text>
          <TouchableOpacity onPress={() => nav.navigate("More", { screen: "Alerts" })}>
            <Text style={st.link}>Sab dekho</Text>
          </TouchableOpacity>
        </View>
        {alerts.length === 0
          ? (
            <View style={st.noAlerts}>
              <Text style={{ fontSize: 28, marginBottom: 4 }}>✅</Text>
              <Text style={st.noAlertsText}>Koi alert nahi! Sab theek hai.</Text>
            </View>
          )
          : alerts.map(a => (
              <View key={a._id} style={[st.alertRow,
                { backgroundColor: a.severity === "critical" ? C.redL : C.orangeL }]}>
                <Text style={{ fontSize: 16 }}>{a.severity === "critical" ? "🔴" : "⚠️"}</Text>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={st.alertName}>{a.employee?.name}</Text>
                  <Text style={st.alertDesc}>{a.description}</Text>
                  <Text style={st.alertTime}>{fmtTime(a.timestamp)}</Text>
                </View>
              </View>
            ))}
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "bold", color: C.text },
  date: { fontSize: 12, color: C.textFaint, marginTop: 2, marginBottom: S.lg },
  statsRow: { flexDirection: "row", marginBottom: S.lg, marginHorizontal: -3 },
  cardHead: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: S.sm },
  cardTitle: { fontSize: 14, fontWeight: "600", color: C.text },
  link: { fontSize: 12, color: C.primary },
  empty: { color: C.textFaint, fontSize: 13, textAlign: "center", paddingVertical: 16 },
  sessionRow: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 10, borderTopWidth: 1,
    borderTopColor: C.border },
  sessionName: { fontSize: 14, fontWeight: "500", color: C.text },
  sessionRoute: { fontSize: 11, color: C.textFaint },
  sessionKm: { fontSize: 13, fontWeight: "600", color: C.textSoft, marginBottom: 2 },
  noAlerts: { alignItems: "center", paddingVertical: 16 },
  noAlertsText: { fontSize: 13, color: C.green, fontWeight: "500" },
  alertRow: { flexDirection: "row", padding: S.md, borderRadius: RADIUS.md,
    marginBottom: 6 },
  alertName: { fontSize: 13, fontWeight: "600", color: C.text },
  alertDesc: { fontSize: 12, color: C.textSoft },
  alertTime: { fontSize: 11, color: C.textFaint, marginTop: 2 },
});
