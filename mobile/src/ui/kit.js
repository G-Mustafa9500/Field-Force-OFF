// ================================================================
// UI KIT — Enhanced responsive components
// Touch targets ≥48dp, keyboard-aware, safe-area, haptic feedback
// ================================================================
import React, { useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal as RNModal,
  ScrollView, Pressable, Keyboard, Platform,
  SafeAreaView, RefreshControl, Vibration
} from "react-native";
import { C, RADIUS, SPACING as S } from "./theme";

// Haptic feedback helper
const haptic = (type = "light") => {
  try { Vibration.vibrate(type === "heavy" ? 20 : 10); } catch {}
};

// ── Card ─────────────────────────────────────────────────────
export const Card = ({ children, style, onPress, elevated }) => {
  const pressable = onPress ? (
    <Pressable onPress={onPress} onPressIn={() => haptic()} style={({ pressed }) => [
      st.card, style, pressed && st.cardPressed, elevated && st.cardElevated
    ]}>
      {children}
    </Pressable>
  ) : <View style={[st.card, style, elevated && st.cardElevated]}>{children}</View>;
  return pressable;
};

// ── Button ───────────────────────────────────────────────────
export const Button = ({
  title, onPress, color = C.primary, textColor = "#fff",
  disabled, busy, style, small, outline, fullWidth, icon, loadingText
}) => {
  const handlePress = useCallback(() => {
    if (!disabled && !busy) { haptic(); onPress?.(); }
  }, [onPress, disabled, busy]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || busy}
      activeOpacity={0.75}
      style={[
        st.btn, small && st.btnSm, fullWidth && st.btnFull,
        outline
          ? { backgroundColor: "transparent", borderWidth: 2, borderColor: color }
          : { backgroundColor: disabled ? C.gray : busy ? C.primaryD : color },
        style
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy }}
    >
      {busy
        ? <ActivityIndicator size={small ? "small" : "large"} color={outline ? color : "#fff"} />
        : <View style={st.btnContent}>
            {icon && <Text style={{ marginRight: 6, fontSize: small ? 12 : 14 }}>{icon}</Text>}
            <Text style={[st.btnText, small && st.btnTextSm, { color: disabled ? C.textFaint : (outline ? color : textColor) }]}>
              {loadingText || title}
            </Text>
          </View>}
    </TouchableOpacity>
  );
};

// ── Input ────────────────────────────────────────────────────
export const Input = ({
  label, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, multiline, style,
  error, rightIcon, onRightIconPress, ...rest
}) => (
  <View style={[{ marginBottom: S.md }, style]}>
    {label ? <Text style={st.label}>{label}</Text> : null}
    <View style={st.inputWrapper}>
      <TextInput
        style={[st.input, multiline && st.inputMulti, error && st.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textFaint}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        {...rest}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={st.inputIcon}>
          <Text style={{ fontSize: 20 }}>{rightIcon}</Text>
        </TouchableOpacity>
      )}
    </View>
    {error ? <Text style={st.errorText}>{error}</Text> : null}
  </View>
);

// ── Badge ────────────────────────────────────────────────────
export const Badge = ({ children, color = C.primaryL, textColor = C.primary, style, dot }) => (
  <View style={[st.badge, dot && st.badgeDot, { backgroundColor: color }, style]}>
    {dot && <View style={[st.dot, { backgroundColor: textColor }]} />}
    <Text style={[st.badgeText, { color: textColor }]}>{children}</Text>
  </View>
);

