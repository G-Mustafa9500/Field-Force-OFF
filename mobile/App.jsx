// ================================================================
// APP ROOT — role-based navigation
// ================================================================
import React from "react";
import { StatusBar, SafeAreaView, View, ActivityIndicator, Text } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation";

const AppInner = () => {
  const { user, booting, needsSetup } = useAuth();

  // Sirf app STARTUP pe splash — login ke waqt screen swap nahi hoti
  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a",
        justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>🚚</Text>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={{ color: "#94a3b8", marginTop: 12, fontSize: 13 }}>Field Force</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator user={user} needsSetup={needsSetup} />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
