import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";

export default function Analytics() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([api.adminStats(), api.adminOrders()]);
      setStats(s); setOrders(o);
    } catch {}
    finally { setLoading(false); setRefresh(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const statusBreakdown = orders.reduce((acc: Record<string, number>, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = stats?.revenue || 0;
  const avgOrderValue = stats?.total_orders ? totalRevenue / stats.total_orders : 0;
  const completionRate = stats?.total_orders && stats?.total_orders > 0
    ? ((statusBreakdown["delivered"] || 0) / stats.total_orders * 100).toFixed(1)
    : "0";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[COLORS.black, COLORS.brandDark]} style={styles.header}>
        <View><Text style={styles.title}>Analytics</Text><Text style={styles.sub}>Business Insights</Text></View>
      </LinearGradient>

      {loading || !stats ? (
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} tintColor={COLORS.gold} colors={[COLORS.gold]} />}>
          <View style={styles.statsRow}>
            <MetricCard title="Total Revenue" value={`₹${totalRevenue.toFixed(0)}`} icon="cash" color={COLORS.success} />
            <MetricCard title="Avg Order Value" value={`₹${avgOrderValue.toFixed(0)}`} icon="trending-up" color={COLORS.gold} />
          </View>
          <View style={styles.statsRow}>
            <MetricCard title="Total Orders" value={stats.total_orders} icon="receipt" color={COLORS.gold} />
            <MetricCard title="Completion Rate" value={`${completionRate}%`} icon="checkmark-circle" color={COLORS.success} />
          </View>
          <View style={styles.statsRow}>
            <MetricCard title="Active Orders" value={stats.active_orders} icon="time" color={COLORS.warning} />
            <MetricCard title="Total Customers" value={stats.total_customers} icon="people" color={COLORS.gold} />
          </View>

          <Text style={styles.section}>Order Status Breakdown</Text>
          <View style={styles.breakdownCard}>
            {Object.entries({ received: "Received", preparing: "Preparing", packed: "Packed", out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled" }).map(([key, label]) => {
              const count = statusBreakdown[key] || 0;
              const pct = stats.total_orders > 0 ? (count / stats.total_orders * 100).toFixed(0) : 0;
              return (
                <View key={key} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Ionicons name={key === "delivered" ? "checkmark-circle" : key === "cancelled" ? "close-circle" : "ellipse"} size={16} color={key === "delivered" ? COLORS.success : key === "cancelled" ? COLORS.error : COLORS.gold} />
                    <Text style={styles.breakdownLbl}>{label}</Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <Text style={styles.breakdownCount}>{count}</Text>
                    <Text style={styles.breakdownPct}>{pct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.section}>Recent Activity</Text>
          {orders.slice(0, 5).map((o) => (
            <View key={o.id} style={styles.activityCard}>
              <Ionicons name="receipt" size={18} color={COLORS.gold} />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.activityOrder}>#{o.order_no} • {o.user_name}</Text>
                <Text style={styles.activityTime}>{new Date(o.created_at).toLocaleString()}</Text>
              </View>
              <Text style={styles.activityAmount}>₹{o.total.toFixed(0)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MetricCard({ title, value, icon, color }: any) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.metricLbl}>{title}</Text>
      <Text style={styles.metricVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: 12 },
  title: { fontWeight: "900", fontSize: 20, color: COLORS.white },
  sub: { color: COLORS.gold, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  statsRow: { flexDirection: "row", paddingHorizontal: SPACING.lg, marginTop: SPACING.md, gap: SPACING.md },
  metricCard: { flex: 1, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 4, ...SHADOW.card },
  metricLbl: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
  metricVal: { fontSize: 20, fontWeight: "900", color: COLORS.white, marginTop: 2 },
  section: { fontWeight: "800", fontSize: 16, marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm, color: COLORS.white },
  breakdownCard: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  breakdownLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownLbl: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  breakdownRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  breakdownCount: { color: COLORS.gold, fontWeight: "900", fontSize: 16 },
  breakdownPct: { color: COLORS.textMuted, fontSize: 12 },
  activityCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  activityOrder: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  activityTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  activityAmount: { color: COLORS.gold, fontWeight: "900", fontSize: 14 },
});
