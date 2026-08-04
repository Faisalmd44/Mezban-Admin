import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { AppContext, AppUser, loadToken } from "@/src/store";
import { api } from "@/src/api";
import { supabase } from "@/src/lib/supabase";
import {
  initAdminNotifications,
  subscribePending,
  cleanupAdminNotifications,
  setOrderNavigator,
  setActionHandler,
  handleOrderResolved,
} from "@/src/services/AdminNotificationService";

SplashScreen.preventAutoHideAsync().catch(() => {});

const BOOT_TIMEOUT = 100;

export default function RootLayout() {
  useFrameworkReady();
  // Restore saved login session on app start
  useEffect(() => {
    (async () => {
      try {
        const token = await loadToken();
        if (token) {
          const userData = await api.me();
          if (userData) setUser(userData);
        }
      } catch (e) {
        console.log("Session restore failed", e);
      }
    })();
  }, []);

  const [loaded, error] = useIconFonts();
  const [bootDone, setBootDone] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const router = useRouter();
  const segments = useSegments();

  // 1. Initial Boot Timer Setup
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setBootDone(true);
    }, BOOT_TIMEOUT);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // 2. Auth state navigation guard
  useEffect(() => {
    if (!bootDone) return;
    const seg = segments as readonly string[];
    const inAuth = seg[0] === "(auth)";
    const onReset = seg[1] === "reset-password";
    if (!user && !inAuth) router.replace("/(auth)/login");
    else if (user && inAuth && !onReset) router.replace("/(tabs)");
  }, [bootDone, user, segments, router]);

  // 3. Supabase Auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.log("Supabase auth event:", event);
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/(auth)/reset-password");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

// Admin Order Notifications setup (Starts real-time polling & sound alerts)

useEffect(() => {
  if (user?.is_admin) {

  initAdminNotifications();

  const unsubscribe = subscribePending((count, orders) => {

  console.log(`[Admin Alerts] Active pending orders: ${count}`);
    });

    setOrderNavigator((orderId: string) => {
      router.push(`/order/${orderId}`);
    });

    setActionHandler(async (orderId: string, accept: boolean) => {
      const newStatus = accept ? "preparing" : "cancelled";
      await api.adminUpdateStatus(orderId, newStatus);
      await handleOrderResolved(orderId);
    });

    return () => {
      unsubscribe();
      cleanupAdminNotifications();
    };
  }
}, [user?.is_admin, router]);

  const refreshUser = useCallback(async () => { 
    try { 
      setUser(await api.me()); 
    } catch {} 
  }, []);

  const ready = bootDone && (loaded || Boolean(error) || true);

  useEffect(() => { 
    if (ready) SplashScreen.hideAsync().catch(() => {}); 
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContext.Provider value={{ 
          user, 
          setUser, 
          cart, 
          addToCart: () => {}, 
          updateQty: () => {}, 
          clearCart: () => {}, 
          wishlist: [], 
          toggleWishlist: async () => {}, 
          refreshUser, 
          recentlyViewed: [], 
          pushRecentlyViewed: () => {} 
        }}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0A0A" } }} />
        </AppContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

