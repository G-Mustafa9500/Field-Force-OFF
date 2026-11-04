// ================================================================
// LOGIN SCREEN — server URL override + setup detection
// ================================================================
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getServerUrl, setServerUrl } from "../api/client";
import { DEFAULT_API_URL, LOCAL_API_URL } from "../config";

export default function LoginScreen({ navigation }) {
  const { actionLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [serverUrl, setServerUrlState] = useState(getServerUrl());

  const handleLogin = async () => {
    setError(null);
    setBusy(true);
    // Advanced server URL save karo (agar change hua)
    if (showAdvanced && serverUrl && serverUrl !== getServerUrl()) {
      await setServerUrl(serverUrl);
    }
    const err = await actionLogin(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "android" ? undefined : "padding"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>FieldForce</Text>
        <Text style={styles.subtitle}>GPS Protected Attendance</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleLogin}
          disabled={busy}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Login</Text>}
        </TouchableOpacity>

        {/* Advanced — server URL */}
        <TouchableOpacity style={styles.advToggle} onPress={() => setShowAdvanced(v => !v)}>
          <Text style={styles.advToggleText}>
            {showAdvanced ? "▾ Advanced" : "▸ Advanced (server URL)"}
          </Text>
        </TouchableOpacity>
        {showAdvanced && (
          <View style={styles.advBox}>
            <TextInput
              style={styles.advInput}
              placeholder="https://your-backend.vercel.app/api"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              keyboardType="url"
              value={serverUrl}
              onChangeText={setServerUrlState}
            />
            <View style={styles.advRow}>
              <TouchableOpacity style={styles.advBtn} onPress={() => setServerUrlState(DEFAULT_API_URL)}>
                <Text style={styles.advBtnText}>Live (Vercel)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.advBtn} onPress={() => setServerUrlState(LOCAL_API_URL)}>
                <Text style={styles.advBtnText}>Local PC</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.note}>
          Fake GPS detection active hai — App-level security
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 32, fontWeight: "bold", color: "#38bdf8",
    textAlign: "center" },
  subtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center",
    marginBottom: 40 },
  input: { backgroundColor: "#1e293b", color: "#e2e8f0", borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12,
    fontSize: 15 },
  btn: { backgroundColor: "#38bdf8", borderRadius: 10, paddingVertical: 14,
    alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  error: { color: "#f87171", textAlign: "center", marginBottom: 8 },
  advToggle: { alignItems: "center", marginTop: 20, padding: 8 },
  advToggleText: { color: "#475569", fontSize: 12 },
  advBox: { backgroundColor: "#1e293b", borderRadius: 10, padding: 12, marginTop: 8 },
  advInput: { color: "#e2e8f0", fontSize: 13, borderBottomWidth: 1,
    borderBottomColor: "#334155", paddingBottom: 8, marginBottom: 10 },
  advRow: { flexDirection: "row", gap: 8 },
  advBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 8,
    paddingVertical: 8, alignItems: "center" },
  advBtnText: { color: "#94a3b8", fontSize: 12 },
  note: { color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 24 }
});
