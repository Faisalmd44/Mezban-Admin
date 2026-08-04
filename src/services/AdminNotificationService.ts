/**
 * AdminNotificationService – Manages real-time order notifications for
 * admin app. Uses FCM push notifications + background polling.
 * Plays a looping alarm sound when new pending orders arrive.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, PermissionsAndroid } from "react-native";
import { api } from "../api";
import { supabase } from "../lib/supabase";
import { autoPrintNewOrder } from "./PrinterService";
import { Audio } from 'expo-av';

export type OrderSummary = {
  id: string;
  order_no: string;
  user_name: string;
  user_phone: string;
  total: number;
  items: any[];
  status: string;
  created_at: string;
};

export type PrintOrderData = {
  id: string;
  order_no?: string;
  user_name?: string;
  customer_name?: string;
  user_phone?: string;
  phone?: string;
  total?: number;
  total_amount?: number;
  items?: any[];
  order_items?: any[];
  status?: string;
  created_at?: string;
};

type PendingListener = (count: number, orders: OrderSummary[]) => void;

let polling = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let pendingOrders: OrderSummary[] = [];
const listeners = new Set<PendingListener>();
let orderNavigator: ((orderId: string) => void) | null = null;
let actionHandler: ((orderId: string, accept: boolean) => Promise<void>) | null = null;
let fcmToken: string | null = null;

const PENDING_KEY = "mez_admin_pending";
const POLL_INTERVAL = 10000;
const REMINDER_1 = 30000;
const REMINDER_2 = 60000;

function notifyListeners() {
  listeners.forEach((fn) => fn(pendingOrders.length, pendingOrders));
}

export function subscribePending(fn: PendingListener): () => void {
  listeners.add(fn);
  fn(pendingOrders.length, pendingOrders);
  return () => { listeners.delete(fn); };
}

export function setOrderNavigator(fn: (orderId: string) => void) {
  orderNavigator = fn;
}

export function setActionHandler(fn: (orderId: string, accept: boolean) => Promise<void>) {
  actionHandler = fn;
}

async function requestPermissions() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch (e) {
      console.log('Notification permission error:', e);
    }
  }
}

async function getFCMToken(): Promise<string | null> {
  if (fcmToken) return fcmToken;

  try {
    if (Platform.OS === "android") {
      const messaging = (await import("@react-native-firebase/messaging")).default;
      await messaging().requestPermission();
      const token = await messaging().getToken();
      console.log("FCM TOKEN =", token);
      fcmToken = token;
      await api.registerFCMToken(token);
      console.log("FCM TOKEN SAVED");

      // Handle FCM messages received in Foreground
      messaging().onMessage(async (remoteMessage) => {
        console.log("FCM Incoming Message:", remoteMessage);
        await playAlarm();
        pollPendingOrders();
      });
    }
  } catch (e) {
    console.log("FCM ERROR =", e);
  }

  return fcmToken;
}

let realtimeChannel: any = null;

function setupRealtime() {
  if (realtimeChannel) return;
  try {
    realtimeChannel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("Realtime order change detected:", payload);
          pollPendingOrders();
        }
      )
      .subscribe();
  } catch (err) {
    console.log("Realtime subscription setup error:", err);
  }
}

async function pollPendingOrders() {
  try {
    // Direct Supabase query to catch both 'received' and 'pending' orders
    const { data: rawOrders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['received', 'pending'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    const orders = Array.isArray(rawOrders) ? rawOrders : [];

    const oldIds = new Set(pendingOrders.map((o) => String(o.id)));
    const newOrders = orders.filter((o: any) => !oldIds.has(String(o.id)));

    pendingOrders = orders.map((o: any) => {
      let rawItems = [];
      if (Array.isArray(o.order_items) && o.order_items.length > 0) rawItems = o.order_items;
      else if (Array.isArray(o.items) && o.items.length > 0) rawItems = o.items;
      else if (typeof o.items === "string") { try { rawItems = JSON.parse(o.items); } catch {} }
      else if (typeof o.order_items === "string") { try { rawItems = JSON.parse(o.order_items); } catch {} }

      return {
        id: String(o.id),
        order_no: String(o.order_no || o.id),
        user_name: o.user_name || o.customer_name || "Customer",
        user_phone: o.user_phone || o.phone || "N/A",
        total: Number(o.total || o.total_amount || 0),
        items: rawItems,
        status: o.status || "received",
        created_at: o.created_at || new Date().toISOString(),
      };
    });

    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pendingOrders));

    if (newOrders.length > 0) {
      await playAlarm(); // Trigger Ringtone
      for (const order of newOrders) {
        autoPrintNewOrder(order as PrintOrderData).catch(() => {});
      }
    } else if (pendingOrders.length === 0) {
      await stopAlarm();
    }

    notifyListeners();
  } catch (e) {
    console.log("Polling error:", e);
  }
}

let alarmSound: Audio.Sound | null = null;

async function playAlarm() {
  try {
    if (alarmSound) {
      await alarmSound.unloadAsync();
    }

    // High volume audio setup for Android & iOS
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
      { shouldPlay: true, isLooping: true, volume: 1.0 }
    );

    alarmSound = sound;

    if (Platform.OS === "android") {
      try {
        const notifee = (await import("@notifee/react-native")).default;
        
        // Create Required Notification Channel for Android
        const channelId = await notifee.createChannel({
          id: 'alarm_channel',
          name: 'Order Alarm Alerts',
          importance: 4, // HIGH
          sound: 'default',
        });

        await notifee.displayNotification({
          title: "🚨 NEW ORDER RECEIVED!",
          body: "A new order is pending. Tap to open dashboard.",
          android: {
            channelId,
            smallIcon: "ic_launcher",
            pressAction: { id: "default" },
            actions: [
              { title: "Accept", pressAction: { id: "accept" } },
              { title: "Reject", pressAction: { id: "reject" } },
            ],
          },
        });
      } catch (err) {
        console.log("Notifee Error:", err);
      }
    }
  } catch (error) {
    console.error("Error playing alarm sound:", error);
  }
}

export async function stopAlarm() {
  try {
    if (alarmSound) {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
      alarmSound = null;
    }
  } catch (error) {
    console.error("Error stopping alarm sound:", error);
  }
}

let reminderTimeouts: ReturnType<typeof setTimeout>[] = [];

function scheduleReminders(orders: OrderSummary[]) {
  reminderTimeouts.forEach(clearTimeout);
  reminderTimeouts = [];
  if (orders.length === 0) return;
  reminderTimeouts.push(setTimeout(() => { playAlarm(); }, REMINDER_1));
  reminderTimeouts.push(setTimeout(() => { playAlarm(); }, REMINDER_2));
}

export async function stopAlert(orderId?: string) {
  if (orderId) {
    pendingOrders = pendingOrders.filter((o) => o.id !== orderId);
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pendingOrders));
  } else {
    pendingOrders = [];
    await AsyncStorage.removeItem(PENDING_KEY);
  }

  reminderTimeouts.forEach(clearTimeout);
  reminderTimeouts = [];
  await stopAlarm();

  try {
    if (Platform.OS === "android") {
      const notifee: any = (await import("@notifee/react-native")).default;
      await notifee.cancelAllNotifications();
    }
  } catch {}
  notifyListeners();
}

export async function handleOrderResolved(orderId: string) {
  await stopAlert(orderId);
}

export async function initAdminNotifications() {
  if (polling) return;
  polling = true;
  await requestPermissions();
  await getFCMToken();
  setupRealtime();
  
  const stored = await AsyncStorage.getItem(PENDING_KEY);
  if (stored) {
    try { pendingOrders = JSON.parse(stored); notifyListeners(); } catch {}
  }
  await pollPendingOrders();
  pollInterval = setInterval(pollPendingOrders, POLL_INTERVAL);
}

export function cleanupAdminNotifications() {
  polling = false;
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  if (realtimeChannel) {
    try { supabase.removeChannel(realtimeChannel); } catch {}
    realtimeChannel = null;
  }
  reminderTimeouts.forEach(clearTimeout);
  reminderTimeouts = [];
  listeners.clear();
  stopAlarm();
}

