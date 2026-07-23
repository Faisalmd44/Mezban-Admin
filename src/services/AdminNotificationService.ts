/**
 * AdminNotificationService — Manages real-time order notifications for the
 * admin app. Uses FCM push notifications + background polling as fallback.
 * Plays a looping alarm sound when new pending orders arrive.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { api } from "@/src/api";

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

type PendingListener = (count: number, orders: OrderSummary[]) => void;

let polling = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let pendingOrders: OrderSummary[] = [];
const listeners = new Set<PendingListener>();
let orderNavigator: ((orderId: string) => void) | null = null;
let actionHandler: ((orderId: string, accept: boolean) => Promise<void>) | null = null;
let fcmToken: string | null = null;

const PENDING_KEY = "mez_admin_pending";
const POLL_INTERVAL = 12000;
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

async function getFCMToken(): Promise<string | null> {
  if (fcmToken) return fcmToken;
  try {
    if (Platform.OS === "android") {
      const messaging: any = (await import("@react-native-firebase/messaging")).default;
      const token = await messaging.getToken();
      fcmToken = token;
      await api.registerFCMToken(token);
    }
  } catch {}
  return fcmToken;
}

async function pollPendingOrders() {
  try {
    const orders = await api.adminPendingOrders();
    const newIds = new Set(orders.map((o: any) => o.id));
    const oldIds = new Set(pendingOrders.map((o) => o.id));
    const hasNew = orders.some((o: any) => !oldIds.has(o.id));
    pendingOrders = orders;
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(orders));
    if (hasNew) {
      await playAlarm();
      scheduleReminders(orders);
    }
    notifyListeners();
  } catch {}
}

async function playAlarm() {
  try {
    if (Platform.OS === "android") {
      const notifee: any = (await import("@notifee/react-native")).default;
      const channelId = await notifee.createChannel({
        id: "new-order-alarm",
        name: "New Order Alarm",
        sound: "alarm",
        vibration: true,
        vibrationPattern: [300, 500],
        importance: notifee.AndroidImportance.HIGH,
      });
      await notifee.displayNotification({
        title: "New Order Received!",
        body: "A new order is pending. Accept or reject now.",
        android: {
          channelId,
          sound: "alarm",
          loopSound: true,
          smallIcon: "ic_launcher",
          pressAction: { id: "default" },
          actions: [
            { title: "Accept", pressAction: { id: "accept" } },
            { title: "Reject", pressAction: { id: "reject" } },
          ],
        },
      });
    }
  } catch {}
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
  await getFCMToken();
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
  reminderTimeouts.forEach(clearTimeout);
  reminderTimeouts = [];
  listeners.clear();
}
