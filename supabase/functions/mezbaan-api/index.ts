import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(msg: string, status = 400) {
  return json({ error: msg }, status);
}

async function getAuthUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  const { data, error: e } = await supabase.auth.getUser(token);
  if (e || !data.user) return null;
  return data.user;
}

async function getUserProfile(userId: string) {
  const { data } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  return data;
}

async function upsertUser(userId: string, email: string, name: string, picture?: string, googleId?: string, deviceId?: string) {
  const { data: existing } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (existing) {
    const updates: any = {};
    if (name && name !== existing.name) updates.name = name;
    if (email && email !== existing.email) updates.email = email;
    if (picture && picture !== existing.picture) updates.picture = picture;
    if (googleId && googleId !== existing.google_id) updates.google_id = googleId;
    if (deviceId && deviceId !== existing.device_id) updates.device_id = deviceId;
    if (Object.keys(updates).length > 0) {
      await supabase.from("users").update(updates).eq("id", userId);
    }
    return existing;
  }
  const referralCode = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "MEZ" + Math.floor(Math.random() * 9999);
  const { data, error: e } = await supabase.from("users").insert({
    id: userId, email, name, picture, google_id: googleId, device_id: deviceId,
    referral_code: referralCode, wallet: 0, is_admin: false,
  }).select("*").single();
  if (e) throw new Error(e.message);
  return data;
}

