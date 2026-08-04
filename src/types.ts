export type OrderStatus = 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  in_stock: boolean;
  is_veg: boolean;
  is_bestseller: boolean;
  rating: number;
  prep_time: number;
  created_at?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  order_no: string;
  user_id?: string;
  user_name: string;
  user_phone: string;
  address: string;
  table_no?: string;
  order_type?: 'dine_in' | 'takeaway' | 'delivery';
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  status: OrderStatus;
  payment_method: 'cod' | 'razorpay' | 'cash' | 'upi' | 'card';
  payment_status: 'pending' | 'completed' | 'failed';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
  items: OrderItem[];
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  min_order: number;
  max_uses?: number;
  uses: number;
  active: boolean;
  expires_at?: string;
}

export interface RestaurantConfig {
  name: string;
  tagline: string;
  phone: string;
  address: string;
  gst_no: string;
  currency: string;
  tax_percent: number;
  is_accepting_orders: boolean;
  sound_notifications_enabled: boolean;
  auto_print_receipts: boolean;
  printer_ip: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'manager';
  avatar?: string;
}
