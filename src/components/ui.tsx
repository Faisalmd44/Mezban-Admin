import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";

export function VegBadge({ veg, size = 14 }: { veg?: boolean; size?: number }) {
  const color = veg ? COLORS.veg : COLORS.nonVeg;
  return (
    <View style={[styles.vegBadge, { width: size, height: size, borderColor: color }]}>
      <View style={[styles.vegDot, { backgroundColor: color, width: size * 0.4, height: size * 0.4, borderRadius: (size * 0.4) / 2 }]} />
    </View>
  );
}

export function BestsellerBadge() {
  return (
    <View style={styles.bestseller}>
      <Ionicons name="flame" size={12} color="#fff" />
      <Text style={styles.bestsellerTxt}>BESTSELLER</Text>
    </View>
  );
}

export function RatingPill({ rating, count }: { rating: number; count?: number }) {
  return (
    <View style={styles.ratingPill}>
      <Ionicons name="star" size={12} color={COLORS.gold} />
      <Text style={styles.ratingTxt}>{rating.toFixed(1)}</Text>
      {count ? <Text style={styles.ratingCount}>({count})</Text> : null}
    </View>
  );
}

export function PrepTimePill({ minutes }: { minutes: number }) {
  return (
    <View style={styles.prepPill}>
      <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
      <Text style={styles.prepTxt}>{minutes} min</Text>
    </View>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: any) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnTxt}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  vegBadge: { borderWidth: 1.5, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  vegDot: { borderRadius: 2 },
  bestseller: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(245,166,35,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1, borderColor: COLORS.warning },
  bestsellerTxt: { color: COLORS.warning, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.surfaceTint, paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.xs },
  ratingTxt: { color: COLORS.gold, fontWeight: "800", fontSize: 11 },
  ratingCount: { color: COLORS.textMuted, fontSize: 10 },
  prepPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.surfaceTint, paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.xs },
  prepTxt: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "600" },
  sectionHeader: { fontSize: 16, fontWeight: "900", color: COLORS.white, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.white, marginTop: SPACING.md },
  emptySub: { color: COLORS.textSecondary },
  emptyBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.pill, ...SHADOW.gold },
  emptyBtnTxt: { color: COLORS.black, fontWeight: "800" },
});
