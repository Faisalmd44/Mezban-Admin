import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from "../../src/theme";
import { supabase } from "../../src/lib/supabase";
import { autoPrintNewOrder } from "../../src/services/PrinterService";

export default function POSScreen() {
  const [categories, setCategories] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [orderMode, setOrderMode] = useState<'dine_in' | 'takeaway' | 'delivery'>('takeaway');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('cash');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState('0');
  const [packingCharge, setPackingCharge] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');


  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('menu_items').select('*');
      if (error) throw error;
      setMenuItems(data || []);

      const uniqueCats = ['All', ...new Set((data || []).map((item: any) => item.category).filter(Boolean))];
      setCategories(uniqueCats as string[]);
    } catch (err: any) {
      Alert.alert('Error', 'Menu load failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: any) => {
    setCart(prevCart => {
      const existing = prevCart.find(c => c.id === item.id);
      if (existing) {
        return prevCart.map(c => 
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prevCart, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as any[]
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const discountAmt = discountType === 'flat' 
    ? Number(discountValue) || 0 
    : (subtotal * (Number(discountValue) || 0)) / 100;

  const packingAmt = Number(packingCharge) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmt + packingAmt);

    // 1. Dedicated Function to Print ONLY Bill/Invoice (KOT Disabled)
  const handlePrintReceipt = async () => {
    if (cart.length === 0) {
      Alert.alert('Warning', 'Cart is empty! Add items first.');
      return;
    }

    try {
      const invoicePayload = {
        id: `POS-${Date.now()}`,
        order_no: `POS-${Math.floor(1000 + Math.random() * 9000)}`,
        user_name: 'Walk-in Customer',
        user_phone: 'N/A',
        total: grandTotal,
        items: cart.map(item => ({
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity)
        })),
        status: 'completed',
        created_at: new Date().toISOString()
      };

      // Call Thermal Printer Service (Invoice Only, No KOT)
      await autoPrintNewOrder(invoicePayload as any);

      Alert.alert("Success 🎉", "Invoice printed successfully!");
    } catch (err: any) {
      Alert.alert("Print Error", err?.message || "Printer communication failed");
    }
  };

  // 2. Complete Offline Sale Handler (Fix Items Array in Supabase)

const handleCheckout = async () => {
  if (cart.length === 0) {
    Alert.alert('Warning', 'Cart is empty!');
    return;
  }

  setIsSubmitting(true);
  try {
    // Format items so Order Details screen displays them cleanly
    const formattedItems = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      total: Number(item.price) * Number(item.quantity)
    }));

    const finalName = customerName.trim() || 'Walk-in Customer';
    const finalPhone = customerPhone.trim() || 'N/A';

    const payload = {
      order_no: `MEZ-${Math.floor(10000000 + Math.random() * 90000000)}`,
      user_name: finalName,
      customer_name: finalName,
      user_phone: finalPhone,
      phone: finalPhone,
      order_source: 'pos',
      order_mode: orderMode,
      payment_mode: paymentMode,
      items: formattedItems,
      order_items: formattedItems,
      total: grandTotal,
      total_amount: grandTotal,
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      packing_charge: packingAmt,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;

if (newOrder) {
  const orderItems = formattedItems.map((i: any) => ({
    order_id: newOrder.id,
    item_id: i.id,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    variant: i.variant ?? null,
  }));

  const { error: itemError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemError) throw itemError;
}

    // 🔒 PRINT ONLY INVOICE (KOT Disabled Completely)
    try {
      await printReceiptInvoice({
        ...payload,
        id: newOrder?.id || `POS-${Date.now()}`
      });
    } catch (pErr) {
      console.log('Invoice print error:', pErr);
    }

    Alert.alert('Success 🎉', 'Sale completed & Invoice Printed!', [
      {
        text: 'OK',
        onPress: () => {
          setCart([]);
          setCustomerName('');
          setCustomerPhone('');
        }
      }
    ]);

    } catch (err: any) {
      Alert.alert('Checkout Error', err?.message || 'Database insert failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.headerTitle}>POS Billing</Text>
            <Text style={styles.headerSub}>Mezbaan Restro Terminal</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cart.reduce((a, c) => a + c.quantity, 0)} Items</Text>
          </View>
        </View>

        {/* Horizontal Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.catChip, selectedCategory === cat && styles.activeCatChip]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catText, selectedCategory === cat && styles.activeCatText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {/* Menu Items Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SELECT MENU ITEMS</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#ffc107" size="large" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.gridContainer}>
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.id === item.id);
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.itemCard, inCart && styles.activeItemCard]} 
                  onPress={() => addToCart(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                    {inCart ? (
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>x{inCart.quantity}</Text>
                      </View>
                    ) : (
                      <Ionicons name="add-circle" size={20} color="#ffc107" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Cart & Billing Section */}
        <View style={styles.billingCard}>
          <View style={styles.billingHeader}>
            <Ionicons name="receipt-outline" size={20} color="#ffc107" />
            <Text style={styles.billingTitle}>BILL SUMMARY</Text>
          </View>

          {/* Order Mode Selector */}
          <View style={styles.modeRow}>
            {(['dine_in', 'takeaway', 'delivery'] as const).map(mode => (
              <TouchableOpacity 
                key={mode} 
                style={[styles.modeBtn, orderMode === mode && styles.activeModeBtn]}
                onPress={() => setOrderMode(mode)}
              >
                <Text style={[styles.modeBtnText, orderMode === mode && styles.activeModeBtnText]}>
                  {mode.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cart Items List */}
          {cart.length === 0 ? (
            <View style={styles.emptyCartBox}>
              <Ionicons name="cart-outline" size={32} color="#444" />
              <Text style={styles.emptyText}>Tap menu items above to create a bill</Text>
            </View>
          ) : (
            <View style={styles.cartList}>
              {cart.map(item => (
                <View key={item.id} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>₹{item.price} each</Text>
                  </View>

                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
                      <Ionicons name="remove" size={14} color="#ffc107" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
                      <Ionicons name="add" size={14} color="#ffc107" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemSubtotal}>₹{item.price * item.quantity}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Calculations */}
          <View style={styles.calcBox}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Discount</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity onPress={() => setDiscountType(discountType === 'flat' ? 'percent' : 'flat')} style={styles.toggleBtn}>
                  <Text style={styles.toggleBtnText}>{discountType === 'flat' ? '₹ Flat' : '% Percent'}</Text>
                </TouchableOpacity>
                <TextInput 
                  style={styles.calcInput} 
                  keyboardType="numeric" 
                  value={discountValue} 
                  onChangeText={setDiscountValue} 
                />
              </View>
            </View>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Packing Charge (₹)</Text>
              <TextInput 
                style={styles.calcInput} 
                keyboardType="numeric" 
                value={packingCharge} 
                onChangeText={setPackingCharge} 
              />
            </View>
          </View>

          {/* Payment Method Selector */}
          <Text style={styles.payLabel}>SELECT PAYMENT METHOD</Text>
          <View style={styles.modeRow}>
            {(['cash', 'upi', 'card'] as const).map(pay => (
              <TouchableOpacity 
                key={pay} 
                style={[styles.payBtn, paymentMode === pay && styles.activePayBtn]}
                onPress={() => setPaymentMode(pay)}
              >
                <Text style={[styles.modeBtnText, paymentMode === pay && styles.activePayBtnText]}>{pay.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

<View style={{ marginBottom: 12, gap: 8 }}>
  <Text style={{ color: '#D4AF37', fontWeight: '600' }}>Customer Details (Optional)</Text>
  <TextInput
    placeholder="Customer Name (Optional)"
    placeholderTextColor="#666"
    value={customerName}
    onChangeText={setCustomerName}
    style={{
      backgroundColor: '#1A1A1A',
      color: '#FFF',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333',
    }}
  />
  <TextInput
    placeholder="Mobile Number (Optional)"
    placeholderTextColor="#666"
    keyboardType="phone-pad"
    value={customerPhone}
    onChangeText={setCustomerPhone}
    style={{
      backgroundColor: '#1A1A1A',
      color: '#FFF',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333',
    }}
  />
</View>

          {/* Grand Total & Action Buttons */}
          <View style={styles.totalSection}>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandLabel}>Grand Total</Text>
              <Text style={styles.grandTotalText}>₹{grandTotal}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.printBtn} 
                onPress={handlePrintReceipt}
              >
                <Ionicons name="print-outline" size={18} color="#ffc107" />
                <Text style={styles.printBtnText}>PRINT</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.checkoutBtn, isSubmitting && { opacity: 0.7 }]} 
                onPress={handleCheckout}
                disabled={isSubmitting}
              >
                <Text style={styles.checkoutBtnText}>{isSubmitting ? 'SAVING...' : 'COMPLETE SALE 🚀'}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, backgroundColor: '#121212', borderBottomWidth: 1, borderColor: '#222' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#ffc107', letterSpacing: 0.5 },
  headerSub: { fontSize: 12, color: '#888', marginTop: 1 },
  badge: { backgroundColor: 'rgba(255,193,7,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#ffc107' },
  badgeText: { color: '#ffc107', fontSize: 11, fontWeight: 'bold' },

  catScroll: { marginTop: 12 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1e1e1e', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#333' },
  activeCatChip: { backgroundColor: '#ffc107', borderColor: '#ffc107' },
  catText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  activeCatText: { color: '#000', fontWeight: 'bold' },

  mainScroll: { flex: 1, padding: 12 },
  sectionHeader: { marginBottom: 8, marginTop: 4 },
  sectionTitle: { color: '#666', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },

  // Menu Grid
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  itemCard: { width: '48%', backgroundColor: '#161616', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#262626', height: 90, justifyContent: 'space-between' },
  activeItemCard: { borderColor: '#ffc107', backgroundColor: '#1f1b0d' },
  itemName: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { color: '#ffc107', fontSize: 14, fontWeight: '800' },
  countBadge: { backgroundColor: '#ffc107', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  countText: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  // Billing Box
  billingCard: { backgroundColor: '#141414', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#222', marginBottom: 25 },
  billingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  billingTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },

  modeRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center', borderRadius: 8, backgroundColor: '#1e1e1e' },
  activeModeBtn: { backgroundColor: '#ffc107', borderColor: '#ffc107' },
  modeBtnText: { fontSize: 11, fontWeight: 'bold', color: '#888' },
  activeModeBtnText: { color: '#000' },

  emptyCartBox: { padding: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222', borderRadius: 10, borderStyle: 'dashed', marginBottom: 12 },
  emptyText: { color: '#666', fontSize: 12, marginTop: 6 },

  cartList: { marginBottom: 12 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#222' },
  cartItemName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cartItemPrice: { color: '#666', fontSize: 11, marginTop: 1 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1f1f1f', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  qtyBtn: { padding: 2 },
  qtyText: { color: '#fff', fontWeight: 'bold', fontSize: 12, minWidth: 14, textAlign: 'center' },
  itemSubtotal: { color: '#ffc107', fontWeight: 'bold', fontSize: 13, minWidth: 50, textAlign: 'right' },

  calcBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 10, marginBottom: 12 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  calcLabel: { color: '#aaa', fontSize: 12, fontWeight: '500' },
  calcInput: { backgroundColor: '#242424', borderWidth: 1, borderColor: '#333', color: '#fff', borderRadius: 6, width: 70, paddingVertical: 3, paddingHorizontal: 8, textAlign: 'center', fontSize: 12, fontWeight: 'bold' },
  toggleBtn: { backgroundColor: '#2a2a2a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  toggleBtnText: { color: '#ffc107', fontSize: 11, fontWeight: 'bold' },

  payLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 6 },
  payBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center', borderRadius: 8, backgroundColor: '#1e1e1e' },
  activePayBtn: { backgroundColor: '#4ade80', borderColor: '#4ade80' },
  activePayBtnText: { color: '#000', fontWeight: 'bold' },

  totalSection: { marginTop: 8, borderTopWidth: 1, borderColor: '#222', paddingTop: 12 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  grandLabel: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  grandTotalText: { color: '#ffc107', fontSize: 24, fontWeight: '900' },

  actionRow: { flexDirection: 'row', gap: 8 },
  printBtn: { flex: 1, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#ffc107', borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  printBtnText: { color: '#ffc107', fontWeight: '900', fontSize: 13 },
  checkoutBtn: { flex: 2, backgroundColor: '#ffc107', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  checkoutBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }
});
