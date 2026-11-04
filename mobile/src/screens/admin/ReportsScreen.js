// ================================================================
// ADMIN REPORTS — web ReportsPage.jsx ka port
// Fuel / Sessions / Check-ins tabs, date range, CSV share
// ================================================================
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Modal as RNModal, Share } from "react-native";
import { api } from "../../api/client";
import { todayStr, fmtTime } from "../../utils/date";
import { Card, Loading, Button, Badge } from "../../ui/kit";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

const TABS = [
  { id: "fuel",     label: "⛽ Fuel" },
  { id: "sessions", label: "📍 Sessions" },
  { id: "checkins", label: "🏪 Check-ins" },
];

export default function ReportsScreen() {
  const [tab, setTab] = useState("fuel");
  const [fuel, setFuel] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [bigPhoto, setBigPhoto] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [f, s, c] = await Promise.all([
        api.reportFuel(startDate, endDate),
        api.trackingSessions(startDate),
        api.reportCheckins(startDate)
      ]);
      if (f.ok) setFuel(f.data);
      if (s.ok) setSessions(s.data);
      if (c.ok) setCheckIns(c.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [startDate, endDate]); // eslint-disable-line

  const totalKm = fuel.reduce((s, r) => s + (r.totalKm || 0), 0);
  const totalAmt = fuel.reduce((s, r) => s + (r.fuelAmount || 0), 0);

  // CSV export → Android share sheet (WhatsApp/Drive/email)
  const exportCSV = async () => {
    const rows = [["Employee", "ID", "Role", "Days", "KM", "Liters", "Petrol Amount (Rs)", "Deviations"]];
    fuel.forEach(r => rows.push([
      r.employee?.name || "—", r.employee?.employeeId || "—",
      r.employee?.role?.replace("_", " ") || "—",
      r.days || 0, Number(r.totalKm || 0).toFixed(1), Number(r.fuelUsed || 0).toFixed(2),
      r.fuelAmount || 0, r.deviations || 0
    ]));
    rows.push(["TOTAL", "", "", fuel.reduce((s, r) => s + r.days, 0), totalKm.toFixed(1), "", totalAmt, ""]);
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    try {
      await Share.share({
        title: `fuel-report-${startDate}-to-${endDate}.csv`,
        message: csv
      });
    } catch { /* user cancelled */ }
  };

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      <Text style={st.title}>📈 Reports</Text>

      {/* Date filter */}
      <Card style={{ padding: S.md }}>
        <View style={st.filterRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.filterLabel}>Start</Text>
            <TextInput style={st.dateInput} placeholder="YYYY-MM-DD"
              placeholderTextColor={C.textFaint} value={startDate}
              onChangeText={setStartDate} autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.filterLabel}>End</Text>
            <TextInput style={st.dateInput} placeholder="YYYY-MM-DD"
              placeholderTextColor={C.textFaint} value={endDate}
              onChangeText={setEndDate} autoCapitalize="none" />
          </View>
          <Button title="Filter" small onPress={load} style={{ marginTop: 16 }} />
        </View>
        {tab === "fuel" && fuel.length > 0 && (
          <Button title="⬇️ Export CSV (Share)" color={C.green} small
            onPress={exportCSV} style={{ marginTop: S.sm }} />
        )}
      </Card>

      {/* Tabs */}
      <View style={st.tabsRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} style={[st.tabBtn, tab === t.id && st.tabBtnActive]}
            onPress={() => setTab(t.id)}>
            <Text style={[st.tabText, tab === t.id && st.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <Loading /> : (
        <>
          {/* ── FUEL ── */}
          {tab === "fuel" && (
            <View>
              <View style={st.statsRow}>
                <View style={[st.totalBox, { backgroundColor: C.primaryL, borderColor: "#bfdbfe" }]}>
                  <Text style={st.totalLabel}>Total KM</Text>
                  <Text style={[st.totalValue, { color: C.primary }]}>{totalKm.toFixed(1)} km</Text>
                </View>
                <View style={[st.totalBox, { backgroundColor: C.greenL, borderColor: "#bbf7d0" }]}>
                  <Text style={st.totalLabel}>Total Petrol Cost</Text>
                  <Text style={[st.totalValue, { color: C.green }]}>Rs. {totalAmt.toLocaleString()}</Text>
                </View>
              </View>

              {fuel.length === 0 ? (
                <Text style={st.empty}>Is period mein koi data nahi</Text>
              ) : fuel.map(r => (
                <Card key={r.employee?._id || r.employeeId}>
                  <View style={st.fuelRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.fuelName}>{r.employee?.name || "—"}</Text>
                      <Text style={st.fuelMeta}>
                        {r.employee?.employeeId} · {r.employee?.bikeAverage}km/L · {r.employee?.role?.replace("_", " ")}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={st.fuelKm}>{(r.totalKm || 0).toFixed(1)} km</Text>
                      <Text style={st.fuelAmount}>Rs. {(r.fuelAmount || 0).toLocaleString()}</Text>
                      <Text style={st.fuelMeta}>{r.days || 0} days · {(r.fuelUsed || 0).toFixed(2)}L</Text>
                      {r.deviations > 0
                        ? <Text style={st.devText}>⚠️ {r.deviations}</Text>
                        : <Text style={st.okText}>✅ 0</Text>}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* ── SESSIONS ── */}
          {tab === "sessions" && (
            sessions.length === 0 ? (
              <Text style={st.empty}>Koi session nahi</Text>
            ) : sessions.map(s => (
              <Card key={s._id}>
                <View style={st.sessRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.fuelName}>{s.employee?.name}</Text>
                    <Text style={st.fuelMeta}>{s.employee?.employeeId} · {s.route?.name || "No route"}</Text>
                    <View style={st.sessTimes}>
                      {s.startTime && <Text style={st.timeIn}>▶ {fmtTime(s.startTime)}</Text>}
                      {s.endTime && <Text style={st.timeOut}>■ {fmtTime(s.endTime)}</Text>}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={st.fuelKm}>{(s.totalKm || 0).toFixed(2)} km</Text>
                    <Text style={st.okText}>Rs. {(s.fuelAmount || 0).toLocaleString()}</Text>
                    {s.deviationCount > 0 && <Text style={st.devText}>⚠️ {s.deviationCount}</Text>}
                    <Badge color={s.status === "active" ? C.greenL : C.gray}
                      textColor={s.status === "active" ? C.green : C.textFaint}>
                      {s.status === "active" ? "🟢 Live" : "✅ Done"}
                    </Badge>
                  </View>
                </View>
              </Card>
            ))
          )}

          {/* ── CHECK-INS ── */}
          {tab === "checkins" && (
            checkIns.length === 0 ? (
              <Text style={st.empty}>Koi check-in nahi</Text>
            ) : checkIns.map(c => (
              <Card key={c._id} style={{ padding: S.md }}>
                <View style={st.ciRow}>
                  {c.photo && (
                    <TouchableOpacity onPress={() => setBigPhoto(c.photo)}>
                      <Image source={{ uri: c.photo }} style={st.ciPhoto} />
                    </TouchableOpacity>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={st.fuelName}>
                      {c.employee?.name} <Text style={st.fuelMeta}>({c.employee?.employeeId})</Text>
                    </Text>
                    <Text style={st.ciShop}>🏪 {c.shop?.name}</Text>
                    <Text style={st.fuelMeta}>{c.shop?.area} · {fmtTime(c.timestamp)}</Text>
                  </View>
                  {c.checkInStatus === "verified"
                    ? <Badge color={C.greenL} textColor={C.green}>✅ Verified</Badge>
                    : <Badge color={C.yellowL} textColor={C.yellow}>⚠️ {c.distanceFromShop}m</Badge>}
                </View>
              </Card>
            ))
          )}
        </>
      )}

      {/* Big photo viewer */}
      <RNModal visible={!!bigPhoto} transparent animationType="fade"
        onRequestClose={() => setBigPhoto(null)}>
        <TouchableOpacity style={st.photoOverlay} activeOpacity={1}
          onPress={() => setBigPhoto(null)}>
          {bigPhoto && <Image source={{ uri: bigPhoto }} style={st.bigPhoto} resizeMode="contain" />}
        </TouchableOpacity>
      </RNModal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "bold", color: C.text, marginBottom: S.md },

  filterRow: { flexDirection: "row", gap: S.sm, alignItems: "flex-end" },
  filterLabel: { fontSize: 11, color: C.textFaint, marginBottom: 4 },
  dateInput: { borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    paddingHorizontal: S.md, paddingVertical: 8, fontSize: 13,
    backgroundColor: "#fff", color: C.text },

  tabsRow: { flexDirection: "row", gap: S.sm, marginBottom: S.md },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md,
    backgroundColor: "#fff", borderWidth: 1, borderColor: C.border2 },
  tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { fontSize: 13, color: C.textSoft },
  tabTextActive: { color: "#fff", fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: S.sm, marginBottom: S.md },
  totalBox: { flex: 1, borderRadius: RADIUS.lg, borderWidth: 1, padding: S.lg },
  totalLabel: { fontSize: 11, color: C.textFaint, fontWeight: "500" },
  totalValue: { fontSize: 18, fontWeight: "bold", marginTop: 2 },

  empty: { color: C.textFaint, textAlign: "center", paddingVertical: 30, fontSize: 13 },

  fuelRow: { flexDirection: "row", justifyContent: "space-between" },
  fuelName: { fontSize: 14, fontWeight: "600", color: C.text },
  fuelMeta: { fontSize: 11, color: C.textFaint, marginTop: 1 },
  fuelKm: { fontSize: 14, fontWeight: "bold", color: C.text },
  fuelAmount: { fontSize: 13, fontWeight: "600", color: C.green, marginTop: 2 },
  devText: { fontSize: 11, color: C.red, fontWeight: "600", marginTop: 2 },
  okText: { fontSize: 11, color: C.green, marginTop: 2 },

  sessRow: { flexDirection: "row", justifyContent: "space-between" },
  sessTimes: { flexDirection: "row", gap: S.md, marginTop: 4 },
  timeIn: { fontSize: 11, color: C.green },
  timeOut: { fontSize: 11, color: C.red },

  ciRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  ciPhoto: { width: 44, height: 44, borderRadius: RADIUS.sm },
  ciShop: { fontSize: 13, color: C.primary },

  photoOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center", alignItems: "center", padding: S.lg },
  bigPhoto: { width: "100%", height: "80%", borderRadius: RADIUS.md },
});