async function verifySupabaseToken(token: string) {
  const { data, error: e } = await supabase.auth.getUser(token);
  if (e || !data.user) return null;
  return data.user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/mezbaan-api/, "");
    const method = req.method;

    // ============================================================
    // AUTH ROUTES
    // ============================================================

    // POST /auth/google
    if (path === "/auth/google" && method === "POST") {
      const body = await req.json();
      const { google_id, email, name, picture, device_id } = body;
      if (!email) return error("Email required", 400);
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await upsertUser(user.id, email, name, picture, google_id, device_id);
      return json({ token: (req.headers.get("Authorization") || "").replace("Bearer ", ""), user: profile });
    }

    // POST /auth/email-password
    if (path === "/auth/email-password" && method === "POST") {
      const body = await req.json();
      const { supabase_token, email, name, device_id } = body;
      if (!supabase_token || !email) return error("Missing credentials", 400);
      const authUser = await verifySupabaseToken(supabase_token);
      if (!authUser) return error("Invalid token", 401);
      const profile = await upsertUser(authUser.id, email, name, undefined, undefined, device_id);
      return json({ token: supabase_token, user: profile });
    }

    // GET /auth/me
    if (path === "/auth/me" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile) return error("Profile not found", 404);
      return json(profile);
    }

    // PATCH /auth/update-mobile
    if (path === "/auth/update-mobile" && method === "PATCH") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { phone } = body;
      const { data, error: e } = await supabase.from("users").update({ phone }).eq("id", user.id).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    // POST /auth/address
    if (path === "/auth/address" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { label, line, is_default } = body;
      if (is_default) {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      }
      const { data, error: e } = await supabase.from("addresses").insert({
        user_id: user.id, label, line, is_default: !!is_default,
      }).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    // POST /auth/fcm-token
    if (path === "/auth/fcm-token" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { token } = body;
      if (!token) return error("Token required", 400);
      const { data: existing } = await supabase.from("fcm_tokens").select("*").eq("user_id", user.id).eq("token", token).maybeSingle();
      if (!existing) {
        await supabase.from("fcm_tokens").insert({ user_id: user.id, token });
      }
      return json({ success: true });
    }

    // ============================================================
    // MENU ROUTES
    // ============================================================

    // GET /menu
    if (path === "/menu" && method === "GET") {
      const { data, error: e } = await supabase.from("menu_items").select("*").order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    // GET /menu/:id
    if (path.match(/^\/menu\/[^\/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data, error: e } = await supabase.from("menu_items").select("*").eq("id", id).maybeSingle();
      if (e) return error(e.message, 500);
      if (!data) return error("Item not found", 404);
      return json(data);
    }

    // ============================================================
    // ORDER ROUTES
    // ============================================================

    // GET /orders
    if (path === "/orders" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const { data, error: e } = await supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    // POST /orders
    if (path === "/orders" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { items, address, total, payment_method, payment_status } = body;
      if (!items || !Array.isArray(items) || items.length === 0) return error("No items in order", 400);

      const orderNo = "MEZ-" + Date.now();
      const { data: order, error: oe } = await supabase.from("orders").insert({
        order_no: orderNo,
        user_id: user.id,
        user_name: body.user_name || "",
        user_phone: body.user_phone || "",
        address: address || "",
        total: total || 0,
        status: "received",
        payment_method: payment_method || "cod",
        payment_status: payment_status || "pending",
      }).select("*").single();
      if (oe) return error(oe.message, 500);

      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        item_id: item.item_id || null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));
      const { error: oie } = await supabase.from("order_items").insert(orderItems);
      if (oie) return error(oie.message, 500);

      const { data: fullOrder } = await supabase.from("orders").select("*, order_items(*)").eq("id", order.id).single();
      return json(fullOrder);
    }

    // GET /orders/:id
    if (path.match(/^\/orders\/[^\/]+$/) && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const id = path.split("/")[2];
      const { data, error: e } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).eq("user_id", user.id).maybeSingle();
      if (e) return error(e.message, 500);
      if (!data) return error("Order not found", 404);
      return json(data);
    }

    // ============================================================
    // COUPONS
    // ============================================================

    // GET /coupons
    if (path === "/coupons" && method === "GET") {
      const { data, error: e } = await supabase.from("coupons").select("*").eq("active", true).order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    // ============================================================
    // PAYMENTS (Razorpay config — returns key placeholder)
    // ============================================================

    // GET /payments/razorpay/config
    if (path === "/payments/razorpay/config" && method === "GET") {
      const key = Deno.env.get("RAZORPAY_KEY_ID") || "";
      return json({ key_id: key });
    }

    // POST /payments/razorpay/verify
    if (path === "/payments/razorpay/verify" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { razorpay_payment_id, razorpay_order_id, order_id } = body;
      const { data, error: e } = await supabase.from("orders").update({
        payment_status: "paid",
        razorpay_payment_id,
        razorpay_order_id,
      }).eq("id", order_id).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    // POST /payments/razorpay/cancel
    if (path === "/payments/razorpay/cancel" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { order_id } = body;
      const { data, error: e } = await supabase.from("orders").update({
        payment_status: "cancelled",
        status: "cancelled",
      }).eq("id", order_id).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    // ============================================================
    // ADMIN ROUTES
    // ============================================================

    // GET /admin/orders
    if (path === "/admin/orders" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const { data, error: e } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    // GET /admin/orders/pending
    if (path === "/admin/orders/pending" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const { data, error: e } = await supabase.from("orders").select("*, order_items(*)").eq("status", "received").order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    // PATCH /admin/orders/:id/status
    if (path.match(/^\/admin\/orders\/[^\/]+\/status$/) && method === "PATCH") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const id = path.split("/")[3];
      const body = await req.json();
      const { status } = body;
      const validStatuses = ["received", "preparing", "packed", "out_for_delivery", "delivered", "cancelled"];
      if (!validStatuses.includes(status)) return error("Invalid status", 400);
      const { data, error: e } = await supabase.from("orders").update({ status }).eq("id", id).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    // GET /admin/stats
    if (path === "/admin/stats" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);

      const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true });
      const { count: activeOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["received", "preparing", "packed", "out_for_delivery"]);
      const { count: totalCustomers } = await supabase.from("users").select("*", { count: "exact", head: true });

      const { data: revenueData } = await supabase.from("orders").select("total").neq("status", "cancelled");
      const revenue = (revenueData || []).reduce((sum: number, o: any) => sum + Number(o.total), 0);

      return json({
        total_orders: totalOrders || 0,
        active_orders: activeOrders || 0,
        total_customers: totalCustomers || 0,
        revenue,
      });
    }

    // PATCH /admin/menu/:id
    if (path.match(/^\/admin\/menu\/[^\/]+$/) && method === "PATCH") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const id = path.split("/")[3];
      const body = await req.json();
      const { in_stock } = body;
      const { data, error: e } = await supabase.from("menu_items").update({ in_stock }).eq("id", id).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    // GET /admin/coupons
    if (path === "/admin/coupons" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const { data, error: e } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    // PATCH /admin/coupons/:code
    if (path.match(/^\/admin\/coupons\/[^\/]+$/) && method === "PATCH") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const code = decodeURIComponent(path.split("/")[3]);
      const body = await req.json();
      const { data, error: e } = await supabase.from("coupons").update(body).eq("code", code).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    // ============================================================
    // 404
    // ============================================================
    return error("Not found", 404);

  } catch (err) {
    return error(err.message || "Internal server error", 500);
  }
});
