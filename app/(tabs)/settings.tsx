import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useState } from "react";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { useApp, clearToken } from "@/src/store";
import { stopAlert } from "@/src/services/AdminNotificationService";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useApp();
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [reminder1, setReminder1] = useState(true);
  const [reminder2, setReminder2] = useState(true);

  const logout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
        await stopAlert();
        await clearToken();
        setUser(null);
        router.replace("/(auth)/login");
      }},
    ]);
  };

  return (
    <ScrollView style={[styles.root, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.avatarRing}>
          {user?.picture ? <Image source={user.picture} style={styles.avatarImg} contentFit="cover" /> : <Text style={styles.avatarTxt}>{(user?.name || "A")[0].toUpperCase()}</Text>}
        </View>
        <Text style={styles.name}>{user?.name || "Admin"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>
      </View>

      <Text style={styles.sectionTitle}>Notification Settings</Text>
      <SettingRow icon="alarm" label="New Order Alarm" value={alarmEnabled} onValueChange={setAlarmEnabled} />
      <SettingRow icon="sync" label="Background Polling (12s)" value={pollingEnabled} onValueChange={setPollingEnabled} />
      <SettingRow icon="timer" label="Reminder at 30s" value={reminder1} onValueChange={setReminder1} />
      <SettingRow icon="timer" label="Reminder at 60s" value={reminder2} onValueChange={setReminder2} />

      <Text style={styles.sectionTitle}>Management</Text>
      <NavRow icon="bar-chart" label="Analytics" onPress={() => router.push("/analytics")} />
      <NavRow icon="receipt" label="All Orders" onPress={() => router.push("/(tabs)/orders")} />
      <NavRow icon="restaurant" label="Menu Management" onPress={() => router.push("/(tabs)/menu")} />
      <NavRow icon="notifications" label="Notifications" onPress={() => router.push("/(tabs)/notifications")} />
      <NavRow icon="logo-whatsapp" label="WhatsApp Support" onPress={() => Linking.openURL("https://wa.me/918595244548?text=Hi%20Mezbaan%20Admin")} />

      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.aboutCard}>
        <Text style={styles.aboutBrand}>MEZBAAN ADMIN</Text>
        <Text style={styles.aboutVersion}>Version 1.0.0</Text>
        <Text style={styles.aboutTag}>Admin Portal for Mezbaan Restro</Text>
      </View>

      <Pressable testID="settings-logout" onPress={logout} style={styles.logoutBtn}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.logoutTxt}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function SettingRow({ icon, label, value, onValueChange }: any) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}><Ionicons name={icon} size={20} color={COLORS.gold} /></View>
      <Text style={styles.settingLbl}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: COLORS.gold, false: COLORS.border }} thumbColor={COLORS.white} />
    </View>
  );
}

function NavRow({ icon, label, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navRow, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View style={styles.navIcon}><Ionicons name={icon} size={20} color={COLORS.gold} /></View>
      <Text style={styles.navLbl}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  hero: { alignItems: "center", paddingTop: SPACING.xl, paddingBottom: SPACING.xl + 12 },
  avatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: COLORS.gold, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md, overflow: "hidden", ...SHADOW.gold },
  avatarImg: { width: "100%", height: "100%" },
  avatarTxt: { fontSize: 36, fontWeight: "900", color: COLORS.gold },
  name: { color: "#fff", fontSize: 24, fontWeight: "900" },
  email: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  sectionTitle: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm, fontWeight: "800", color: COLORS.white, fontSize: 16 },
  settingRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  settingIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceTint, alignItems: "center", justifyContent: "center" },
  settingLbl: { flex: 1, fontWeight: "700", color: COLORS.white },
  navRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  navIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceTint, alignItems: "center", justifyContent: "center" },
  navLbl: { flex: 1, fontWeight: "700", color: COLORS.white },
  aboutCard: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, borderRadius: RADIUS.md, padding: SPACING.xl, alignItems: "center", gap: 6, borderWidth: 1, borderColor: COLORS.border },
  aboutBrand: { fontWeight: "900", color: COLORS.gold, letterSpacing: 3 },
  aboutVersion: { color: COLORS.textMuted, fontSize: 12 },
  aboutTag: { color: COLORS.textSecondary, fontStyle: "italic", fontSize: 12 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,90,95,0.15)", marginHorizontal: SPACING.lg, marginTop: SPACING.xl, padding: SPACING.md, borderRadius: RADIUS.md, gap: 8, borderWidth: 1, borderColor: COLORS.error },
  logoutTxt: { color: COLORS.error, fontWeight: "800", fontSize: 16 },
});
