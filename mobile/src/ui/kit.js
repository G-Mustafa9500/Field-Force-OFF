// ================================================================
// UI KIT — common components (web ke Tailwind patterns ka port)
// ================================================================
import React from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal as RNModal,
  ScrollView, Pressable
} from "react-native";
import { C, RADIUS, SPACING as S } from "./theme";

// ── Card ─────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <View style={[st.card, style]}>{children}</View>
);

// ── Button ───────────────────────────────────────────────────
export const Button = ({ title, onPress, color = C.primary, textColor = "#fff",
  disabled, busy, style, small, outline }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || busy}
    activeOpacity={0.8}
    style={[st.btn, small && st.btnSm,
      outline
        ? { backgroundColor: "transparent", borderWidth: 1, borderColor: color }
        : { backgroundColor: disabled ? C.gray : color },
      style]}
  >
    {busy
      ? <ActivityIndicator size="small" color={outline ? color : "#fff"} />
      : <Text style={[st.btnText, small && st.btnTextSm,
          { color: disabled ? C.textFaint : (outline ? color : textColor) }]}>
          {title}
        </Text>}
  </TouchableOpacity>
);

// ── Input ────────────────────────────────────────────────────
export const Input = ({ label, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, multiline, style, ...rest }) => (
  <View style={[{ marginBottom: S.md }, style]}>
    {label ? <Text style={st.label}>{label}</Text> : null}
    <TextInput
      style={[st.input, multiline && st.inputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textFaint}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      multiline={multiline}
      {...rest}
    />
  </View>
);

// ── Badge ────────────────────────────────────────────────────
export const Badge = ({ children, color = C.primaryL, textColor = C.primary, style }) => (
  <View style={[st.badge, { backgroundColor: color }, style]}>
    <Text style={[st.badgeText, { color: textColor }]}>{children}</Text>
  </View>
);

// ── Toast ────────────────────────────────────────────────────
export const Toast = ({ msg, type = "success" }) => {
  if (!msg) return null;
  const bg = type === "error" ? C.red
    : type === "warning" ? C.orange
    : type === "info" ? C.primary : C.dark;
  return (
    <View style={[st.toast, { backgroundColor: bg }]}>
      <Text style={st.toastText}>{msg}</Text>
    </View>
  );
};

// ── Loading ──────────────────────────────────────────────────
export const Loading = ({ text = "Load ho raha hai..." }) => (
  <View style={st.center}>
    <Text style={{ fontSize: 40, marginBottom: S.md }}>📍</Text>
    <ActivityIndicator color={C.primary} />
    <Text style={st.loadingText}>{text}</Text>
  </View>
);

// ── EmptyState ───────────────────────────────────────────────
export const EmptyState = ({ icon = "📭", title, subtitle }) => (
  <Card style={st.center}>
    <Text style={{ fontSize: 40, marginBottom: S.sm }}>{icon}</Text>
    <Text style={st.emptyTitle}>{title}</Text>
    {subtitle ? <Text style={st.emptySub}>{subtitle}</Text> : null}
  </Card>
);

// ── Modal (bottom sheet style) ───────────────────────────────
export const Sheet = ({ visible, onClose, title, children }) => (
  <RNModal visible={visible} transparent animationType="slide"
    onRequestClose={onClose}>
    <Pressable style={st.sheetOverlay} onPress={onClose}>
      <Pressable style={st.sheetBox} onPress={(e) => e.stopPropagation()}>
        <View style={st.sheetHandle} />
        {title ? <Text style={st.sheetTitle}>{title}</Text> : null}
        <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </Pressable>
    </Pressable>
  </RNModal>
);

// ── Confirm dialog ───────────────────────────────────────────
export const Confirm = ({ visible, title, message, onYes, onNo }) => (
  <RNModal visible={visible} transparent animationType="fade"
    onRequestClose={onNo}>
    <View style={st.confirmOverlay}>
      <Card style={st.confirmBox}>
        <Text style={st.confirmTitle}>{title}</Text>
        <Text style={st.confirmMsg}>{message}</Text>
        <View style={{ flexDirection: "row", gap: S.sm, marginTop: S.lg }}>
          <Button title="Cancel" onPress={onNo} outline color={C.textSoft} style={{ flex: 1 }} />
          <Button title="Haan, Karo" onPress={onYes} color={C.red} style={{ flex: 1 }} />
        </View>
      </Card>
    </View>
  </RNModal>
);

// ── Section header ───────────────────────────────────────────
export const SectionTitle = ({ children, right }) => (
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.sm }}>
    <Text style={st.sectionTitle}>{children}</Text>
    {right}
  </View>
);

// ── Stat card (dashboard summary) ────────────────────────────
export const StatCard = ({ icon, value, label, bg, border, textColor, style }) => (
  <View style={[st.statCard, { backgroundColor: bg, borderColor: border }, style]}>
    <Text style={{ fontSize: 22, marginBottom: 2 }}>{icon}</Text>
    <Text style={[st.statValue, { color: textColor }]}>{value}</Text>
    <Text style={[st.statLabel, { color: textColor }]}>{label}</Text>
  </View>
);

const st = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: C.border, padding: S.lg, marginBottom: S.md,
  },
  btn: {
    borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: S.lg,
    alignItems: "center", justifyContent: "center",
  },
  btnSm: { paddingVertical: 8, paddingHorizontal: S.md },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  btnTextSm: { fontSize: 12 },
  label: { fontSize: 12, color: C.textSoft, marginBottom: 4, fontWeight: "500" },
  input: {
    borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    paddingHorizontal: S.md, paddingVertical: 10, fontSize: 14, color: C.text,
    backgroundColor: "#fff",
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },
  badge: {
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  toast: {
    position: "absolute", top: 60, left: S.lg, right: S.lg, zIndex: 100,
    borderRadius: RADIUS.lg, padding: S.md, elevation: 8,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8,
  },
  toastText: { color: "#fff", textAlign: "center", fontSize: 13, fontWeight: "500" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  loadingText: { color: C.textFaint, fontSize: 13, marginTop: S.sm },
  emptyTitle: { fontWeight: "600", color: C.textSoft, fontSize: 15 },
  emptySub: { color: C.textFaint, fontSize: 13, marginTop: 4, textAlign: "center" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheetBox: {
    backgroundColor: "#fff", borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, padding: S.xl, paddingBottom: 40,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: C.border2, borderRadius: 2,
    alignSelf: "center", marginBottom: S.md,
  },
  sheetTitle: { fontSize: 17, fontWeight: "bold", color: C.text, marginBottom: S.lg },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: S.xxl },
  confirmBox: { marginBottom: 0 },
  confirmTitle: { fontSize: 16, fontWeight: "bold", color: C.text, marginBottom: 6 },
  confirmMsg: { fontSize: 13, color: C.textSoft },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: C.textSoft },
  statCard: {
    flex: 1, borderRadius: RADIUS.lg, borderWidth: 1, padding: S.md,
    marginHorizontal: 3,
  },
  statValue: { fontSize: 20, fontWeight: "bold" },
  statLabel: { fontSize: 11, fontWeight: "500", opacity: 0.7, marginTop: 2 },
});
