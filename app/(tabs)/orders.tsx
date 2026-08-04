import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useAdminAlerts } from "@/src/hooks/use-admin-alerts";
import { stopAlert } from "@/src/services/AdminNotificationService";

const STATUS_FLOW = ["received", "preparing", "packed", "out_for_delivery", "delivered"];
const STATUS_LABEL: Record<string, string> = {
  received: "Received", preparing: "Preparing", packed: "Packed",
  out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [filter, setFilter] = useState<string>("All");

  const { pendingCount, resolveOrder } = useAdminAlerts();

  const load = useCallback(async () => {
    try { setOrders(await api.adminOrders()); } catch (e: any) {
      if (e?.message?.includes("403")) router.replace("/(auth)/login");
    } finally { setLoading(false); setRefresh(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const nextStatus = async (id: string, current: string) => {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    await api.adminUpdateStatus(id, STATUS_FLOW[idx + 1]);
    await stopAlert(id);
    load();
  };

  const acceptOrder = async (id: string) => { await resolveOrder(id, true); load(); };
  const rejectOrder = async (id: string) => { await resolveOrder(id, false); load(); };

  const filtered = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>All Orders</Text></View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {["All", ...STATUS_FLOW, "cancelled"].map((s) => (
          <Pressable key={s} testID={`filter-${s}`} onPress={() => setFilter(s)} style={[styles.filter, filter === s && styles.filterActive]}>
            <Text style={[styles.filterTxt, filter === s && { color: COLORS.black }]}>{s === "All" ? "All" : STATUS_LABEL[s]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} tintColor={COLORS.gold} colors={[COLORS.gold]} />}>
          {filtered.length === 0 ? (
            <Text style={styles.empty}>No orders in this state</Text>
          ) : (
            filtered.map((o) => {
              const idx = STATUS_FLOW.indexOf(o.status);
              const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
              const isReceived = o.status === "received";
              return (
                <View key={o.id} style={styles.orderCard}>
                  <Pressable onPress={() => router.push(`/order/${o.id}`)}>
                    <View style={styles.ohead}>
                      <View><Text style={styles.ono}>#{o.order_no}</Text><Text style={styles.odate}>{new Date(o.created_at).toLocaleString()}</Text></View>
                      <View style={styles.statusPill}><Text style={styles.statusTxt}>{STATUS_LABEL[o.status]}</Text></View>
                    </View>
                    <Text style={styles.cust}>👤 {o.user_name} • {o.user_phone}</Text>
                    <Text style={styles.addr} numberOfLines={2}>📍 {o.address}</Text>
                    <Text style={styles.items}>{o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}</Text>
                  </Pressable>
                  <View style={styles.ofoot}>
                    <Text style={styles.amount}>₹{o.total.toFixed(0)} • {o.payment_method.toUpperCase()}</Text>
                    {isReceived ? (
                      <View style={styles.ofootActions}>
                        <Pressable testID={`reject-${o.id}`} onPress={() => rejectOrder(o.id)} style={styles.rejectBtn}><Ionicons name="close" size={14} color="#fff" /><Text style={styles.rejectTxt}>Reject</Text></Pressable>
                        <Pressable testID={`accept-${o.id}`} onPress={() => acceptOrder(o.id)} style={styles.acceptBtn}><Ionicons name="checkmark" size={14} color={COLORS.black} /><Text style={styles.acceptTxt}>Accept</Text></Pressable>
                      </View>
                    ) : next ? (
                      <Pressable testID={`advance-${o.id}`} onPress={() => nextStatus(o.id, o.status)} style={styles.advanceBtn}><Text style={styles.advanceTxt}>Mark {STATUS_LABEL[next]}</Text><Ionicons name="arrow-forward" size={14} color={COLORS.black} /></Pressable>
                    ) : (<View style={[styles.advanceBtn, { backgroundColor: COLORS.success }]}><Ionicons name="checkmark" size={14} color={COLORS.black} /><Text style={styles.advanceTxt}>Done</Text></View>)}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.white },
  filters: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, gap: 8 },
  filter: { paddingHorizontal: SPACING.lg, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.charcoal, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  filterActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  filterTxt: { fontWeight: "700", color: COLORS.white, fontSize: 12 },
  empty: { textAlign: "center", color: COLORS.textMuted, marginTop: 40 },
  orderCard: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.card, borderWidth: 1, borderColor: COLORS.border },
  ohead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  ono: { fontWeight: "900", fontSize: 15, color: COLORS.white },
  odate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusPill: { backgroundColor: COLORS.surfaceTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  statusTxt: { color: COLORS.gold, fontWeight: "800", fontSize: 11 },
  cust: { color: COLORS.white, fontWeight: "700", marginTop: SPACING.sm, fontSize: 13 },
  addr: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  items: { color: COLORS.textSecondary, fontSize: 12, marginTop: SPACING.sm },
  ofoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.md },
  amount: { fontWeight: "900", color: COLORS.gold },
  ofootActions: { flexDirection: "row", gap: 8 },
  rejectBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.error, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill },
  rejectTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },
  acceptBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill },
  acceptTxt: { color: COLORS.black, fontWeight: "800", fontSize: 12 },
  advanceBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill },
  advanceTxt: { color: COLORS.black, fontWeight: "800", fontSize: 12 },
});