// ── Toast ────────────────────────────────────────────────────
export const Toast = ({ msg, type = "success", onDismiss }) => {
  if (!msg) return null;
  const bg = type === "error" ? C.red
    : type === "warning" ? C.orange
    : type === "info" ? C.primary : C.dark;
  return (
    <View style={[st.toast, { backgroundColor: bg }]} pointerEvents="box-none">
      <Text style={st.toastText} numberOfLines={2}>{msg}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={st.toastClose}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Loading ──────────────────────────────────────────────────
export const Loading = ({ text = "Load ho raha hai...", fullScreen = true }) => (
  <View style={[st.center, fullScreen && st.centerFull]}>
    <ActivityIndicator color={C.primary} size="large" />
    <Text style={st.loadingText}>{text}</Text>
  </View>
);

// ── EmptyState ───────────────────────────────────────────────
export const EmptyState = ({ icon = "📭", title, subtitle, action }) => (
  <View style={st.emptyCenter}>
    <Text style={{ fontSize: 48, marginBottom: S.sm }}>{icon}</Text>
    <Text style={st.emptyTitle}>{title}</Text>
    {subtitle ? <Text style={st.emptySub}>{subtitle}</Text> : null}
    {action && <Button title={action.title} onPress={action.onPress} style={{ marginTop: S.lg }} />}
  </View>
);

// ── Sheet (Bottom Modal) — keyboard-aware ────────────────────
export const Sheet = ({ visible, onClose, title, children, large }) => (
  <RNModal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
    keyboardPresentationRequiresUserAction={false}
  >
    <Pressable style={st.sheetOverlay} onPress={onClose} accessibilityElementsHidden={visible} importantForAccessibility={visible ? "yes" : "no-hide-descendants"}>
      <View style={[st.sheetBox, large && st.sheetBoxLarge]}>
        <View style={st.sheetHandle} />
        {title ? <Text style={st.sheetTitle}>{title}</Text> : null}
        <ScrollView
          style={{ maxHeight: large ? 600 : 500 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {children}
        </ScrollView>
      </View>
    </Pressable>
  </RNModal>
);

// ── Confirm dialog ───────────────────────────────────────────
export const Confirm = ({ visible, title, message, onYes, onNo, yesText = "Haan, Karo", noText = "Cancel", danger }) => (
  <RNModal visible={visible} transparent animationType="fade" onRequestClose={onNo}>
    <View style={st.confirmOverlay} accessibilityViewIsModal accessible>
      <Card style={st.confirmBox} elevated>
        <Text style={st.confirmTitle}>{title}</Text>
        <Text style={st.confirmMsg}>{message}</Text>
        <View style={{ flexDirection: "row", gap: S.sm, marginTop: S.lg }}>
          <Button title={noText} onPress={onNo} outline color={C.textSoft} style={{ flex: 1 }} />
          <Button title={yesText} onPress={onYes} color={danger ? C.red : C.primary} style={{ flex: 1 }} />
        </View>
      </Card>
    </View>
  </RNModal>
);

// ── Section header ───────────────────────────────────────────
export const SectionTitle = ({ children, right, action }) => (
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.sm }}>
    <Text style={st.sectionTitle}>{children}</Text>
    {right}
    {action && <Button title={action.title} small onPress={action.onPress} />}
  </View>
);

// ── Stat card ────────────────────────────────────────────────
export const StatCard = ({ icon, value, label, bg, border, textColor, style, trend }) => (
  <View style={[st.statCard, { backgroundColor: bg, borderColor: border }, style]}>
    <View style={st.statTop}>
      <Text style={{ fontSize: 24, marginBottom: 2 }}>{icon}</Text>
      {trend && (
        <Badge color={trend.up ? C.greenL : C.redL} textColor={trend.up ? C.green : C.red} small>
          {trend.up ? "▲" : "▼"} {trend.value}%
        </Badge>
      )}
    </View>
    <Text style={[st.statValue, { color: textColor }]}>{value}</Text>
    <Text style={[st.statLabel, { color: textColor }]}>{label}</Text>
  </View>
);

// ── List Item (touchable, with chevron) ──────────────────────
export const ListItem = ({
  title, subtitle, right, left, onPress, style, separator = true, chevron = true
}) => (
  <TouchableOpacity
    onPress={onPress}
    onPressIn={() => haptic()}
    activeOpacity={0.8}
    style={[st.listItem, style]}
    accessibilityRole="button"
  >
    {left && <View style={st.listLeft}>{left}</View>}
    <View style={{ flex: 1, marginHorizontal: S.md }}>
      <Text style={st.listTitle}>{title}</Text>
      {subtitle && <Text style={st.listSub}>{subtitle}</Text>}
    </View>
    {right && <View style={st.listRight}>{right}</View>}
    {chevron && <Text style={st.chevron}>›</Text>}
    {separator && <View style={st.separator} />}
  </TouchableOpacity>
);

// ── Refreshable ScrollView ───────────────────────────────────
export const RefreshableScroll = ({ refreshing, onRefresh, children, style, ...props }) => (
  <ScrollView
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[C.primary]}
        progressBackgroundColor="#fff"
      />
    }
    style={style}
    contentContainerStyle={st.scrollContent}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    {...props}
  >
    {children}
  </ScrollView>
);

// ── Safe Area Wrapper ────────────────────────────────────────
export const SafeScreen = ({ children, style, backgroundColor = C.bg }) => (
  <SafeAreaView style={[st.safeScreen, { backgroundColor }, style]}>
    {children}
  </SafeAreaView>
);

// ── Keyboard Aware View ──────────────────────────────────────
export const KeyboardAwareView = ({ children, style, behavior }) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === "android" ? "height" : behavior || "padding"}
    keyboardVerticalOffset={0}
    style={{ flex: 1, ...style }}
  >
    {children}
  </KeyboardAvoidingView>
);

