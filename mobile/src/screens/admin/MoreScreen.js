// ================================================================
// ADMIN MORE — web AdminLayout sidebar ke baaki items ka menu
// Routes, Attendance, Alerts (badge), Reports, Settings, Logout
// + live count polling (AdminLayout jaisa)
// ================================================================
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../ui/kit";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

export default function MoreScreen() {
  const nav = useNavigation();
  const { user, actionLogout } = useAuth();
  const [alertCount, setAlertCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [alertRes, liveRes] = await Promise.allSettled([
          api.alertCount(), api.liveTracking()
        ]);
        if (alertRes.status === "fulfilled" && alertRes.value.ok)
          setAlertCount(alertRes.value.data.count);
        if (liveRes.status === "fulfilled" && liveRes.value.ok)
          setLiveCount((liveRes.value.data || []).length);
      } catch { /* ignore */ }
    };
    fetchCounts();
    const iv = setInterval(fetchCounts, 30000);
    return () => clearInterval(iv);
  }, []);

  const ITEMS = [
    { icon: "🗺️", label: "Routes", sub: "Routes banao aur assign karo", screen: "Routes" },
    { icon: "📸", label: "Attendance", sub: "Date-wise attendance + photos", screen: "Attendance" },
    { icon: "🚨", label: "Alerts", sub: "Fake GPS + deviations", screen: "Alerts", badge: alertCount },
    { icon: "📈", label: "Reports", sub: "Fuel, sessions, check-ins", screen: "Reports" },
    { icon: "⚙️", label: "Settings", sub: "Petrol price, server URL", screen: "Settings" },
  ];

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.logoBox}><Text style={{ fontSize: 20 }}>🚚</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Field Force</Text>
          <Text style={st.headerName}>{user?.name}</Text>
        </View>
        {liveCount > 0 && (
          <View style={st.livePill}>
            <View style={st.liveDot} />
            <Text style={st.liveText}>{liveCount} live</Text>
          </View>
        )}
      </View>

      {/* Menu items */}
      {ITEMS.map(item => (
        <TouchableOpacity key={item.screen} activeOpacity={0.7}
          onPress={() => nav.navigate("More", { screen: item.screen })}>
          <Card style={st.itemCard}>
            <View style={st.itemRow}>
              <View style={st.itemIcon}><Text style={{ fontSize: 18 }}>{item.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.itemLabel}>{item.label}</Text>
                <Text style={st.itemSub}>{item.sub}</Text>
              </View>
              {item.badge > 0 && (
                <View style={st.badge}><Text style={st.badgeText}>{item.badge}</Text></View>
              )}
              <Text style={st.chevron}>›</Text>
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      {/* Logout */}
      <TouchableOpacity style={st.logoutBtn} onPress={actionLogout}>
        <Text style={st.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>

      <Text style={st.footer}>Field Force · Fake GPS Protected</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },

  header: { backgroundColor: "#111827", borderRadius: RADIUS.lg, padding: S.lg,
    flexDirection: "row", alignItems: "center", gap: S.md, marginBottom: S.lg },
  logoBox: { width: 38, height: 38, backgroundColor: C.primary, borderRadius: 12,
    justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  headerName: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(34,197,94,0.15)", paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: RADIUS.full },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  liveText: { color: "#4ade80", fontSize: 11, fontWeight: "600" },

  itemCard: { padding: 0, marginBottom: S.sm },
  itemRow: { flexDirection: "row", alignItems: "center", padding: S.lg },
  itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryL,
    justifyContent: "center", alignItems: "center", marginRight: S.md },
  itemLabel: { fontSize: 15, fontWeight: "600", color: C.text },
  itemSub: { fontSize: 11, color: C.textFaint, marginTop: 2 },
  badge: { backgroundColor: C.red, borderRadius: RADIUS.full, minWidth: 20,
    height: 20, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 6, marginRight: 6 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  chevron: { color: C.textFaint, fontSize: 22, fontWeight: "300" },

  logoutBtn: { backgroundColor: C.red, borderRadius: RADIUS.lg,
    paddingVertical: 14, alignItems: "center", marginTop: S.md },
  logoutText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  footer: { color: C.textFaint, fontSize: 11, textAlign: "center", marginTop: S.xl },
});
