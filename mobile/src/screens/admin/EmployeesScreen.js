// ================================================================
// ADMIN EMPLOYEES — web Employees.jsx ka port
// List + add/edit/delete (route assign Routes page se hota hai)
// ================================================================
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { api } from "../../api/client";
import { Card, Button, Loading, EmptyState, Badge, Sheet, Confirm, Input } from "../../ui/kit";
import { C, RADIUS, SPACING as S } from "../../ui/theme";

const EMPTY = { name: "", email: "", password: "", phone: "", role: "order_booker", bikeAverage: "40" };

const ROLES = [
  { id: "order_booker", label: "📋 Order Booker" },
  { id: "delivery_boy", label: "🛵 Delivery Boy" },
];

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [delTarget, setDelTarget] = useState(null);
  const [error, setError] = useState("");

  const loadAll = async () => {
    try {
      const res = await api.employees();
      if (res.ok) setEmployees(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const openAdd = () => { setEditEmp(null); setForm(EMPTY); setError(""); setModal(true); };
  const openEdit = (emp) => {
    setEditEmp(emp);
    setForm({
      name: emp.name, email: emp.email, password: "",
      phone: emp.phone || "", role: emp.role,
      bikeAverage: String(emp.bikeAverage || 40)
    });
    setError("");
    setModal(true);
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const payload = { ...form, bikeAverage: Number(form.bikeAverage) || 40 };
      if (!payload.password) delete payload.password;
      const res = editEmp
        ? await api.updateEmployee(editEmp._id, payload)
        : await api.createEmployee(payload);
      if (!res.ok) { setError(res.data?.message || "Error hua"); return; }
      setModal(false); loadAll();
    } catch { setError("Error hua"); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    setDelTarget(null);
    await api.deleteEmployee(id);
    loadAll();
  };

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const filtered = employees.filter(emp =>
    emp.name?.toLowerCase().includes(search.toLowerCase()) ||
    (emp.employeeId || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      <View style={st.headRow}>
        <Text style={st.title}>👥 Employees</Text>
        <Button title="+ Add Employee" small onPress={openAdd} />
      </View>

      {/* Info banner */}
      <View style={st.infoBanner}>
        <Text style={st.infoText}>
          💡 Route assign karne ke liye — Routes page pe jao, route banao aur employee select karo. Yahan sirf employee details hain.
        </Text>
      </View>

      <TextInput style={st.search} placeholder="🔍 Naam ya Employee ID search karo..."
        placeholderTextColor={C.textFaint} value={search} onChangeText={setSearch} />

      {filtered.length === 0 ? (
        <EmptyState icon="👥" title="Koi employee nahi mila" />
      ) : filtered.map(emp => (
        <Card key={emp._id}>
          <View style={st.empHead}>
            <View style={{ flex: 1 }}>
              <Text style={st.empName}>{emp.name}</Text>
              <Text style={st.empMeta}>{emp.employeeId} · {emp.email}</Text>
              {emp.phone ? <Text style={st.empMeta}>📞 {emp.phone}</Text> : null}
            </View>
            <Badge color={emp.role === "delivery_boy" ? C.orangeL : C.primaryL}
              textColor={emp.role === "delivery_boy" ? C.orange : C.primary}>
              {emp.role === "delivery_boy" ? "🛵 Delivery Boy" : "📋 Order Booker"}
            </Badge>
          </View>

          <View style={st.empRow}>
            <Text style={st.empLabel}>⛽ Bike Avg:</Text>
            <Text style={st.empValue}>{emp.bikeAverage || "—"} km/L</Text>
          </View>
          <View style={st.empRow}>
            <Text style={st.empLabel}>🗺️ Route (Aaj):</Text>
            {emp.assignedRoute
              ? <Badge color={C.greenL} textColor={C.green}>✅ {emp.assignedRoute.name}</Badge>
              : <Text style={st.noRoute}>Route assign nahi</Text>}
          </View>

          <View style={st.actions}>
            <TouchableOpacity onPress={() => openEdit(emp)}>
              <Text style={st.editBtn}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDelTarget(emp._id)}>
              <Text style={st.delBtn}>Deactivate</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}

      {/* Add/Edit modal */}
      <Sheet visible={modal} onClose={() => setModal(false)}
        title={editEmp ? "Employee Edit" : "Naya Employee"}>
        <Text style={st.sheetSub}>Route alag se Routes page se assign karo</Text>
        {error ? <Text style={st.formError}>{error}</Text> : null}
        <Input label="Naam *" value={form.name} onChangeText={v => F("name", v)} />
        <Input label="Email *" value={form.email} onChangeText={v => F("email", v)}
          keyboardType="email-address" autoCapitalize="none" />
        <Input label={editEmp ? "Naya Password (khali choro agar same rakhna hai)" : "Password *"}
          value={form.password} onChangeText={v => F("password", v)} secureTextEntry />
        <Input label="Phone Number" value={form.phone} onChangeText={v => F("phone", v)}
          keyboardType="phone-pad" />

        <Text style={st.label}>Role</Text>
        <View style={st.roleRow}>
          {ROLES.map(r => (
            <TouchableOpacity key={r.id} style={[st.roleBtn,
              form.role === r.id && st.roleBtnActive]}
              onPress={() => F("role", r.id)}>
              <Text style={[st.roleBtnText, form.role === r.id && st.roleBtnTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="⛽ Bike Average (km per liter) — petrol expense isi se calculate hoga"
          value={form.bikeAverage} onChangeText={v => F("bikeAverage", v)}
          keyboardType="number-pad" />

        <View style={st.btnRow}>
          <Button title="Cancel" onPress={() => setModal(false)} outline
            color={C.textSoft} style={{ flex: 1 }} />
          <Button title={saving ? "Saving..." : "Save"} onPress={save}
            disabled={saving} busy={saving} style={{ flex: 1 }} />
        </View>
      </Sheet>

      {/* Delete confirm */}
      <Confirm visible={!!delTarget} title="Employee Deactivate?"
        message="Employee deactivate karna chahte ho?"
        onYes={() => deactivate(delTarget)} onNo={() => setDelTarget(null)} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },
  headRow: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: S.md },
  title: { fontSize: 20, fontWeight: "bold", color: C.text },
  infoBanner: { backgroundColor: C.primaryL, borderWidth: 1, borderColor: "#bfdbfe",
    borderRadius: RADIUS.md, padding: S.md, marginBottom: S.md },
  infoText: { color: C.primary, fontSize: 12 },
  search: { borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    paddingHorizontal: S.md, paddingVertical: 10, fontSize: 14,
    backgroundColor: "#fff", marginBottom: S.md, color: C.text },

  empHead: { flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: S.sm },
  empName: { fontSize: 15, fontWeight: "600", color: C.text },
  empMeta: { fontSize: 11, color: C.textFaint, marginTop: 1 },
  empRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  empLabel: { fontSize: 12, color: C.textSoft },
  empValue: { fontSize: 12, fontWeight: "600", color: C.text },
  noRoute: { fontSize: 11, color: C.textFaint, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: S.lg, marginTop: S.md,
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: S.sm },
  editBtn: { color: C.primary, fontSize: 12, fontWeight: "600" },
  delBtn: { color: C.red, fontSize: 12, fontWeight: "600" },

  sheetSub: { fontSize: 11, color: C.textFaint, marginBottom: S.md, marginTop: -8 },
  formError: { backgroundColor: C.redL, color: C.red, paddingHorizontal: 10,
    paddingVertical: 8, borderRadius: RADIUS.md, fontSize: 12, marginBottom: S.md },
  label: { fontSize: 12, color: C.textSoft, marginBottom: 4, fontWeight: "500" },
  roleRow: { flexDirection: "row", gap: S.sm, marginBottom: S.md },
  roleBtn: { flex: 1, borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    paddingVertical: 10, alignItems: "center", backgroundColor: "#fff" },
  roleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  roleBtnText: { fontSize: 12, color: C.textSoft },
  roleBtnTextActive: { color: "#fff", fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: S.sm, marginTop: S.sm },
});
