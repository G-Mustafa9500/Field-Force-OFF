// ================================================================
// ADMIN SHOPS — web Shops.jsx ka port
// Location ke 3 options:
//   1) Lat/Lng manually type
//   2) 📍 Meri Location (GPS)
//   3) Google Maps link paste → lat/lng auto-extract
// ================================================================
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Linking, Alert as RNAlert } from "react-native";
import Geolocation from "react-native-geolocation-service";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { api } from "../../api/client";
import { Card, Button, Loading, EmptyState, Sheet, Confirm, Input } from "../../ui/kit";
import { parseGeoLink } from "../employee/EmployeeHomeScreen";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

const EMPTY = { name: "", ownerName: "", phone: "", address: "", area: "", location: { lat: "", lng: "" } };

export default function ShopsScreen() {
  const [shops, setShops] = useState([]);
  const [modal, setModal] = useState(false);
  const [editShop, setEditShop] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [delTarget, setDelTarget] = useState(null);
  const [error, setError] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [locating, setLocating] = useState(false);

  const loadShops = async () => {
    try {
      const res = await api.shops();
      if (res.ok) setShops(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { loadShops(); }, []);

  const openAdd = () => { setEditShop(null); setForm(EMPTY); setMapLink(""); setError(""); setModal(true); };
  const openEdit = (s) => {
    setEditShop(s);
    setForm({
      name: s.name, ownerName: s.ownerName || "", phone: s.phone || "",
      address: s.address || "", area: s.area || "",
      location: { lat: String(s.location?.lat ?? ""), lng: String(s.location?.lng ?? "") }
    });
    setMapLink("");
    setError("");
    setModal(true);
  };

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setLoc = (lat, lng) => setForm(f => ({ ...f, location: { lat: String(lat), lng: String(lng) } }));

  // ── Option 2: Meri Location ─────────────────────────────────
  const useMyLocation = async () => {
    let result = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    if (result !== RESULTS.GRANTED) {
      result = await request(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION);
    }
    if (result !== RESULTS.GRANTED) {
      RNAlert.alert("Permission", "Location permission zaroori hai");
      return;
    }
    setLocating(true);
    Geolocation.getCurrentPosition(
      pos => {
        setLoc(
          Math.round(pos.coords.latitude * 100000) / 100000,
          Math.round(pos.coords.longitude * 100000) / 100000
        );
        setLocating(false);
        RNAlert.alert("✅ Location set", "Meri location shop pe set ho gayi");
      },
      () => { setLocating(false); RNAlert.alert("❌", "Location nahi mila"); },
      { accuracy: { android: "high" }, enableHighAccuracy: true, timeout: 12000,
        showLocationDialog: true, forceRequestLocation: true }
    );
  };

  // ── Option 3: Google Maps link parse ────────────────────────
  const useMapLink = () => {
    const loc = parseGeoLink(mapLink);
    if (!loc) {
      RNAlert.alert("❌", "Link se location nahi mili — Google Maps mein shop pe long press karke link copy karo (jisme @lat,lng ho)");
      return;
    }
    setLoc(loc.lat, loc.lng);
    setMapLink("");
    RNAlert.alert("✅ Location set", `${loc.lat}, ${loc.lng}`);
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        location: { lat: Number(form.location.lat), lng: Number(form.location.lng) }
      };
      if (!payload.location.lat || !payload.location.lng) {
        setError("Location set karo (lat/lng, meri location, ya Google link)");
        return;
      }
      const res = editShop
        ? await api.updateShop(editShop._id, payload)
        : await api.createShop(payload);
      if (!res.ok) { setError(res.data?.message || "Error hua"); return; }
      setModal(false); loadShops();
    } catch { setError("Error hua"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    setDelTarget(null);
    await api.deleteShop(id);
    loadShops();
  };

  const filtered = shops.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    (s.area || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      <View style={st.headRow}>
        <Text style={st.title}>🏪 Shops</Text>
        <Button title="+ Add Shop" small onPress={openAdd} />
      </View>

      <TextInput style={st.search} placeholder="🔍 Shop ya area search karo..."
        placeholderTextColor={C.textFaint} value={search} onChangeText={setSearch} />

      {filtered.length === 0 ? (
        <EmptyState icon="🏪" title="Koi shop nahi mili" />
      ) : (
        <View style={st.grid}>
          {filtered.map(shop => (
            <Card key={shop._id} style={st.gridItem}>
              <View style={st.shopHead}>
                <View style={{ flex: 1 }}>
                  <Text style={st.shopName}>{shop.name}</Text>
                  {shop.area ? <Text style={st.shopArea}>{shop.area}</Text> : null}
                </View>
                <View style={st.shopActions}>
                  <TouchableOpacity onPress={() => openEdit(shop)}>
                    <Text style={st.editBtn}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDelTarget(shop._id)}>
                    <Text style={st.delBtn}>Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {shop.ownerName ? <Text style={st.shopMeta}>👤 {shop.ownerName}</Text> : null}
              {shop.phone ? <Text style={st.shopMeta}>📞 {shop.phone}</Text> : null}
              {shop.address ? <Text style={st.shopMeta}>📍 {shop.address}</Text> : null}
              <TouchableOpacity onPress={() =>
                Linking.openURL(`https://maps.google.com/?q=${shop.location.lat},${shop.location.lng}&z=17`)}>
                <Text style={st.mapLink}>
                  🗺️ {shop.location.lat?.toFixed?.(5) ?? shop.location.lat}, {shop.location.lng?.toFixed?.(5) ?? shop.location.lng}
                </Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      )}

      {/* Add/Edit modal */}
      <Sheet visible={modal} onClose={() => setModal(false)}
        title={editShop ? "Shop Edit" : "Naya Shop"}>
        {error ? <Text style={st.formError}>{error}</Text> : null}
        <View style={st.twoCol}>
          <Input label="Shop Naam *" value={form.name} onChangeText={v => F("name", v)} style={{ flex: 1 }} />
          <Input label="Area" value={form.area} onChangeText={v => F("area", v)} style={{ flex: 1 }} />
        </View>
        <View style={st.twoCol}>
          <Input label="Owner Naam" value={form.ownerName} onChangeText={v => F("ownerName", v)} style={{ flex: 1 }} />
          <Input label="Phone" value={form.phone} onChangeText={v => F("phone", v)} keyboardType="phone-pad" style={{ flex: 1 }} />
        </View>
        <Input label="Pata / Address" value={form.address} onChangeText={v => F("address", v)} />

        {/* GPS Location — 3 options */}
        <View style={st.locSection}>
          <Text style={st.locTitle}>📍 Shop GPS Location</Text>
          <Text style={st.locSub}>3 tareeqe — koi bhi use karo</Text>

          {/* Option 2: Meri Location */}
          <Button title={locating ? "📍 Location le raha..." : "📍 Meri Location Use Karo"}
            onPress={useMyLocation} busy={locating} small style={{ marginBottom: 8 }} />

          {/* Option 3: Google Maps link */}
          <View style={st.linkRow}>
            <TextInput style={st.linkInput}
              placeholder="Google Maps link paste karo..."
              placeholderTextColor={C.textFaint}
              autoCapitalize="none" value={mapLink}
              onChangeText={setMapLink} />
            <Button title="Parse" small onPress={useMapLink} />
          </View>

          {/* Option 1: Manual */}
          <View style={st.linkRow}>
            <TextInput style={[st.linkInput, { flex: 1 }]} placeholder="Latitude"
              placeholderTextColor={C.textFaint} keyboardType="numbers-and-punctuation"
              value={form.location.lat}
              onChangeText={v => setForm(f => ({ ...f, location: { ...f.location, lat: v } }))} />
            <TextInput style={[st.linkInput, { flex: 1 }]} placeholder="Longitude"
              placeholderTextColor={C.textFaint} keyboardType="numbers-and-punctuation"
              value={form.location.lng}
              onChangeText={v => setForm(f => ({ ...f, location: { ...f.location, lng: v } }))} />
          </View>

          {form.location.lat && form.location.lng ? (
            <Text style={st.locPreview}>📌 {form.location.lat}, {form.location.lng}</Text>
          ) : null}
        </View>

        <View style={st.btnRow}>
          <Button title="Cancel" onPress={() => setModal(false)} outline
            color={C.textSoft} style={{ flex: 1 }} />
          <Button title={saving ? "Saving..." : "Save Shop"} onPress={save}
            disabled={saving} busy={saving} style={{ flex: 1 }} />
        </View>
      </Sheet>

      {/* Delete confirm */}
      <Confirm visible={!!delTarget} title="Shop Delete?"
        message="Shop delete karo? Ye wapas nahi aayegi."
        onYes={() => del(delTarget)} onNo={() => setDelTarget(null)} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },
  headRow: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: S.md },
  title: { fontSize: 20, fontWeight: "bold", color: C.text },
  search: { borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    paddingHorizontal: S.md, paddingVertical: 10, fontSize: 14,
    backgroundColor: "#fff", marginBottom: S.md, color: C.text },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  gridItem: { width: "100%" },

  shopHead: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 4 },
  shopName: { fontSize: 15, fontWeight: "600", color: C.text },
  shopArea: { fontSize: 11, color: C.primary, fontWeight: "500" },
  shopActions: { flexDirection: "row", gap: S.md },
  editBtn: { color: C.primary, fontSize: 12 },
  delBtn: { color: C.red, fontSize: 12 },
  shopMeta: { fontSize: 11, color: C.textSoft, marginTop: 2 },
  mapLink: { fontSize: 11, color: "#60a5fa", marginTop: 4 },

  formError: { backgroundColor: C.redL, color: C.red, paddingHorizontal: 10,
    paddingVertical: 8, borderRadius: RADIUS.md, fontSize: 12, marginBottom: S.md },
  twoCol: { flexDirection: "row", gap: S.sm },

  locSection: { borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    padding: S.md, marginBottom: S.md },
  locTitle: { fontSize: 12, fontWeight: "600", color: C.textSoft },
  locSub: { fontSize: 10, color: C.textFaint, marginBottom: S.md },
  linkRow: { flexDirection: "row", gap: S.sm, alignItems: "center", marginBottom: 8 },
  linkInput: { flex: 1, borderWidth: 1, borderColor: C.border2,
    borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, backgroundColor: "#fff", color: C.text },
  locPreview: { fontSize: 11, color: C.textSoft, textAlign: "center",
    backgroundColor: C.gray, borderRadius: RADIUS.sm, paddingVertical: 6 },
  btnRow: { flexDirection: "row", gap: S.sm, marginTop: S.sm },
});
