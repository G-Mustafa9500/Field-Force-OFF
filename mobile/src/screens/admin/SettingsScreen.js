// ================================================================
// ADMIN SETTINGS — web SettingsPage.jsx ka port
// Petrol price get/put + server URL override + logout
// ================================================================
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert as RNAlert } from "react-native";
import { api, getServerUrl, setServerUrl } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Card, Button, Input, Loading } from "../../ui/kit";
import { C, SPACING as S } from "../../ui/theme";

export default function SettingsScreen() {
  const { user, actionLogout } = useAuth();
  const [petrolPrice, setPetrolPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverUrl, setServerUrlState] = useState(getServerUrl());
  const [urlSaved, setUrlSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getSettings();
        if (res.ok) {
          const price = res.data?.find?.(s => s.key === "petrol_price")?.value
            ?? res.data?.petrol_price;
          if (price != null) setPetrolPrice(String(price));
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.updateSettings({ key: "petrol_price", value: Number(petrolPrice) });
      if (res.ok) RNAlert.alert("✅ Save ho gaya", "Petrol price update ho gaya");
      else RNAlert.alert("❌", res.data?.message || "Save fail hua");
    } catch { RNAlert.alert("❌", "Save fail hua"); }
    finally { setSaving(false); }
  };

  const saveServerUrl = async () => {
    await setServerUrl(serverUrl);
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 2000);
    RNAlert.alert("✅ Server URL save ho gaya",
      "App restart karo taake naya URL apply ho");
  };

  if (loading) return <Loading />;

  return (
    <ScrollView style={st.root} contentContainerStyle={st.scroll}>
      <Text style={st.title}>⚙️ Settings</Text>

      {/* Petrol price */}
      <Card>
        <Text style={st.cardTitle}>⛽ Petrol Price (per liter)</Text>
        <Text style={st.cardSub}>Fuel expense calculation isi se hota hai</Text>
        <Input label="Price (Rs)" value={petrolPrice}
          onChangeText={setPetrolPrice} keyboardType="number-pad"
          placeholder="e.g. 270" />
        <Button title={saving ? "Saving..." : "💾 Save"} onPress={save}
          disabled={saving} busy={saving} />
      </Card>

      {/* Server URL */}
      <Card>
        <Text style={st.cardTitle}>🌐 Server URL</Text>
        <Text style={st.cardSub}>
          Advanced — backend ka address. Default Vercel URL use hota hai.
        </Text>
        <Input label="API Base URL" value={serverUrl}
          onChangeText={setServerUrlState} autoCapitalize="none"
          keyboardType="url" />
        <Button title={urlSaved ? "✅ Saved" : "💾 Save Server URL"}
          onPress={saveServerUrl} color={C.textSoft} />
      </Card>

      {/* Account info */}
      <Card>
        <Text style={st.cardTitle}>👤 Account</Text>
        <Text style={st.accountName}>{user?.name}</Text>
        <Text style={st.accountMeta}>{user?.email} · {user?.role}</Text>
      </Card>

      {/* Logout */}
      <Button title="🚪 Logout" color={C.red} onPress={actionLogout} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "bold", color: C.text, marginBottom: S.md },
  cardTitle: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 4 },
  cardSub: { fontSize: 11, color: C.textFaint, marginBottom: S.md },
  accountName: { fontSize: 15, fontWeight: "600", color: C.text },
  accountMeta: { fontSize: 12, color: C.textFaint, marginTop: 2 },
});
