// ================================================================
// ADMIN ATTENDANCE — web AttendancePage.jsx ka port
// Date filter, list with check-in/out photos, Google Maps link
// ================================================================
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Linking, Modal as RNModal } from "react-native";
import { api } from "../../api/client";
import { todayStr, fmtTime } from "../../utils/date";
import { Card, Loading, EmptyState, Badge } from "../../ui/kit";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

export default function AttendanceScreen() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayStr());
  const [bigPhoto, setBigPhoto] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.attendanceList(date);
      if (res.ok) setList(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [date]); // eslint-disable-line

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      <View style={st.headRow}>
        <Text style={st.title}>📸 Attendance</Text>
      </View>

      <View style={st.filterRow}>
        <TextInput style={st.dateInput} placeholder="YYYY-MM-DD"
          placeholderTextColor={C.textFaint} value={date}
          onChangeText={setDate} autoCapitalize="none" />
        <Text style={st.todayBtn} onPress={() => setDate(todayStr())}>Aaj</Text>
      </View>

      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState icon="📸" title="Is date pe koi attendance nahi" />
      ) : list.map(a => (
        <Card key={a._id}>
          <View style={st.attHead}>
            <View style={{ flex: 1 }}>
              <Text style={st.attName}>{a.employee?.name}</Text>
              <Text style={st.attMeta}>
                {a.employee?.employeeId} · {a.employee?.role?.replace("_", " ")}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              {a.checkInTime && (
                <Badge color={C.greenL} textColor={C.green}>✅ {fmtTime(a.checkInTime)}</Badge>
              )}
              {a.checkOutTime ? (
                <Badge color={C.redL} textColor={C.red}>🔴 {fmtTime(a.checkOutTime)}</Badge>
              ) : a.checkInTime ? (
                <Badge color={C.orangeL} textColor={C.orange}>Still out</Badge>
              ) : null}
            </View>
          </View>

          {/* Photos */}
          <View style={st.photoRow}>
            {a.checkInPhoto && (
              <TouchableOpacity onPress={() => setBigPhoto(a.checkInPhoto)}>
                <Image source={{ uri: a.checkInPhoto }} style={[st.photo, { borderColor: "#86efac" }]} />
                <View style={[st.photoTag, { backgroundColor: C.green }]}><Text style={st.photoTagText}>IN</Text></View>
              </TouchableOpacity>
            )}
            {a.checkOutPhoto && (
              <TouchableOpacity onPress={() => setBigPhoto(a.checkOutPhoto)}>
                <Image source={{ uri: a.checkOutPhoto }} style={[st.photo, { borderColor: "#fca5a5" }]} />
                <View style={[st.photoTag, { backgroundColor: C.red }]}><Text style={st.photoTagText}>OUT</Text></View>
              </TouchableOpacity>
            )}
            {!a.checkInPhoto && !a.checkOutPhoto && (
              <Text style={st.noPhotos}>No photos</Text>
            )}
          </View>

          {/* Location link */}
          {a.checkInLocation?.lat && (
            <TouchableOpacity onPress={() =>
              Linking.openURL(`https://maps.google.com/?q=${a.checkInLocation.lat},${a.checkInLocation.lng}`)}>
              <Text style={st.mapLink}>📍 Check-in location dekho (Google Maps)</Text>
            </TouchableOpacity>
          )}
        </Card>
      ))}

      {/* Big photo viewer */}
      <RNModal visible={!!bigPhoto} transparent animationType="fade"
        onRequestClose={() => setBigPhoto(null)}>
        <TouchableOpacity style={st.photoOverlay} activeOpacity={1}
          onPress={() => setBigPhoto(null)}>
          {bigPhoto && <Image source={{ uri: bigPhoto }} style={st.bigPhoto}
            resizeMode="contain" />}
          <View style={st.photoClose}><Text style={st.photoCloseText}>✕</Text></View>
        </TouchableOpacity>
      </RNModal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },
  headRow: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: S.md },
  title: { fontSize: 20, fontWeight: "bold", color: C.text },
  filterRow: { flexDirection: "row", gap: S.sm, alignItems: "center", marginBottom: S.md },
  dateInput: { flex: 1, borderWidth: 1, borderColor: C.border2,
    borderRadius: RADIUS.md, paddingHorizontal: S.md, paddingVertical: 8,
    fontSize: 14, backgroundColor: "#fff", color: C.text },
  todayBtn: { color: C.primary, fontSize: 13, fontWeight: "600", padding: 8 },

  attHead: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: S.sm },
  attName: { fontSize: 15, fontWeight: "600", color: C.text },
  attMeta: { fontSize: 11, color: C.textFaint, marginTop: 1 },

  photoRow: { flexDirection: "row", gap: S.sm },
  photo: { width: 52, height: 52, borderRadius: RADIUS.sm, borderWidth: 2 },
  photoTag: { position: "absolute", top: -4, right: -4, width: 18, height: 18,
    borderRadius: 9, justifyContent: "center", alignItems: "center" },
  photoTagText: { color: "#fff", fontSize: 8, fontWeight: "bold" },
  noPhotos: { color: C.textFaint, fontSize: 12 },

  mapLink: { color: C.primary, fontSize: 12, marginTop: S.sm },

  photoOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center", alignItems: "center", padding: S.lg },
  bigPhoto: { width: "100%", height: "80%", borderRadius: RADIUS.md },
  photoClose: { position: "absolute", top: 50, right: 20, width: 36, height: 36,
    borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center" },
  photoCloseText: { color: "#fff", fontSize: 18 },
});
