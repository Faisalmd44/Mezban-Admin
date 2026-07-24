import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mezbaan-api`;

const API_BASE =
  "https://jppuqbujxtmemusmbgnv.supabase.co/functions/v1/mezbaan-api";

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

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
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
  emailPasswordLogin: (payload: EmailPasswordLoginPayload) => request("/auth/email-password", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  updateMobile: (phone: string) => request("/auth/update-mobile", { method: "PATCH", body: JSON.stringify({ phone }) }),
  saveAddress: (payload: { label: string; line: string; is_default?: boolean }) => request("/auth/address", { method: "POST", body: JSON.stringify(payload) }),
  menu: () => request("/menu"),
  item: (id: string) => request(`/menu/${id}`),
  placeOrder: (payload: any) => request("/orders", { method: "POST", body: JSON.stringify(payload) }),
  orders: () => request("/orders"),
  order: (id: string) => request(`/orders/${id}`),
  coupons: () => request("/coupons"),
  razorpayConfig: () => request("/payments/razorpay/config"),
  verifyRazorpay: (payload: any) => request("/payments/razorpay/verify", { method: "POST", body: JSON.stringify(payload) }),
  cancelRazorpay: (order_id: string) => request("/payments/razorpay/cancel", { method: "POST", body: JSON.stringify({ order_id }) }),
  adminOrders: () => request("/admin/orders"),
  adminUpdateStatus: (id: string, status: string) => request(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  adminStats: () => request("/admin/stats"),
  adminToggleStock: (id: string, in_stock: boolean) => request(`/admin/menu/${id}`, { method: "PATCH", body: JSON.stringify({ in_stock }) }),
  adminCreateMenuItem: (payload: any) => request("/admin/menu", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateMenuItem: (id: string, payload: any) => request(`/admin/menu/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminDeleteMenuItem: (id: string) => request(`/admin/menu/${id}`, { method: "DELETE" }),
  adminListCoupons: () => request("/admin/coupons"),
  adminUpdateCoupon: (code: string, payload: any) => request(`/admin/coupons/${code}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminPendingOrders: () => request("/admin/orders/pending"),
  registerFCMToken: (token: string) => request("/auth/fcm-token", { method: "POST", body: JSON.stringify({ token }) }),
};
