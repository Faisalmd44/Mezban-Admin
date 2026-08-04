import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./lib/supabase";

const API_BASE =
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mezbaan-api`;

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("mez_token");
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  console.log("API REQUEST:", `${API_BASE}${path}`);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  console.log("API STATUS:", res.status);
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

console.log("RESPONSE PATH:", path);
console.log("RESPONSE DATA:", JSON.stringify(data, null, 2));

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    console.log("API ERROR:", res.status, data);    
    throw new Error(msg);
  }
  return data;
}

export type GoogleLoginPayload = {
  google_id: string;
  email: string;
  name: string;
  picture?: string;
  device_id: string;
};

export type EmailPasswordLoginPayload = {
  supabase_token: string;
  email: string;
  name: string;
  device_id: string;
};

export const api = {
  googleLogin: (payload: GoogleLoginPayload) => request("/auth/google", { method: "POST", body: JSON.stringify(payload) }),
  emailPasswordLogin: (payload: EmailPasswordLoginPayload) =>
  request("/auth/email-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${payload.supabase_token}`,
    },
    body: JSON.stringify(payload),
  }),
  me: () => request("/auth/me"),
  updateMobile: (phone: string) => request("/auth/update-mobile", { method: "PATCH", body: JSON.stringify({ phone }) }),
  saveAddress: (payload: { label: string; line: string; is_default?: boolean }) => request("/auth/address", { method: "POST", body: JSON.stringify(payload) }),
  menu: () => request("/menu"),
  item: (id: string) => request(`/menu/${id}`),
  placeOrder: (payload: any) => request("/orders", { method: "POST", body: JSON.stringify(payload) }),
  orders: () => request("/orders"),
    
  order: async (id: string) => {
    let apiData = null;
    try {
      apiData = await request(`/admin/orders/${id}`);
      
      let hasItems = false;
      if (Array.isArray(apiData?.items) && apiData.items.length > 0) hasItems = true;
      if (Array.isArray(apiData?.order_items) && apiData.order_items.length > 0) hasItems = true;

      if (apiData && !apiData.error && hasItems) {
        return apiData;
      }
    } catch (e) {
      console.log("api.order request error, attempting direct supabase fallback:", e);
    }

    let query = supabase.from("orders").select("*, order_items(*)");
    if (id.startsWith("MEZ-") || id.startsWith("POS-")) {
      query = query.eq("order_no", id);
    } else {
      query = query.eq("id", id);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      if (apiData) return apiData;
      throw new Error(error?.message || "Order not found");
    }

    let rawItems = [];
    if (Array.isArray(data.order_items) && data.order_items.length > 0) {
      rawItems = data.order_items;
    } else if (Array.isArray(data.items) && data.items.length > 0) {
      rawItems = data.items;
    } else if (typeof data.items === "string") {
      try { rawItems = JSON.parse(data.items); } catch {}
    } else if (typeof data.order_items === "string") {
      try { rawItems = JSON.parse(data.order_items); } catch {}
    }

    return {
      ...data,
      items: rawItems,
      order_items: rawItems,
      user_name: data.user_name || data.customer_name || "Walk-in Customer",
      customer_name: data.customer_name || data.user_name || "Walk-in Customer",
      user_phone: data.user_phone || data.phone || "N/A",
      phone: data.phone || data.user_phone || "N/A",
    };
  },

  coupons: () => request("/coupons"),
  razorpayConfig: () => request("/payments/razorpay/config"),
  verifyRazorpay: (payload: any) => request("/payments/razorpay/verify", { method: "POST", body: JSON.stringify(payload) }),
  cancelRazorpay: (order_id: string) => request("/payments/razorpay/cancel", { method: "POST", body: JSON.stringify({ order_id }) }),
  adminOrders: async () => {
    try {
      const data = await request("/admin/orders");
      console.log("ADMIN ORDERS:", JSON.stringify(data, null, 2));
      return data;
    } catch (e) {
      const { data } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      return (data || []).map((o: any) => {
        let rawItems = [];
        if (Array.isArray(o.order_items) && o.order_items.length > 0) rawItems = o.order_items;
        else if (Array.isArray(o.items) && o.items.length > 0) rawItems = o.items;
        else if (typeof o.items === "string") { try { rawItems = JSON.parse(o.items); } catch {} }
        return {
          ...o,
          items: rawItems,
          order_items: rawItems,
          user_name: o.user_name || o.customer_name || "Walk-in Customer",
          customer_name: o.customer_name || o.user_name || "Walk-in Customer",
          user_phone: o.user_phone || o.phone || "N/A",
          phone: o.phone || o.user_phone || "N/A",
        };
      });
    }
  },
  adminUpdateStatus: (id: string, status: string) => request(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  adminStats: async () => {
    const data = await request("/admin/stats");
    console.log("ADMIN STATS:", data);
    return data;
  },
  adminToggleStock: (id: string, in_stock: boolean) => request(`/admin/menu/${id}`, { method: "PATCH", body: JSON.stringify({ in_stock }) }),
  adminCreateMenuItem: (payload: any) => request("/admin/menu", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateMenuItem: (id: string, payload: any) => request(`/admin/menu/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminDeleteMenuItem: (id: string) => request(`/admin/menu/${id}`, { method: "DELETE" }),
  adminListCoupons: () => request("/admin/coupons"),
  adminUpdateCoupon: (code: string, payload: any) => request(`/admin/coupons/${code}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminPendingOrders: () => request("/admin/orders/pending"),
  registerFCMToken: (token: string) => request("/auth/fcm-token", { method: "POST", body: JSON.stringify({ token }) }),
};
