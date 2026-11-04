// ================================================================
// NAVIGATION — role-based (admin tabs / employee stack)
// Web App.jsx ke routes ka mobile port:
//   Guard adminOnly  →  user.role check
//   AdminLayout NAV  →  bottom tabs + More stack
// ================================================================
import React from "react";
import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { C } from "../ui/theme";

import LoginScreen from "../screens/LoginScreen";
import SetupScreen from "../screens/SetupScreen";

import DashboardScreen from "../screens/admin/DashboardScreen";
import LiveTrackingScreen from "../screens/admin/LiveTrackingScreen";
import EmployeesScreen from "../screens/admin/EmployeesScreen";
import ShopsScreen from "../screens/admin/ShopsScreen";
import MoreScreen from "../screens/admin/MoreScreen";
import RouteManagerScreen from "../screens/admin/RouteManagerScreen";
import AttendanceScreen from "../screens/admin/AttendanceScreen";
import AlertsScreen from "../screens/admin/AlertsScreen";
import ReportsScreen from "../screens/admin/ReportsScreen";
import SettingsScreen from "../screens/admin/SettingsScreen";

import EmployeeHomeScreen from "../screens/employee/EmployeeHomeScreen";

const Stack = createNativeStackNavigator();
const Tab  = createBottomTabNavigator();

const headerOpts = {
  headerStyle: { backgroundColor: "#fff" },
  headerTintColor: C.text,
  headerTitleStyle: { fontWeight: "bold", fontSize: 17 },
  headerShadowVisible: false,
};

const TabIcon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
);

// ── Admin: More stack (Routes, Attendance, Alerts, Reports, Settings) ──
const MoreStack = () => (
  <Stack.Navigator screenOptions={headerOpts}>
    <Stack.Screen name="MoreHome" component={MoreScreen}
      options={{ title: "More", headerShown: false }} />
    <Stack.Screen name="Routes" component={RouteManagerScreen} options={{ title: "🗺️ Routes" }} />
    <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: "📸 Attendance" }} />
    <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: "🚨 Alerts" }} />
    <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "📈 Reports" }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "⚙️ Settings" }} />
  </Stack.Navigator>
);

// ── Admin: bottom tabs (web NAV ke top 4 + More) ──────────────
const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: C.primary,
      tabBarInactiveTintColor: C.textFaint,
      tabBarStyle: { backgroundColor: "#fff", borderTopColor: C.border },
      tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
    }}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen}
      options={{ title: "Dashboard", tabBarIcon: TabIcon("📊") }} />
    <Tab.Screen name="Live" component={LiveTrackingScreen}
      options={{ title: "Live", tabBarIcon: TabIcon("📍") }} />
    <Tab.Screen name="Employees" component={EmployeesScreen}
      options={{ title: "Team", tabBarIcon: TabIcon("👥") }} />
    <Tab.Screen name="Shops" component={ShopsScreen}
      options={{ title: "Shops", tabBarIcon: TabIcon("🏪") }} />
    <Tab.Screen name="More" component={MoreStack}
      options={{ title: "More", tabBarIcon: TabIcon("⋯") }} />
  </Tab.Navigator>
);

// ── Auth stack (login + setup) ────────────────────────────────
const AuthStack = ({ needsSetup }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}
    initialRouteName={needsSetup ? "Setup" : "Login"}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Setup" component={SetupScreen} />
  </Stack.Navigator>
);

// ── Root ──────────────────────────────────────────────────────
export default function AppNavigator({ user, needsSetup }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth">{() => <AuthStack needsSetup={needsSetup} />}</Stack.Screen>
        ) : user.role === "admin" ? (
          <Stack.Screen name="Admin">{() => <AdminTabs />}</Stack.Screen>
        ) : (
          <Stack.Screen name="Employee">
            {() => (
              <Stack.Navigator screenOptions={headerOpts}>
                <Stack.Screen name="EmployeeHome" component={EmployeeHomeScreen}
                  options={{ title: "Field Force", headerShown: false }} />
              </Stack.Navigator>
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
