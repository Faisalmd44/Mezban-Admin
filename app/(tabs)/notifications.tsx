import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useAdminAlerts } from "@/src/hooks/use-admin-alerts";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(false);
  const { pendingCount, pendingOrders, resolveOrder } = useAdminAlerts();

  const load = useCallback(async () => {
    try { setOrders(await api.adminPendingOrders()); } catch {}
    finally { setRefresh(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>Notifications</Text></View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} tintColor={COLORS.gold} colors={[COLORS.gold]} />}>
        {pendingCount > 0 && (
          <View style={styles.banner}>
            <Ionicons name="alert-circle" size={24} color={COLORS.error} />
            <Text style={styles.bannerTxt}>{pendingCount} pending order{pendingCount > 1 ? "s" : ""} need attention!</Text>
          </View>
        )}

        <Text style={styles.section}>Pending Order Alerts</Text>
        {pendingOrders.length === 0 ? (
          <Text style={styles.empty}>No pending alerts. All caught up!</Text>
        ) : (
          pendingOrders.map((o) => (
            <View key={o.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View><Text style={styles.orderNo}>#{o.order_no}</Text><Text style={styles.cust}>{o.user_name} • {o.user_phone}</Text></View>
                <Text style={styles.total}>₹{o.total.toFixed(0)}</Text>
              </View>
              <Text style={styles.items}>{o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => resolveOrder(o.id, false)} style={styles.rejectBtn}><Ionicons name="close" size={16} color="#fff" /><Text style={styles.rejectTxt}>Reject</Text></Pressable>
                <Pressable onPress={() => resolveOrder(o.id, true)} style={styles.acceptBtn}><Ionicons name="checkmark" size={16} color={COLORS.black} /><Text style={styles.acceptTxt}>Accept</Text></Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.section}>Polling Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}><Ionicons name="radio-button-on" size={16} color={COLORS.success} /><Text style={styles.statusTxt}>Polling active (every 12s)</Text></View>
          <View style={styles.statusRow}><Ionicons name="notifications" size={16} color={COLORS.gold} /><Text style={styles.statusTxt}>FCM token registered</Text></View>
          <View style={styles.statusRow}><Ionicons name="alarm" size={16} color={COLORS.warning} /><Text style={styles.statusTxt}>Alarm reminders: 30s & 60s</Text></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.white },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: SPACING.lg, padding: SPACING.md, backgroundColor: "rgba(255,90,95,0.15)", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.error },
  bannerTxt: { color: COLORS.error, fontWeight: "800", fontSize: 14 },
  section: { fontWeight: "800", fontSize: 16, marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm, color: COLORS.white },
  empty: { textAlign: "center", color: COLORS.textMuted, marginTop: 40 },
  card: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.card, borderWidth: 1, borderColor: COLORS.border },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderNo: { fontWeight: "900", fontSize: 15, color: COLORS.white },
  cust: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  total: { fontWeight: "900", color: COLORS.gold, fontSize: 16 },
  items: { color: COLORS.textSecondary, fontSize: 12, marginTop: SPACING.sm },
  actions: { flexDirection: "row", gap: 8, marginTop: SPACING.md, justifyContent: "flex-end" },
  rejectBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.error, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill },
  rejectTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },
  acceptBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill },
  acceptTxt: { color: COLORS.black, fontWeight: "800", fontSize: 12 },
  statusCard: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  statusTxt: { color: COLORS.white, fontWeight: "600", fontSize: 13 },
});
