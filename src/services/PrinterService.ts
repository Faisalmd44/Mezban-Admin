/**
 * PrinterService — ESC/POS Bluetooth thermal printer integration.
 * Supports 58mm and 80mm BLE printers. Handles pairing, KOT/bill
 * formatting, auto-print on new orders, and retry on failure.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export type PairedPrinter = {
  device_name: string;
  inner_mac_address: string;
  width_mm: 58 | 80;
};

export type PrintOrderData = {
  id: string;
  order_no: string;
  user_name: string;
  user_phone: string;
  address: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  order_items?: any[];
  items?: any[];
};

export type PrintType = "kot" | "bill";

const PRINTER_KEY = "mez_paired_printer";
const AUTO_PRINT_KEY = "mez_auto_print";
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

let blePrinter: any = null;
let connected: PairedPrinter | null = null;

async function getBLEPrinter() {
  if (blePrinter) return blePrinter;
  try {
    if (Platform.OS === "android") {
      const mod: any = await import("react-native-thermal-receipt-printer-image-qr");
      blePrinter = mod.BLEPrinter;
      await blePrinter.init();
    }
  } catch {}
  return blePrinter;
}

export async function getPairedPrinter(): Promise<PairedPrinter | null> {
  const raw = await AsyncStorage.getItem(PRINTER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function savePairedPrinter(printer: PairedPrinter | null) {
  if (printer) await AsyncStorage.setItem(PRINTER_KEY, JSON.stringify(printer));
  else await AsyncStorage.removeItem(PRINTER_KEY);
}

export async function isAutoPrintEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(AUTO_PRINT_KEY);
  return val === "true";
}

export async function setAutoPrintEnabled(enabled: boolean) {
  await AsyncStorage.setItem(AUTO_PRINT_KEY, enabled ? "true" : "false");
}

export async function scanBLEPrinters(): Promise<PairedPrinter[]> {
  const printer = await getBLEPrinter();
  if (!printer) return [];
  const devices = await printer.getDeviceList();
  return devices.map((d: any) => ({
    device_name: d.device_name,
    inner_mac_address: d.inner_mac_address,
    width_mm: 80 as const,
  }));
}

export async function connectPrinter(printer: PairedPrinter): Promise<boolean> {
  const p = await getBLEPrinter();
  if (!p) return false;
  try {
    await p.connectPrinter(printer.inner_mac_address);
    connected = printer;
    await savePairedPrinter(printer);
    return true;
  } catch {
    return false;
  }
}

export async function disconnectPrinter() {
  const p = await getBLEPrinter();
  if (p) { try { await p.closeConn(); } catch {} }
  connected = null;
  await savePairedPrinter(null);
}

export async function isPrinterConnected(): Promise<boolean> {
  if (connected) return true;
  const paired = await getPairedPrinter();
  if (!paired) return false;
  return await connectPrinter(paired);
}

function pad(text: string, width: number, align: "left" | "center" | "right" = "left"): string {
  const str = String(text || "");
  const len = [...str].length;
  if (len >= width) return str.slice(0, width);
  const spaces = width - len;
  if (align === "center") {
    const left = Math.floor(spaces / 2);
    const right = spaces - left;
    return " ".repeat(left) + str + " ".repeat(right);
  }
  if (align === "right") return " ".repeat(spaces) + str;
  return str + " ".repeat(spaces);
}

function dashedLine(width: number): string {
  return "-".repeat(width);
}

function doubleLine(width: number): string {
  return "=".repeat(width);
}

function getItems(order: PrintOrderData): any[] {
  return order.order_items || order.items || [];
}

function buildKOT(order: PrintOrderData, width: 58 | 80): string {
  const chars = width === 58 ? 30 : 46;
  const lines: string[] = [];

  lines.push(pad("MEZBAAN RESTRO", chars, "center"));
  lines.push(pad("KITCHEN ORDER TICKET", chars, "center"));
  lines.push(dashedLine(chars));
  lines.push(pad(`Order: ${order.order_no}`, chars));
  lines.push(pad(`Date: ${new Date(order.created_at).toLocaleString()}`, chars));
  lines.push(dashedLine(chars));

  if (order.user_name) lines.push(pad(`Customer: ${order.user_name}`, chars));
  if (order.user_phone) lines.push(pad(`Phone: ${order.user_phone}`, chars));
  if (order.address) {
    const addr = order.address.length > chars ? order.address.slice(0, chars) : order.address;
    lines.push(pad(`Addr: ${addr}`, chars));
  }
  lines.push(dashedLine(chars));

  lines.push(pad("Item", Math.floor(chars * 0.65)) + pad("Qty", chars - Math.floor(chars * 0.65), "right"));
  lines.push(dashedLine(chars));

  const items = getItems(order);
  items.forEach((item: any) => {
    const name = String(item.name || "").slice(0, Math.floor(chars * 0.65));
    const qty = `${item.quantity}x`;
    lines.push(pad(name, Math.floor(chars * 0.65)) + pad(qty, chars - Math.floor(chars * 0.65), "right"));
  });

  lines.push(dashedLine(chars));
  if (order.notes) {
    lines.push(pad("Notes:", chars));
    const noteText = String(order.notes).slice(0, chars * 3);
    for (let i = 0; i < noteText.length; i += chars) {
      lines.push(noteText.slice(i, i + chars));
    }
  }
  lines.push("");
  lines.push(pad(`Printed: ${new Date().toLocaleTimeString()}`, chars, "center"));
  lines.push("\n\n");

  return lines.join("\n");
}

function buildBill(order: PrintOrderData, width: 58 | 80): string {
  const chars = width === 58 ? 30 : 46;
  const lines: string[] = [];

  lines.push(pad("MEZBAAN RESTRO", chars, "center"));
  lines.push(pad("Customer Bill", chars, "center"));
  lines.push(doubleLine(chars));
  lines.push(pad(`Bill: ${order.order_no}`, chars));
  lines.push(pad(`Date: ${new Date(order.created_at).toLocaleString()}`, chars));
  lines.push(dashedLine(chars));

  if (order.user_name) lines.push(pad(`Customer: ${order.user_name}`, chars));
  if (order.user_phone) lines.push(pad(`Phone: ${order.user_phone}`, chars));
  lines.push(dashedLine(chars));

  const nameWidth = Math.floor(chars * 0.45);
  const qtyWidth = Math.floor(chars * 0.15);
  const priceWidth = chars - nameWidth - qtyWidth;

  lines.push(
    pad("Item", nameWidth) +
    pad("Qty", qtyWidth, "center") +
    pad("Amount", priceWidth, "right")
  );
  lines.push(dashedLine(chars));

  const items = getItems(order);
  items.forEach((item: any) => {
    const name = String(item.name || "").slice(0, nameWidth);
    const qty = `${item.quantity}x`;
    const amount = (Number(item.price) * Number(item.quantity)).toFixed(0);
    lines.push(
      pad(name, nameWidth) +
      pad(qty, qtyWidth, "center") +
      pad(`Rs.${amount}`, priceWidth, "right")
    );
  });

  lines.push(dashedLine(chars));
  lines.push(pad("Subtotal:", chars - 12) + pad(`Rs.${order.total.toFixed(0)}`, 12, "right"));
  lines.push(doubleLine(chars));

  const payMethod = (order.payment_method || "cod").toUpperCase();
  const payStatus = (order.payment_status || "pending").toUpperCase();
  lines.push(pad(`Payment: ${payMethod} (${payStatus})`, chars));

  if (order.notes) {
    lines.push(dashedLine(chars));
    lines.push(pad("Notes:", chars));
    const noteText = String(order.notes).slice(0, chars * 3);
    for (let i = 0; i < noteText.length; i += chars) {
      lines.push(noteText.slice(i, i + chars));
    }
  }

  lines.push("");
  lines.push(pad("Thank You!", chars, "center"));
  lines.push(pad("Visit Again", chars, "center"));
  lines.push("\n\n");

  return lines.join("\n");
}

async function printRaw(text: string, width: 58 | 80): Promise<void> {
  const p = await getBLEPrinter();
  if (!p) throw new Error("Printer not available");

  const { PrinterWidth } = await import("react-native-thermal-receipt-printer-image-qr");
  const printerWidthType = width === 58 ? PrinterWidth["58mm"] : PrinterWidth["80mm"];

  p.printBill(text, {
    beep: true,
    cut: true,
    tailingLine: true,
    printerWidthType,
  } as any);
}

export async function printOrder(
  order: PrintOrderData,
  type: PrintType = "kot"
): Promise<boolean> {
  const paired = await getPairedPrinter();
  if (!paired) return false;

  const connected = await isPrinterConnected();
  if (!connected) return false;

  const text = type === "kot" ? buildKOT(order, paired.width_mm) : buildBill(order, paired.width_mm);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await printRaw(text, paired.width_mm);
      return true;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        try { await connectPrinter(paired); } catch {}
      }
    }
  }
  return false;
}

export async function autoPrintNewOrder(order: PrintOrderData): Promise<void> {
  const enabled = await isAutoPrintEnabled();
  if (!enabled) return;
  try {
    await printOrder(order, "kot");
    await printOrder(order, "bill");
  } catch {}
}
