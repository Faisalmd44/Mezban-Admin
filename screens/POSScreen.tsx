import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../supabaseClient'; // Adjust path according to your structure

export default function POSScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);

  // Billing Options
  const [orderMode, setOrderMode] = useState('dine_in'); // dine_in, takeaway, delivery
  const [paymentMode, setPaymentMode] = useState('cash'); // cash, upi, card
  const [discountType, setDiscountType] = useState('flat'); // flat (₹) or percent (%)
  const [discountValue, setDiscountValue] = useState('0');
  const [packingCharge, setPackingCharge] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      const { data, error } = await supabase.from('menu_items').select('*');
      if (error) throw error;
      setMenuItems(data || []);

      // Extract unique categories
      const uniqueCats = ['All', ...new Set(data.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCats);
    } catch (err) {
      Alert.alert('Error', 'Menu items load nahi ho paye: ' + err.message);
    }
  };

  // Cart Functions
  const addToCart = (item) => {
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

  const updateQuantity = (id, delta) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };

  // Calculation Logic
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const discountAmt = discountType === 'flat'
    ? Number(discountValue) || 0
    : (subtotal * (Number(discountValue) || 0)) / 100;

  const packingAmt = Number(packingCharge) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmt + packingAmt);

  // Submit Order to Supabase
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Warning', 'Cart empty hai! Pehle items select karein.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems = cart.map(item => ({
        item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const payload = {
        order_source: 'pos',
        order_mode: orderMode,
        payment_mode: paymentMode,
        order_items: orderItems,
        total_amount: grandTotal,
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
        packing_charge: packingAmt,
        status: 'completed',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('orders').insert([payload]).select();

      if (error) throw error;

      Alert.alert('Success 🎉', 'Offline Sale Save Ho Gayi!', [
        {
          text: 'Print Receipt 🖨️',
          onPress: () => handlePrintReceipt(data[0])
        },
        { text: 'New Order', onPress: resetForm }
      ]);

    } catch (err) {
      Alert.alert('Error', 'Order save nahi hua: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setDiscountValue('0');
    setPackingCharge('0');
  };

  const handlePrintReceipt = (order) => {
    // Thermal Printing function triggers here
    console.log('Printing Order:', order);
  };

  const filteredItems = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* LEFT PANEL: Menu Items */}
          <View style={styles.menuContainer}>
            {/* Category Selector */}
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

            {/* Menu Items Grid */}
            <FlatList
              data={filteredItems}
              numColumns={2}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.itemCard} onPress={() => addToCart(item)}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* RIGHT PANEL: Cart & Billing */}
          <View style={styles.cartContainer}>
            <Text style={styles.cartHeader}>🛒 Offline Bill</Text>

            {/* Order Mode (Dine-In/Takeaway/Delivery) */}
            <View style={styles.modeRow}>
              {['dine_in', 'takeaway', 'delivery'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeBtn, orderMode === mode && styles.activeModeBtn]}
                  onPress={() => setOrderMode(mode)}
                >
                  <Text style={styles.modeBtnText}>{mode.replace('_', ' ').toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cart Items List */}
            <ScrollView style={styles.cartList}>
              {cart.map(item => (
                <View key={item.id} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>₹{item.price} x {item.quantity}</Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}><Text>-</Text></TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}><Text>+</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Adjustments: Discount & Packing */}
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Discount:</Text>
              <TouchableOpacity onPress={() => setDiscountType(discountType === 'flat' ? 'percent' : 'flat')} style={styles.toggleBtn}>
                <Text style={{fontWeight: 'bold'}}>{discountType === 'flat' ? '₹' : '%'}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.calcInput}
                keyboardType="numeric"
                value={discountValue}
                onChangeText={setDiscountValue}
              />
            </View>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Packing Charge (₹):</Text>
              <TextInput
                style={styles.calcInput}
                keyboardType="numeric"
                value={packingCharge}
                onChangeText={setPackingCharge}
              />
            </View>

            {/* Payment Mode */}
            <Text style={styles.calcLabel}>Payment Mode:</Text>
            <View style={styles.modeRow}>
              {['cash', 'upi', 'card'].map(pay => (
                <TouchableOpacity
                  key={pay}
                  style={[styles.payBtn, paymentMode === pay && styles.activePayBtn]}
                  onPress={() => setPaymentMode(pay)}
                >
                  <Text style={styles.modeBtnText}>{pay.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Total & Checkout */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>Grand Total: ₹{grandTotal}</Text>
              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={handleCheckout}
                disabled={isSubmitting}
              >
                <Text style={styles.checkoutBtnText}>{isSubmitting ? 'Saving...' : 'COMPLETE SALE 🚀'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f4f4f4' },
  menuContainer: { flex: 6, padding: 10 },
  cartContainer: { flex: 4, backgroundColor: '#fff', padding: 15, borderLeftWidth: 1, borderColor: '#ddd' },
  catScroll: { maxHeight: 50, marginBottom: 10 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#e0e0e0', borderRadius: 20, marginRight: 8 },
  activeCatChip: { backgroundColor: '#ff5722' },
  catText: { color: '#333' },
  activeCatText: { color: '#fff', fontWeight: 'bold' },
  itemCard: { flex: 1, margin: 5, padding: 15, backgroundColor: '#fff', borderRadius: 8, elevation: 2 },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemPrice: { fontSize: 14, color: '#2e7d32', marginTop: 5 },
  cartHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modeBtn: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#ccc', alignment: 'center', alignItems: 'center', borderRadius: 5, marginHorizontal: 2 },
  activeModeBtn: { backgroundColor: '#2196f3', borderColor: '#2196f3' },
  payBtn: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', borderRadius: 5, marginHorizontal: 2 },
  activePayBtn: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  modeBtnText: { fontSize: 12, fontWeight: 'bold' },
  cartList: { flex: 1, marginVertical: 10 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 0.5, borderColor: '#eee', pb: 5 },
  cartItemName: { fontWeight: 'bold' },
  cartItemPrice: { color: '#666', fontSize: 12 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 2, backgroundColor: '#ddd', borderRadius: 3 },
  qtyText: { marginHorizontal: 8, fontWeight: 'bold' },
  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calcLabel: { fontSize: 13, fontWeight: '500' },
  calcInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, width: 70, padding: 4, textAlign: 'center' },
  toggleBtn: { backgroundColor: '#eee', padding: 6, borderRadius: 5, marginLeft: 'auto', marginRight: 5 },
  totalContainer: { marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 },
  totalText: { fontSize: 18, fontWeight: 'bold', color: '#ff5722', marginBottom: 10, textAlign: 'right' },
  checkoutBtn: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

