// ================================================================
// SETUP SCREEN — first-run admin account creation
// ================================================================
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { api } from "../api/client";

export default function SetupScreen({ navigation }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.setup(form);
      if (!res.ok) { setError(res.data?.message || "Error hua"); return; }
      // Success — login pe wapas
      navigation.replace("Login");
    } catch (err) {
      setError("Error hua — dobara try karo");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container}
      behavior={Platform.OS === "android" ? undefined : "padding"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.box}>
          <View style={styles.head}>
            <Text style={{ fontSize: 44 }}>🛠️</Text>
            <Text style={styles.title}>First Time Setup</Text>
            <Text style={styles.sub}>Admin account banao</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput style={styles.input} placeholder="Apna naam *"
            placeholderTextColor="#9ca3af" value={form.name}
            onChangeText={v => setForm({ ...form, name: v })} />
          <TextInput style={styles.input} placeholder="Email *"
            placeholderTextColor="#9ca3af" autoCapitalize="none"
            keyboardType="email-address" value={form.email}
            onChangeText={v => setForm({ ...form, email: v })} />
          <TextInput style={styles.input} placeholder="Password *"
            placeholderTextColor="#9ca3af" secureTextEntry value={form.password}
            onChangeText={v => setForm({ ...form, password: v })} />

          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Admin Account Banao</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 16, alignItems: "center" }}
            onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Wapas Login pe</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1d4ed8" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  box: { backgroundColor: "#fff", borderRadius: 20, padding: 24 },
  head: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 20, fontWeight: "bold", color: "#1f2937", marginTop: 8 },
  sub: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  error: { backgroundColor: "#fef2f2", color: "#dc2626", paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 10, fontSize: 13, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 12,
    color: "#1f2937" },
  btn: { backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 13,
    alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  back: { color: "#9ca3af", fontSize: 13 },
});
