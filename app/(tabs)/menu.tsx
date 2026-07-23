import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Switch,
  Modal, ScrollView, TextInput, Alert, TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";

type Variant = { name: string; price: number };
type MenuItem = {
  id: string; name: string; description: string; price: number; category: string;
  image: string; in_stock: boolean; is_veg: boolean; is_bestseller: boolean;
  rating: number; prep_time: number; variants: Variant[];
};

const CATEGORIES = ["All", "Burgers", "Pizza", "Pasta", "Fries", "Wraps", "Nuggets", "Combos"];

export default function MenuManagement() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.menu();
      setItems(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => {
    const matchCat = activeCat === "All" || i.category === activeCat;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.description || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const toggle = async (item: MenuItem) => {
    await api.adminToggleStock(item.id, !item.in_stock);
    setItems((arr) => arr.map((i) => i.id === item.id ? { ...i, in_stock: !i.in_stock } : i));
  };

  const handleEdit = (item: MenuItem) => {
    setEditing(item);
    setIsAdding(false);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setIsAdding(true);
    setShowForm(true);
  };

  const handleDelete = (item: MenuItem) => {
    Alert.alert("Delete Item", `Remove "${item.name}" from the menu?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await api.adminDeleteMenuItem(item.id);
            setItems((arr) => arr.filter((i) => i.id !== item.id));
          } catch { Alert.alert("Error", "Failed to delete item."); }
        },
      },
    ]);
  };

  const handleSave = async (payload: any, id?: string) => {
    try {
      if (id) {
        const updated = await api.adminUpdateMenuItem(id, payload);
        setItems((arr) => arr.map((i) => i.id === id ? { ...i, ...updated } : i));
      } else {
        const created = await api.adminCreateMenuItem(payload);
        setItems((arr) => [...arr, created]);
      }
      setShowForm(false);
      setEditing(null);
    } catch {
      Alert.alert("Error", "Failed to save item.");
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[COLORS.black, COLORS.brandDark]} style={styles.header}>
        <View>
          <Text style={styles.title}>Manage Menu</Text>
          <Text style={styles.sub}>{items.length} items • {filtered.length} shown</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={handleAdd}>
          <Ionicons name="add" size={22} color={COLORS.black} />
          <Text style={styles.addBtnTxt}>Add</Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: SPACING.lg }}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setActiveCat(cat)}
            style={[styles.catChip, activeCat === cat && styles.catChipActive]}
          >
            <Text style={[styles.catChipTxt, activeCat === cat && { color: COLORS.black }]}>{cat}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTxt}>No items found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`amenu-${item.id}`}>
              <Image source={item.image} style={styles.img} contentFit="cover" />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name={item.is_veg ? "leaf" : "flame"} size={12} color={item.is_veg ? COLORS.success : COLORS.error} />
                  <Text style={styles.name}>{item.name}</Text>
                </View>
                <Text style={styles.meta}>{item.category} • ₹{item.price}</Text>
                {item.is_bestseller && (
                  <View style={styles.bestsellerTag}>
                    <Ionicons name="star" size={10} color={COLORS.gold} />
                    <Text style={styles.bestsellerTxt}>Bestseller</Text>
                  </View>
                )}
                {item.variants && item.variants.length > 0 && (
                  <Text style={styles.variantInfo}>{item.variants.length} variant{item.variants.length > 1 ? "s" : ""}</Text>
                )}
                <View style={[styles.tag, { backgroundColor: item.in_stock ? "rgba(61,214,140,0.15)" : "rgba(255,90,95,0.15)" }]}>
                  <Text style={{ color: item.in_stock ? COLORS.success : COLORS.error, fontWeight: "700", fontSize: 11 }}>
                    {item.in_stock ? "IN STOCK" : "OUT OF STOCK"}
                  </Text>
                </View>
              </View>
              <View style={styles.actionsCol}>
                <Switch
                  testID={`stock-${item.id}`}
                  value={item.in_stock}
                  onValueChange={() => toggle(item)}
                  trackColor={{ true: COLORS.gold, false: COLORS.border }}
                  thumbColor={COLORS.white}
                />
                <View style={styles.iconActions}>
                  <Pressable style={styles.iconBtn} onPress={() => handleEdit(item)}>
                    <Ionicons name="create-outline" size={18} color={COLORS.gold} />
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {showForm && (
        <MenuItemForm
          item={editing}
          isAdding={isAdding}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </View>
  );
}

function MenuItemForm({ item, isAdding, onClose, onSave }: {
  item: MenuItem | null;
  isAdding: boolean;
  onClose: () => void;
  onSave: (payload: any, id?: string) => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [price, setPrice] = useState(String(item?.price ?? ""));
  const [category, setCategory] = useState(item?.category || "Burgers");
  const [image, setImage] = useState(item?.image || "");
  const [isVeg, setIsVeg] = useState(item?.is_veg ?? true);
  const [isBestseller, setIsBestseller] = useState(item?.is_bestseller ?? false);
  const [inStock, setInStock] = useState(item?.in_stock ?? true);
  const [rating, setRating] = useState(String(item?.rating ?? "0"));
  const [prepTime, setPrepTime] = useState(String(item?.prep_time ?? "30"));
  const [variants, setVariants] = useState<Variant[]>(item?.variants || []);
  const [newVarName, setNewVarName] = useState("");
  const [newVarPrice, setNewVarPrice] = useState("");

  const addVariant = () => {
    if (!newVarName.trim() || !newVarPrice.trim()) return;
    setVariants((v) => [...v, { name: newVarName.trim(), price: Number(newVarPrice) }]);
    setNewVarName("");
    setNewVarPrice("");
  };

  const removeVariant = (idx: number) => {
    setVariants((v) => v.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert("Missing Fields", "Name and price are required.");
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      category,
      image: image.trim() || null,
      in_stock: inStock,
      is_veg: isVeg,
      is_bestseller: isBestseller,
      rating: Number(rating) || 0,
      prep_time: Number(prepTime) || 30,
      variants,
    }, item?.id);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isAdding ? "Add Menu Item" : "Edit Menu Item"}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {image ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={image} style={styles.imagePreview} contentFit="cover" />
                <Pressable style={styles.removeImgBtn} onPress={() => setImage("")}>
                  <Ionicons name="close-circle" size={22} color={COLORS.error} />
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Item name" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input, { minHeight: 60 }]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={COLORS.textMuted} multiline />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>Price (₹) *</Text>
                <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.fieldLabel}>Prep Time (min)</Text>
                <TextInput style={styles.input} value={prepTime} onChangeText={setPrepTime} placeholder="30" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                >
                  <Text style={[styles.catChipTxt, category === cat && { color: COLORS.black }]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Image URL</Text>
            <TextInput style={styles.input} value={image} onChangeText={setImage} placeholder="https://..." placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />

            <View style={styles.row}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Veg</Text>
                <Switch value={isVeg} onValueChange={setIsVeg} trackColor={{ true: COLORS.gold, false: COLORS.border }} thumbColor={COLORS.white} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Bestseller</Text>
                <Switch value={isBestseller} onValueChange={setIsBestseller} trackColor={{ true: COLORS.gold, false: COLORS.border }} thumbColor={COLORS.white} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>In Stock</Text>
                <Switch value={inStock} onValueChange={setInStock} trackColor={{ true: COLORS.gold, false: COLORS.border }} thumbColor={COLORS.white} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>Rating</Text>
                <TextInput style={styles.input} value={rating} onChangeText={setRating} placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Variants</Text>
            {variants.map((v, i) => (
              <View key={i} style={styles.variantRow}>
                <Text style={styles.variantName}>{v.name}</Text>
                <Text style={styles.variantPrice}>₹{v.price}</Text>
                <Pressable onPress={() => removeVariant(i)}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addVariantRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 6 }]}
                value={newVarName}
                onChangeText={setNewVarName}
                placeholder="Variant name"
                placeholderTextColor={COLORS.textMuted}
              />
              <TextInput
                style={[styles.input, { width: 80, marginRight: 6 }]}
                value={newVarPrice}
                onChangeText={setNewVarPrice}
                placeholder="₹"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
              <Pressable style={styles.addVarBtn} onPress={addVariant}>
                <Ionicons name="add" size={18} color={COLORS.gold} />
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnTxt}>{isAdding ? "Add Item" : "Save Changes"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: 12 },
  title: { fontWeight: "900", fontSize: 22, color: COLORS.white },
  sub: { color: COLORS.gold, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, ...SHADOW.card },
  addBtnTxt: { color: COLORS.black, fontWeight: "800", fontSize: 14 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14, padding: 0 },
  catScroll: { flexGrow: 0, marginBottom: SPACING.sm },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.charcoal, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  catChipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  catChipTxt: { color: COLORS.white, fontWeight: "700", fontSize: 12 },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyTxt: { color: COLORS.textMuted, fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  img: { width: 56, height: 56, borderRadius: 8 },
  name: { fontWeight: "800", color: COLORS.white, fontSize: 14, flexShrink: 1 },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  bestsellerTag: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4, backgroundColor: "rgba(212,175,55,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, alignSelf: "flex-start" },
  bestsellerTxt: { color: COLORS.gold, fontWeight: "700", fontSize: 10 },
  variantInfo: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4, fontStyle: "italic" },
  tag: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
  actionsCol: { alignItems: "center", gap: 8 },
  iconActions: { flexDirection: "row", gap: 12 },
  iconBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.blackSoft, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "92%", paddingBottom: 0 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  modalTitle: { fontWeight: "900", fontSize: 18, color: COLORS.white },
  closeBtn: { padding: 4 },
  imagePreviewWrap: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm },
  imagePreview: { width: "100%", height: 140, borderRadius: RADIUS.md },
  removeImgBtn: { position: "absolute", top: 8, right: 8 },
  fieldLabel: { color: COLORS.gold, fontWeight: "700", fontSize: 12, marginTop: SPACING.sm, marginBottom: 4, marginHorizontal: SPACING.lg, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, color: COLORS.white, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: SPACING.lg },
  row: { flexDirection: "row", alignItems: "center", marginHorizontal: SPACING.lg, gap: 4 },
  toggleRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  toggleLabel: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  variantRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: SPACING.lg, marginBottom: 6, paddingHorizontal: SPACING.md, paddingVertical: 8, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  variantName: { color: COLORS.white, fontWeight: "700", fontSize: 13, flex: 1 },
  variantPrice: { color: COLORS.gold, fontWeight: "700", fontSize: 13, marginRight: 12 },
  addVariantRow: { flexDirection: "row", alignItems: "center", marginHorizontal: SPACING.lg, marginBottom: 8 },
  addVarBtn: { backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, padding: 10, borderWidth: 1, borderColor: COLORS.gold },
  modalFooter: { flexDirection: "row", gap: 12, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderTopColor: COLORS.border, borderTopWidth: 1 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.charcoal, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnTxt: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  saveBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.gold },
  saveBtnTxt: { color: COLORS.black, fontWeight: "800", fontSize: 15 },
});
