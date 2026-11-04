// ================================================================
// ADMIN ROUTE MANAGER — web RouteManager.jsx ka port
// Date filter, routes list, create/edit with shop ordering,
// employee assign, warehouse GPS (meri location / manual)
// ================================================================
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from "react-native";
import Geolocation from "react-native-geolocation-service";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { api } from "../../api/client";
import { todayStr } from "../../utils/date";
import { Card, Button, Loading, EmptyState, Sheet, Confirm, Input, Badge } from "../../ui/kit";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

const EMPTY_FORM = {
  name: "", routeDate: todayStr(), assignedTo: "",
  startPoint: { name: "Warehouse", lat: "", lng: "" },
  shops: []
};

export default function RouteManagerScreen() {
  const [routes, setRoutes] = useState([]);
  const [shops, setShops] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(false);
  const [editRoute, setEditRoute] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState(todayStr());
  const [error, setError] = useState("");
  const [delTarget, setDelTarget] = useState(null);
  const [empPicker, setEmpPicker] = useState(false);
  const [shopPicker, setShopPicker] = useState(false);

  const loadAll = async () => {
    try {
      const [r, s, e] = await Promise.all([
        api.routes(filterDate), api.shops(), api.employees()
      ]);
      if (r.ok) setRoutes(r.data);
      if (s.ok) setShops(s.data);
      if (e.ok) setEmployees(e.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, [filterDate]); // eslint-disable-line

  const openAdd = () => {
    setEditRoute(null);
    setForm({ ...EMPTY_FORM, routeDate: todayStr() });
    setError(""); setModal(true);
  };
  const openEdit = (r) => {
    setEditRoute(r);
    setForm({
      name: r.name,
      routeDate: r.routeDate || todayStr(),
      assignedTo: r.assignedTo?._id || "",
      startPoint: r.startPoint || EMPTY_FORM.startPoint,
      shops: (r.shops || []).map(s => ({ shop: s.shop?._id || s.shop, order: s.order }))
    });
    setError(""); setModal(true);
  };

  const addShop = (id) => {
    if (!id || form.shops.find(s => s.shop === id)) return;
    setForm(f => ({ ...f, shops: [...f.shops, { shop: id, order: f.shops.length + 1 }] }));
  };
  const removeShop = (id) =>
    setForm(f => ({ ...f, shops: f.shops.filter(s => s.shop !== id) }));
  const moveShop = (i, dir) => {
    const arr = [...form.shops];
    const swap = i + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[i], arr[swap]] = [arr[swap], arr[i]];
    setForm(f => ({ ...f, shops: arr.map((s, idx) => ({ ...s, order: idx + 1 })) }));
  };

  const useWarehouseLocation = async () => {
    let result = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    if (result !== RESULTS.GRANTED) {
      result = await request(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION);
    }
    if (result !== RESULTS.GRANTED) return;
    Geolocation.getCurrentPosition(
      pos => setForm(f => ({
        ...f,
        startPoint: {
          ...f.startPoint,
          lat: Math.round(pos.coords.latitude * 100000) / 100000,
          lng: Math.round(pos.coords.longitude * 100000) / 100000
        }
      })),
      () => {},
      { accuracy: { android: "high" }, enableHighAccuracy: true, timeout: 12000,
        showLocationDialog: true, forceRequestLocation: true }
    );
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const res = editRoute
        ? await api.updateRoute(editRoute._id, form)
        : await api.createRoute(form);
      if (!res.ok) { setError(res.data?.message || "Error hua"); return; }
      setModal(false); loadAll();
    } catch { setError("Error hua"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    setDelTarget(null);
    await api.deleteRoute(id);
    loadAll();
  };

  const getShopName = (id) => shops.find(s => s._id === id)?.name || "Shop";
  const selectedEmp = employees.find(e => e._id === form.assignedTo);

  if (loading) return <Loading />;

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      <View style={st.headRow}>
        <Text style={st.title}>🗺️ Routes</Text>
        <Button title="+ Naya Route" small onPress={openAdd} />
      </View>

      {/* Date Filter */}
      <Card style={{ padding: S.md }}>
        <Text style={st.filterLabel}>📅 Kisi din ke routes:</Text>
        <View style={st.filterRow}>
          <TextInput style={st.dateInput} placeholder="YYYY-MM-DD"
            placeholderTextColor={C.textFaint} value={filterDate}
            onChangeText={setFilterDate} autoCapitalize="none" />
          <Button title="Aaj" small outline color={C.primary}
            onPress={() => setFilterDate(todayStr())} />
        </View>
      </Card>

      {routes.length === 0 ? (
        <EmptyState icon="🗺️" title="Is date pe koi route nahi" />
      ) : routes.map(route => (
        <Card key={route._id}>
          <View style={st.routeHead}>
            <View style={{ flex: 1 }}>
              <Text style={st.routeName}>{route.name}</Text>
              <Text style={st.routeDate}>📅 {route.routeDate || "No date"}</Text>
              <Text style={st.routeEmp}>
                👤 {route.assignedTo ? `${route.assignedTo.name} (${route.assignedTo.employeeId})` : "Unassigned"}
              </Text>
            </View>
            <View style={st.routeActions}>
              <TouchableOpacity onPress={() => openEdit(route)}>
                <Text style={st.editBtn}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDelTarget(route._id)}>
                <Text style={st.delBtn}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Shop chain */}
          <View style={st.chainRow}>
            <Badge color={C.greenL} textColor={C.green}>🏭 {route.startPoint?.name}</Badge>
            {[...route.shops].sort((a, b) => (a.order || 0) - (b.order || 0)).map((s, i) => (
              <View key={i} style={st.chainItem}>
                <Text style={st.chainArrow}>→</Text>
                <Badge>{i + 1}. {s.shop?.name || "Shop"}</Badge>
              </View>
            ))}
            <Text style={st.chainArrow}>→</Text>
            <Badge color={C.greenL} textColor={C.green}>🏭 Wapas</Badge>
          </View>
          <Text style={st.shopCount}>{route.shops.length} shops</Text>
        </Card>
      ))}

      {/* Add/Edit modal */}
      <Sheet visible={modal} onClose={() => setModal(false)}
        title={editRoute ? "Route Edit" : "Naya Route"}>
        {error ? <Text style={st.formError}>{error}</Text> : null}
        <Input label="Route Naam *" value={form.name}
          onChangeText={v => setForm(f => ({ ...f, name: v }))} />
        <Input label="📅 Route Date (YYYY-MM-DD)" value={form.routeDate}
          onChangeText={v => setForm(f => ({ ...f, routeDate: v }))} autoCapitalize="none" />

        {/* Employee picker */}
        <Text style={st.label}>👤 Employee</Text>
        <TouchableOpacity style={st.pickerBtn} onPress={() => setEmpPicker(true)}>
          <Text style={[st.pickerText, !selectedEmp && { color: C.textFaint }]}>
            {selectedEmp ? `${selectedEmp.name} (${selectedEmp.employeeId})` : "Employee Select Karo"}
          </Text>
        </TouchableOpacity>

        {/* Warehouse location */}
        <View style={st.warehouseBox}>
          <Text style={st.label}>🏭 Warehouse Location</Text>
          <Button title="📍 Meri Location Use Karo" small outline
            color={C.green} onPress={useWarehouseLocation} />
          <View style={st.latlngRow}>
            <TextInput style={st.latlngInput} placeholder="Lat"
              placeholderTextColor={C.textFaint} keyboardType="numbers-and-punctuation"
              value={String(form.startPoint.lat || "")}
              onChangeText={v => setForm(f => ({ ...f, startPoint: { ...f.startPoint, lat: v } }))} />
            <TextInput style={st.latlngInput} placeholder="Lng"
              placeholderTextColor={C.textFaint} keyboardType="numbers-and-punctuation"
              value={String(form.startPoint.lng || "")}
              onChangeText={v => setForm(f => ({ ...f, startPoint: { ...f.startPoint, lng: v } }))} />
          </View>
        </View>

        {/* Shops order */}
        <View style={st.shopsBox}>
          <View style={st.shopsHead}>
            <Text style={st.label}>🏪 Shops (order mein add karo)</Text>
            <Button title="+ Shop" small onPress={() => setShopPicker(true)} />
          </View>
          {form.shops.length > 0 ? (
            form.shops.map((s, i) => (
              <View key={s.shop} style={st.orderRow}>
                <Text style={st.orderIdx}>{i + 1}.</Text>
                <Text style={st.orderName}>{getShopName(s.shop)}</Text>
                <TouchableOpacity onPress={() => moveShop(i, -1)} disabled={i === 0}>
                  <Text style={[st.orderBtn, i === 0 && { opacity: 0.2 }]}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveShop(i, +1)} disabled={i === form.shops.length - 1}>
                  <Text style={[st.orderBtn, i === form.shops.length - 1 && { opacity: 0.2 }]}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeShop(s.shop)}>
                  <Text style={st.orderDel}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : <Text style={st.noShops}>Koi shop nahi add ki</Text>}
        </View>

        <View style={st.btnRow}>
          <Button title="Cancel" onPress={() => setModal(false)} outline
            color={C.textSoft} style={{ flex: 1 }} />
          <Button title={saving ? "Saving..." : "Save Route"} onPress={save}
            disabled={saving} busy={saving} style={{ flex: 1 }} />
        </View>
      </Sheet>

      {/* Employee picker sheet */}
      <Sheet visible={empPicker} onClose={() => setEmpPicker(false)} title="Employee Select Karo">
        <TouchableOpacity style={st.pickRow}
          onPress={() => { setForm(f => ({ ...f, assignedTo: "" })); setEmpPicker(false); }}>
          <Text style={[st.pickText, { color: C.textFaint }]}>— Koi nahi (Unassigned) —</Text>
        </TouchableOpacity>
        {employees.map(e => (
          <TouchableOpacity key={e._id} style={st.pickRow}
            onPress={() => { setForm(f => ({ ...f, assignedTo: e._id })); setEmpPicker(false); }}>
            <Text style={st.pickText}>{e.name} ({e.employeeId})</Text>
          </TouchableOpacity>
        ))}
      </Sheet>

      {/* Shop picker sheet */}
      <Sheet visible={shopPicker} onClose={() => setShopPicker(false)} title="Shop Add Karo">
        {shops.filter(s => !form.shops.find(fs => fs.shop === s._id)).length === 0 ? (
          <Text style={st.noShops}>Sab shops already added hain</Text>
        ) : shops.filter(s => !form.shops.find(fs => fs.shop === s._id)).map(s => (
          <TouchableOpacity key={s._id} style={st.pickRow}
            onPress={() => { addShop(s._id); setShopPicker(false); }}>
            <Text style={st.pickText}>{s.name}{s.area ? ` — ${s.area}` : ""}</Text>
          </TouchableOpacity>
        ))}
      </Sheet>

      {/* Delete confirm */}
      <Confirm visible={!!delTarget} title="Route Delete?"
        message="Route delete karo?"
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
  filterLabel: { fontSize: 12, color: C.textSoft, marginBottom: 6, fontWeight: "500" },
  filterRow: { flexDirection: "row", gap: S.sm, alignItems: "center" },
  dateInput: { flex: 1, borderWidth: 1, borderColor: C.border2,
    borderRadius: RADIUS.md, paddingHorizontal: S.md, paddingVertical: 8,
    fontSize: 14, backgroundColor: "#fff", color: C.text },

  routeHead: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: S.sm },
  routeName: { fontSize: 15, fontWeight: "600", color: C.text },
  routeDate: { fontSize: 11, color: C.primary, fontWeight: "500", marginTop: 2 },
  routeEmp: { fontSize: 12, color: C.textSoft, marginTop: 2 },
  routeActions: { flexDirection: "row", gap: S.md },
  editBtn: { color: C.primary, fontSize: 12, fontWeight: "600" },
  delBtn: { color: C.red, fontSize: 12, fontWeight: "600" },

  chainRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
  chainItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  chainArrow: { color: "#d1d5db", fontSize: 11 },
  shopCount: { fontSize: 11, color: C.textFaint, marginTop: 8 },

  formError: { backgroundColor: C.redL, color: C.red, paddingHorizontal: 10,
    paddingVertical: 8, borderRadius: RADIUS.md, fontSize: 12, marginBottom: S.md },
  label: { fontSize: 12, color: C.textSoft, marginBottom: 6, fontWeight: "500" },
  pickerBtn: { borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    paddingHorizontal: S.md, paddingVertical: 10, backgroundColor: "#fff",
    marginBottom: S.md },
  pickerText: { fontSize: 13, color: C.text },

  warehouseBox: { borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    padding: S.md, marginBottom: S.md },
  latlngRow: { flexDirection: "row", gap: S.sm, marginTop: S.sm },
  latlngInput: { flex: 1, borderWidth: 1, borderColor: C.border2,
    borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, backgroundColor: "#fff", color: C.text },

  shopsBox: { borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    padding: S.md, marginBottom: S.md },
  shopsHead: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "center" },
  orderRow: { flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: C.gray, borderRadius: RADIUS.sm, paddingHorizontal: 8,
    paddingVertical: 6, marginTop: 6 },
  orderIdx: { color: C.textFaint, fontSize: 12, width: 18 },
  orderName: { flex: 1, fontSize: 13, color: C.text },
  orderBtn: { color: C.textFaint, fontSize: 14, paddingHorizontal: 4 },
  orderDel: { color: "#f87171", fontSize: 12, paddingHorizontal: 4 },
  noShops: { fontSize: 12, color: C.textFaint, textAlign: "center", paddingVertical: 10 },

  btnRow: { flexDirection: "row", gap: S.sm, marginTop: S.sm },
  pickRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  pickText: { fontSize: 14, color: C.text },
});
