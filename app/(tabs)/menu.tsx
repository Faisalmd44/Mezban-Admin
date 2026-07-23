import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Switch } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";

export default function MenuManagement() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const d = await api.menu();
    setItems(d);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (item: any) => {
    await api.adminToggleStock(item.id, !item.in_stock);
    setItems((arr) => arr.map((i) => i.id === item.id ? { ...i, in_stock: !i.in_stock } : i));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>Manage Menu</Text></View>
      {loading ? <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: SPACING.lg }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`amenu-${item.id}`}>
              <Image source={item.image} style={styles.img} contentFit="cover" />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.category} • ₹{item.price}</Text>
                <View style={[styles.tag, { backgroundColor: item.in_stock ? "rgba(61,214,140,0.15)" : "rgba(255,90,95,0.15)" }]}>
                  <Text style={{ color: item.in_stock ? COLORS.success : COLORS.error, fontWeight: "700", fontSize: 11 }}>{item.in_stock ? "IN STOCK" : "OUT OF STOCK"}</Text>
                </View>
              </View>
              <Switch testID={`stock-${item.id}`} value={item.in_stock} onValueChange={() => toggle(item)} trackColor={{ true: COLORS.gold, false: COLORS.border }} thumbColor={COLORS.white} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.white },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  img: { width: 56, height: 56, borderRadius: 8 },
  name: { fontWeight: "800", color: COLORS.white },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  tag: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
});
