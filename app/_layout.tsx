import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { AppContext, AppUser, loadCart, saveCart, loadToken, clearToken } from "@/src/store";
import { api } from "@/src/api";
import {
  initAdminNotifications,
  cleanupAdminNotifications,
  setOrderNavigator,
  setActionHandler,
  handleOrderResolved,
} from "@/src/services/AdminNotificationService";

SplashScreen.preventAutoHideAsync().catch(() => {});

const BOOT_TIMEOUT = 4000;

export default function RootLayout() {
  useFrameworkReady();
  const [loaded, error] = useIconFonts();
  const [bootDone, setBootDone] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let cancelled = false;
    const boot = (async () => {
      try {
        const token = await loadToken();
        if (token) {
  try {
    const me = await api.me();
    if (!cancelled) {
      setUser(me);
    }
  } catch (e) {
    console.log("Auto login failed:", e);
    // Token clear mat karo
  }
}
        }
        if (!cancelled) setCart(await loadCart());
      } finally { if (!cancelled) setBootDone(true); }
    })();
    const timer = setTimeout(() => { if (!cancelled) setBootDone(true); }, BOOT_TIMEOUT);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!bootDone) return;
    const seg = segments as readonly string[];
    const inAuth = seg[0] === "(auth)";
    const onReset = seg[1] === "reset-password";
    if (!user && !inAuth) router.replace("/(auth)/login");
    else if (user && inAuth && !onReset) router.replace("/(tabs)");
  }, [bootDone, user, segments, router]);

  useEffect(() => { saveCart(cart); }, [cart]);

  useEffect(() => {
    if (user?.is_admin) {
      setOrderNavigator((orderId: string) => { router.push(`/order/${orderId}`); });
      setActionHandler(async (orderId: string, accept: boolean) => {
        const newStatus = accept ? "preparing" : "cancelled";
        await api.adminUpdateStatus(orderId, newStatus);
        await handleOrderResolved(orderId);
      });
      initAdminNotifications().catch(() => {});
    }
    return () => { if (user?.is_admin) cleanupAdminNotifications(); };
  }, [user?.is_admin]);

  const refreshUser = useCallback(async () => { try { setUser(await api.me()); } catch {} }, []);
  const ready = bootDone && (loaded || error);

  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContext.Provider value={{ user, setUser, cart, addToCart: () => {}, updateQty: () => {}, clearCart: () => {}, wishlist: [], toggleWishlist: async () => {}, refreshUser, recentlyViewed: [], pushRecentlyViewed: () => {} }}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0A0A" } }} />
        </AppContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
