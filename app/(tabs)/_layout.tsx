import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Platform } from "react-native";
import { COLORS } from "@/src/theme";
import { useAdminAlerts } from "@/src/hooks/use-admin-alerts";

export default function TabsLayout() {
  const { pendingCount } = useAdminAlerts();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.gold,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      tabBarStyle: { backgroundColor: COLORS.black, borderTopColor: COLORS.border, height: Platform.OS === "ios" ? 86 : 64, paddingTop: 6, paddingBottom: Platform.OS === "ios" ? 26 : 8 },
    }}>
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => (
        <View>
          <Ionicons name="grid" size={size} color={color} />
          {pendingCount > 0 ? (<View style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></View>) : null}
        </View>
      )}} />
      <Tabs.Screen name="orders" options={{ title: "Orders", tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} /> }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts", tabBarIcon: ({ color, size }) => (
        <View>
          <Ionicons name="notifications" size={size} color={color} />
          {pendingCount > 0 ? (<View style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></View>) : null}
        </View>
      )}} />
      <Tabs.Screen name="printer" options={{ title: "Printer", tabBarIcon: ({ color, size }) => <Ionicons name="printer" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: { position: "absolute", right: -6, top: -3, backgroundColor: COLORS.error, borderRadius: 999, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: COLORS.black },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
});