// ── Avatar ───────────────────────────────────────────────────
export const Avatar = ({ name, size = 40, color = C.primary, style }) => (
  <View style={[st.avatar, { width: size, height: size, backgroundColor: color }, style]}>
    <Text style={[st.avatarText, { fontSize: size * 0.4 }]}>{name?.charAt(0)?.toUpperCase() || "?"}</Text>
  </View>
);

// ── Chip (filter pill) ───────────────────────────────────────
export const Chip = ({ label, selected, onPress, style }) => (
  <TouchableOpacity
    onPress={() => { haptic(); onPress?.(); }}
    style={[st.chip, selected && st.chipSelected, style]}
  >
    <Text style={[st.chipText, selected && st.chipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const st = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: C.border, padding: S.lg, marginBottom: S.md,
  },
  cardPressed: { backgroundColor: C.gray },
  cardElevated: { elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  btn: {
    borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: S.lg,
    alignItems: "center", justifyContent: "center", minHeight: 48,
  },
  btnSm: { paddingVertical: 10, paddingHorizontal: S.md, minHeight: 40 },
  btnFull: { width: "100%" },
  btnContent: { flexDirection: "row", alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  btnTextSm: { fontSize: 13 },
  label: { fontSize: 12, color: C.textSoft, marginBottom: 6, fontWeight: "500" },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff" },
  input: {
    flex: 1, borderWidth: 1, borderColor: C.border2, borderRadius: RADIUS.md,
    paddingHorizontal: S.md, paddingVertical: 12, fontSize: 15, color: C.text,
  },
  inputMulti: { minHeight: 100, textAlignVertical: "top" },
  inputError: { borderColor: C.red, borderWidth: 2 },
  inputIcon: { paddingHorizontal: 8 },
  errorText: { color: C.red, fontSize: 11, marginTop: 4, marginLeft: 2 },
  badge: {
    alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, flexDirection: "row", alignItems: "center", gap: 4,
  },
  badgeDot: { paddingLeft: 0 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  toast: {
    position: "absolute", top: 60, left: S.lg, right: S.lg, zIndex: 100,
    borderRadius: RADIUS.lg, padding: S.md, elevation: 8, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "500", flex: 1 },
  toastClose: { padding: 4 },
  center: { alignItems: "center", justifyContent: "center", padding: S.xl },
  centerFull: { flex: 1 },
  loadingText: { color: C.textFaint, fontSize: 14, marginTop: S.md },
  emptyCenter: { alignItems: "center", justifyContent: "center", padding: S.xxl },
  emptyTitle: { fontWeight: "600", color: C.textSoft, fontSize: 16 },
  emptySub: { color: C.textFaint, fontSize: 14, marginTop: 4, textAlign: "center" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheetBox: {
    backgroundColor: "#fff", borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, padding: S.xl, paddingBottom: 40,
    maxHeight: "85%",
  },
  sheetBoxLarge: { maxHeight: "95%" },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: C.border2, borderRadius: 2,
    alignSelf: "center", marginBottom: S.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: "bold", color: C.text, marginBottom: S.lg },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: S.xxl },
  confirmBox: { marginBottom: 0, width: "100%", maxWidth: 400 },
  confirmTitle: { fontSize: 17, fontWeight: "bold", color: C.text, marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: C.textSoft, lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: C.textSoft, textTransform: "uppercase", letterSpacing: 0.5 },
  statCard: {
    flex: 1, borderRadius: RADIUS.lg, borderWidth: 1, padding: S.md,
    marginHorizontal: 4, minWidth: 120,
  },
  statTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "bold" },
  statLabel: { fontSize: 11, fontWeight: "500", opacity: 0.7, marginTop: 2 },
  listItem: {
    flexDirection: "row", alignItems: "center", paddingVertical: S.md,
    backgroundColor: "#fff", minHeight: 56,
  },
  listLeft: { marginRight: S.md },
  listTitle: { fontSize: 15, fontWeight: "500", color: C.text },
  listSub: { fontSize: 12, color: C.textFaint, marginTop: 2 },
  listRight: { alignItems: "flex-end" },
  chevron: { color: C.textFaint, fontSize: 22, fontWeight: "300", marginLeft: S.md },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 56 },
  scrollContent: { paddingBottom: 40 },
  safeScreen: { flex: 1 },
  avatar: {
    borderRadius: 999, justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "bold" },
  chip: {
    paddingHorizontal: S.md, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: C.gray, borderWidth: 1, borderColor: C.border2,
  },
  chipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 12, fontWeight: "500", color: C.textSoft },
  chipTextSelected: { color: "#fff" },
});