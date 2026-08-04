import { MenuItem, Order, Coupon, RestaurantConfig, UserProfile, OrderStatus } from '../types';
import { audioService } from './audio';
import { supabase } from '../lib/supabase';
import { api } from '../api';

const STORAGE_KEYS = {
  MENU: 'mezbaan_menu_items_v2',
  ORDERS: 'mezbaan_orders_v2',
  COUPONS: 'mezbaan_coupons_v2',
  CONFIG: 'mezbaan_config_v2',
  USER: 'mezbaan_user_v2',
};

const INITIAL_MENU: MenuItem[] = [];
const INITIAL_ORDERS: Order[] = [];
const INITIAL_COUPONS: Coupon[] = [];

const INITIAL_CONFIG: RestaurantConfig = {
  name: 'Mezbaan Authentic Kitchen',
  tagline: 'Royal Awadhi & Hyderabadi Cuisine',
  phone: '+91 98765 00112',
  address: '104, Heritage Food Square, Park Street, Hyderabad',
  gst_no: '36AAAAA0000A1Z5',
  currency: '₹',
  tax_percent: 5,
  is_accepting_orders: true,
  sound_notifications_enabled: true,
  auto_print_receipts: false,
  printer_ip: '192.168.1.100',
};

const INITIAL_USER: UserProfile = {
  id: 'u-admin-1',
  name: 'Faisal (Admin)',
  email: 'faisalmd44@gmail.com',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

class StoreService {
  private menu: MenuItem[] = [];
  private orders: Order[] = [];
  private coupons: Coupon[] = [];
  private config: RestaurantConfig = INITIAL_CONFIG;
  private user: UserProfile | null = INITIAL_USER;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.clearDemoStorage();
    this.initSupabaseSync();
  }

  private clearDemoStorage() {
    try {
      localStorage.removeItem(STORAGE_KEYS.MENU);
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.removeItem(STORAGE_KEYS.COUPONS);
    } catch (e) {
      console.warn('LocalStorage clear error:', e);
    }
  }

  public async fetchMenuFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        this.menu = data.map((item: any) => ({
          id: String(item.id),
          name: item.name || '',
          description: item.description || '',
          price: Number(item.price || 0),
          category: item.category || 'General',
          image: item.image || item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
          in_stock: item.in_stock !== false,
          is_veg: Boolean(item.is_veg),
          is_bestseller: Boolean(item.is_bestseller),
          rating: item.rating ? Number(item.rating) : 4.5,
          prep_time: item.prep_time ? Number(item.prep_time) : 20,
          created_at: item.created_at || new Date().toISOString(),
        }));
        this.notify();
        return;
      }
    } catch (e) {
      console.warn('Error querying menu_items directly from Supabase:', e);
    }

    try {
      const apiData = await api.menu();
      if (Array.isArray(apiData) && apiData.length > 0) {
        this.menu = apiData.map((item: any) => ({
          id: String(item.id),
          name: item.name || '',
          description: item.description || '',
          price: Number(item.price || 0),
          category: item.category || 'General',
          image: item.image || item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
          in_stock: item.in_stock !== false,
          is_veg: Boolean(item.is_veg),
          is_bestseller: Boolean(item.is_bestseller),
          rating: item.rating ? Number(item.rating) : 4.5,
          prep_time: item.prep_time ? Number(item.prep_time) : 20,
          created_at: item.created_at || new Date().toISOString(),
        }));
        this.notify();
      }
    } catch (e) {
      console.warn('Error fetching menu via API:', e);
    }
  }

  public async fetchOrdersFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        this.orders = data.map((o: any) => {
          let rawItems = [];
          if (Array.isArray(o.order_items) && o.order_items.length > 0) rawItems = o.order_items;
          else if (Array.isArray(o.items) && o.items.length > 0) rawItems = o.items;
          else if (typeof o.items === 'string') { try { rawItems = JSON.parse(o.items); } catch {} }

          return {
            id: String(o.id),
            order_no: String(o.order_no || o.id),
            user_name: o.user_name || o.customer_name || 'Customer',
            user_phone: o.user_phone || o.phone || 'N/A',
            address: o.address || (o.table_no ? `Table #${o.table_no}` : 'Takeaway'),
            table_no: o.table_no,
            order_type: o.order_type || 'dine_in',
            subtotal: Number(o.subtotal || o.total || 0),
            tax: Number(o.tax || 0),
            discount: Number(o.discount || 0),
            total: Number(o.total || o.total_amount || 0),
            status: o.status || 'received',
            payment_method: o.payment_method || 'cash',
            payment_status: o.payment_status || 'completed',
            created_at: o.created_at || new Date().toISOString(),
            items: rawItems.map((i: any) => ({
              item_id: String(i.item_id || i.id || ''),
              name: i.name || i.item_name || 'Item',
              price: Number(i.price || i.unit_price || 0),
              quantity: Number(i.quantity || 1),
              notes: i.notes || '',
            })),
          };
        });
        this.notify();
      }
    } catch (e) {
      console.warn('Error fetching orders from Supabase:', e);
    }
  }

  public async fetchCouponsFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        this.coupons = data.map((c: any) => ({
          id: String(c.id || c.code),
          code: c.code,
          discount_type: c.discount_type || 'flat',
          discount_value: Number(c.discount_value || 0),
          min_order: Number(c.min_order || 0),
          uses: Number(c.uses || 0),
          active: Boolean(c.active !== false),
        }));
        this.notify();
      }
    } catch (e) {
      console.warn('Error fetching coupons from Supabase:', e);
    }
  }

  private initSupabaseSync() {
    this.fetchMenuFromSupabase();
    this.fetchOrdersFromSupabase();
    this.fetchCouponsFromSupabase();

    try {
      supabase
        .channel('admin-store-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
          this.fetchMenuFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          this.fetchOrdersFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => {
          this.fetchCouponsFromSupabase();
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error in storeService:', err);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.user));
    } catch (e) {
      console.warn('LocalStorage error saving state:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((l) => l());
  }

  // GETTERS
  public getMenu(): MenuItem[] { return this.menu; }
  public getOrders(): Order[] { return this.orders; }
  public getCoupons(): Coupon[] { return this.coupons; }
  public getConfig(): RestaurantConfig { return this.config; }
  public getUser(): UserProfile | null { return this.user; }

  public getPendingOrdersCount(): number {
    return this.orders.filter((o) => o.status === 'received').length;
  }

  public getTodayRevenue(): number {
    return this.orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0);
  }

  // ACTIONS
  public async toggleStockItem(id: string, in_stock?: boolean) {
    const current = this.menu.find((i) => i.id === id);
    const newStock = in_stock ?? !current?.in_stock;
    this.menu = this.menu.map((item) => {
      if (item.id === id) {
        return { ...item, in_stock: newStock };
      }
      return item;
    });
    this.notify();

    try {
      await supabase.from('menu_items').update({ in_stock: newStock }).eq('id', id);
    } catch (e) {
      console.warn('Error updating stock in Supabase:', e);
    }
  }

  public async addMenuItem(item: Omit<MenuItem, 'id'>) {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert([{
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image_url: item.image,
          in_stock: item.in_stock,
          is_veg: item.is_veg,
          is_bestseller: item.is_bestseller,
        }])
        .select()
        .single();

      if (!error && data) {
        await this.fetchMenuFromSupabase();
        return data;
      }
    } catch (e) {
      console.warn('Error inserting menu item into Supabase:', e);
    }

    const newItem: MenuItem = {
      ...item,
      id: 'm_' + Date.now(),
      created_at: new Date().toISOString(),
    };
    this.menu = [newItem, ...this.menu];
    this.notify();
    return newItem;
  }

  public async updateMenuItem(id: string, updates: Partial<MenuItem>) {
    this.menu = this.menu.map((item) => (item.id === id ? { ...item, ...updates } : item));
    this.notify();

    try {
      const dbUpdates: any = { ...updates };
      if (updates.image) {
        dbUpdates.image_url = updates.image;
        delete dbUpdates.image;
      }
      await supabase.from('menu_items').update(dbUpdates).eq('id', id);
    } catch (e) {
      console.warn('Error updating menu item in Supabase:', e);
    }
  }

  public async deleteMenuItem(id: string) {
    this.menu = this.menu.filter((item) => item.id !== id);
    this.notify();

    try {
      await supabase.from('menu_items').delete().eq('id', id);
    } catch (e) {
      console.warn('Error deleting menu item from Supabase:', e);
    }
  }

  public async updateOrderStatus(id: string, newStatus: OrderStatus) {
    this.orders = this.orders.map((o) => {
      if (o.id === id) {
        return { ...o, status: newStatus };
      }
      return o;
    });
    this.notify();

    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    } catch (e) {
      console.warn('Error updating order status in Supabase:', e);
    }
  }

  public createPOSOrder(payload: {
    customer_name: string;
    customer_phone: string;
    table_no?: string;
    order_type: 'dine_in' | 'takeaway' | 'delivery';
    items: { item: MenuItem; quantity: number; notes?: string }[];
    payment_method: 'cash' | 'upi' | 'card' | 'cod';
    discount: number;
  }): Order {
    const subtotal = payload.items.reduce((sum, i) => sum + i.item.price * i.quantity, 0);
    const tax = Math.round((subtotal * this.config.tax_percent) / 100);
    const total = Math.max(0, subtotal + tax - payload.discount);

    const orderNo = 'MEZ-' + Math.floor(10000000 + Math.random() * 90000000);

    const itemsFormatted = payload.items.map((i) => ({
      item_id: i.item.id,
      name: i.item.name,
      price: i.item.price,
      quantity: i.quantity,
      notes: i.notes,
    }));

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      order_no: orderNo,
      user_name: payload.customer_name || 'Walk-in Customer',
      user_phone: payload.customer_phone || 'N/A',
      address: payload.table_no ? `Table #${payload.table_no}` : payload.order_type.toUpperCase(),
      table_no: payload.table_no,
      order_type: payload.order_type,
      subtotal,
      tax,
      discount: payload.discount,
      total,
      status: 'received',
      payment_method: payload.payment_method,
      payment_status: 'completed',
      created_at: new Date().toISOString(),
      items: itemsFormatted,
    };

    this.orders = [newOrder, ...this.orders];

    if (this.config.sound_notifications_enabled) {
      audioService.playNewOrderAlarm();
    }

    this.notify();

    // Async sync to Supabase
    (async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .insert([{
            order_no: orderNo,
            user_name: payload.customer_name || 'Walk-in Customer',
            customer_name: payload.customer_name || 'Walk-in Customer',
            user_phone: payload.customer_phone || 'N/A',
            phone: payload.customer_phone || 'N/A',
            table_no: payload.table_no || null,
            order_type: payload.order_type,
            subtotal,
            tax,
            discount: payload.discount,
            total,
            status: 'received',
            payment_method: payload.payment_method,
            payment_status: 'completed',
            items: JSON.stringify(itemsFormatted),
          }])
          .select()
          .single();

        if (data) {
          const orderItems = itemsFormatted.map((i) => ({
            order_id: data.id,
            menu_item_id: i.item_id,
            item_name: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            total_price: i.price * i.quantity,
            notes: i.notes || null,
          }));
          await supabase.from('order_items').insert(orderItems);
          this.fetchOrdersFromSupabase();
        }
      } catch (e) {
        console.warn('Error persisting POS order to Supabase:', e);
      }
    })();

    return newOrder;
  }

  public updateConfig(updates: Partial<RestaurantConfig>) {
    this.config = { ...this.config, ...updates };
    this.notify();
  }

  public addSampleIncomingOrder() {
    if (this.menu.length === 0) return null;
    const sampleNames = ['Siddharth Mehta', 'Neha Kapoor', 'Karan Patel', 'Meera Reddy'];
    const samplePhone = '+91 98220 ' + Math.floor(10000 + Math.random() * 90000);
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randomItem1 = this.menu[Math.floor(Math.random() * this.menu.length)];
    const randomItem2 = this.menu[Math.floor(Math.random() * this.menu.length)];

    const items = [
      { item_id: randomItem1.id, name: randomItem1.name, price: randomItem1.price, quantity: 2 },
      ...(randomItem1.id !== randomItem2.id
        ? [{ item_id: randomItem2.id, name: randomItem2.name, price: randomItem2.price, quantity: 1 }]
        : []),
    ];

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = Math.round((subtotal * this.config.tax_percent) / 100);
    const total = subtotal + tax;

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      order_no: 'MEZ-' + Math.floor(10000000 + Math.random() * 90000000),
      user_name: randomName,
      user_phone: samplePhone,
      address: `Table #${Math.floor(1 + Math.random() * 12)} (Online Order)`,
      order_type: 'dine_in',
      subtotal,
      tax,
      discount: 0,
      total,
      status: 'received',
      payment_method: 'upi',
      payment_status: 'completed',
      created_at: new Date().toISOString(),
      items,
    };

    this.orders = [newOrder, ...this.orders];

    if (this.config.sound_notifications_enabled) {
      audioService.playNewOrderAlarm();
    }

    this.notify();
    return newOrder;
  }

  public setUser(user: UserProfile | null) {
    this.user = user;
    this.notify();
  }

  public resetToDefaults() {
    this.fetchMenuFromSupabase();
    this.fetchOrdersFromSupabase();
    this.fetchCouponsFromSupabase();
  }
}

export const storeService = new StoreService();
