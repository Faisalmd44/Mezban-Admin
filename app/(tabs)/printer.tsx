import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { PermissionsAndroid } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import {
  scanBLEPrinters,
  connectPrinter,
  disconnectPrinter,
  getPairedPrinter,
  isPrinterConnected,
  isAutoPrintEnabled,
  setAutoPrintEnabled,
  type PairedPrinter,
} from "@/src/services/PrinterService";

export default function PrinterScreen() {
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<PairedPrinter[]>([]);
  const [paired, setPaired] = useState<PairedPrinter | null>(null);
  const [connected, setConnected] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [width58, setWidth58] = useState(true);
  const requestBluetoothPermissions = async () => {
  if (Platform.OS !== "android") return true;

  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
};

  const load = useCallback(async () => {
  const granted = await requestBluetoothPermissions();
  if (!granted) {
    Alert.alert(
      "Permission Required",
      "Bluetooth permissions are required to scan printers."
    );
    return;
  }

  setScanning(true);
    try {
      const p = await getPairedPrinter();
      setPaired(p);
      if (p) {
        setWidth58(p.width_mm === 58);
        setConnected(await isPrinterConnected());
      } else {
        setConnected(false);
      }
      const auto = await isAutoPrintEnabled();
      setAutoPrint(auto);
      const devs = await scanBLEPrinters();
      setDevices(devs);
    } catch {}
    finally { setScanning(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePair = async (device: PairedPrinter) => {
    setConnecting(device.inner_mac_address);
    const printer: PairedPrinter = { ...device, width_mm: width58 ? 58 : 80 };
    const ok = await connectPrinter(printer);
    if (ok) {
      setPaired(printer);
      setConnected(true);
      Alert.alert("Success", `Paired with ${printer.device_name}`);
    } else {
      Alert.alert("Error", "Failed to connect. Make sure the printer is on and in range.");
    }
    setConnecting(null);
  };

  const handleDisconnect = async () => {
    Alert.alert("Disconnect Printer", "Remove paired printer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          await disconnectPrinter();
          setPaired(null);
          setConnected(false);
        },
      },
    ]);
  };

  const handleTestPrint = async () => {
    if (!paired) return;
    const { printOrder } = await import("@/src/services/PrinterService");
    const testOrder = {
      id: "test",
      order_no: "TEST-001",
      user_name: "Test Customer",
      user_phone: "9999999999",
      address: "Test Address",
      total: 0,
      status: "received",
      payment_method: "cod",
      payment_status: "pending",
      created_at: new Date().toISOString(),
      order_items: [
        { name: "Test Item 1", quantity: 2, price: 100 },
        { name: "Test Item 2", quantity: 1, price: 50 },
      ],
    };
    const ok = await printOrder(testOrder as any, "kot");
    Alert.alert(ok ? "Printed" : "Failed", ok ? "Test print sent successfully." : "Could not print. Check printer connection.");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[COLORS.black, COLORS.brandDark]} style={styles.header}>
        <View>
          <Text style={styles.title}>Printer</Text>
          <Text style={styles.sub}>Bluetooth Thermal Printer</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: connected ? "rgba(61,214,140,0.2)" : "rgba(255,90,95,0.2)" }]}>
          <Ionicons name={connected ? "checkmark-circle" : "close-circle"} size={14} color={connected ? COLORS.success : COLORS.error} />
          <Text style={[styles.statusText, { color: connected ? COLORS.success : COLORS.error }]}>{connected ? "Connected" : "Offline"}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.gold} colors={[COLORS.gold]} />}
      >
        {paired && (
          <View style={styles.pairedCard}>
            <View style={styles.pairedInfo}>
              <Ionicons name="printer" size={28} color={COLORS.gold} />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.pairedName}>{paired.device_name}</Text>
                <Text style={styles.pairedMac}>{paired.inner_mac_address}</Text>
                <Text style={styles.pairedWidth}>{paired.width_mm}mm paper</Text>
              </View>
            </View>
            <View style={styles.pairedActions}>
              <Pressable style={styles.testBtn} onPress={handleTestPrint}>
                <Ionicons name="document-text" size={16} color={COLORS.black} />
                <Text style={styles.testBtnTxt}>Test</Text>
              </Pressable>
              <Pressable style={styles.disconnectBtn} onPress={handleDisconnect}>
                <Ionicons name="trash" size={16} color={COLORS.error} />
                <Text style={styles.disconnectTxt}>Remove</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="sync-circle" size={20} color={COLORS.gold} />
              <Text style={styles.settingLabel}>Auto-print new orders</Text>
            </View>
            <Switch
              value={autoPrint}
              onValueChange={async (v) => { setAutoPrint(v); await setAutoPrintEnabled(v); }}
              trackColor={{ true: COLORS.gold, false: COLORS.border }}
              thumbColor={COLORS.white}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="resize" size={20} color={COLORS.gold} />
              <Text style={styles.settingLabel}>Paper width</Text>
            </View>
            <View style={styles.widthToggle}>
              <Pressable
                onPress={() => setWidth58(true)}
                style={[styles.widthBtn, width58 && styles.widthBtnActive]}
              >
                <Text style={[styles.widthBtnTxt, width58 && { color: COLORS.black }]}>58mm</Text>
              </Pressable>
              <Pressable
                onPress={() => setWidth58(false)}
                style={[styles.widthBtn, !width58 && styles.widthBtnActive]}
              >
                <Text style={[styles.widthBtnTxt, !width58 && { color: COLORS.black }]}>80mm</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {!connected && !scanning && !paired && (
          <View style={styles.noPrinterBox}>
            <Ionicons name="printer-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.noPrinterTxt}>No printer connected</Text>
            <Text style={styles.noPrinterSub}>Pair a Bluetooth thermal printer to enable auto-printing</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Available Printers</Text>

        {scanning ? (
          <View style={styles.scanningBox}>
            <ActivityIndicator color={COLORS.gold} />
            <Text style={styles.scanningTxt}>Scanning for Bluetooth printers...</Text>
          </View>
        ) : devices.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="bluetooth" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTxt}>No printers found</Text>
            <Text style={styles.emptySub}>Make sure your printer is turned on and in pairing mode</Text>
            <Pressable style={styles.rescanBtn} onPress={load}>
              <Ionicons name="refresh" size={18} color={COLORS.gold} />
              <Text style={styles.rescanTxt}>Scan Again</Text>
            </Pressable>
          </View>
        ) : (
          devices.map((device) => (
            <Pressable
              key={device.inner_mac_address}
              style={styles.deviceCard}
              onPress={() => handlePair(device)}
              disabled={!!connecting}
            >
              <View style={styles.deviceInfo}>
                <Ionicons name="printer-outline" size={24} color={COLORS.gold} />
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.deviceName}>{device.device_name || "Unknown"}</Text>
                  <Text style={styles.deviceMac}>{device.inner_mac_address}</Text>
                </View>
                {connecting === device.inner_mac_address ? (
                  <ActivityIndicator color={COLORS.gold} />
                ) : paired?.inner_mac_address === device.inner_mac_address ? (
                  <View style={styles.pairedBadge}>
                    <Ionicons name="checkmark" size={14} color={COLORS.success} />
                    <Text style={styles.pairedBadgeTxt}>Paired</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: 12 },
  title: { fontWeight: "900", fontSize: 20, color: COLORS.white },
  sub: { color: COLORS.gold, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill },
  statusText: { fontWeight: "800", fontSize: 11 },
  pairedCard: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginTop: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.gold, ...SHADOW.card },
  pairedInfo: { flexDirection: "row", alignItems: "center" },
  pairedName: { fontWeight: "800", color: COLORS.white, fontSize: 15 },
  pairedMac: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  pairedWidth: { color: COLORS.gold, fontSize: 11, fontWeight: "700", marginTop: 2 },
  pairedActions: { flexDirection: "row", gap: 8, marginTop: SPACING.md },
  testBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.gold, paddingVertical: 10, borderRadius: RADIUS.md },
  testBtnTxt: { color: COLORS.black, fontWeight: "800", fontSize: 13 },
  disconnectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,90,95,0.15)", borderWidth: 1, borderColor: COLORS.error, paddingVertical: 10, borderRadius: RADIUS.md },
  disconnectTxt: { color: COLORS.error, fontWeight: "800", fontSize: 13 },
  settingsCard: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginTop: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  settingInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingLabel: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  widthToggle: { flexDirection: "row", backgroundColor: COLORS.surfaceTint, borderRadius: RADIUS.sm, overflow: "hidden" },
  widthBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  widthBtnActive: { backgroundColor: COLORS.gold },
  widthBtnTxt: { color: COLORS.white, fontWeight: "700", fontSize: 12 },
  noPrinterBox: { alignItems: "center", paddingVertical: 30, gap: 8, marginHorizontal: SPACING.lg, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginTop: SPACING.md },
  noPrinterTxt: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  noPrinterSub: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", paddingHorizontal: SPACING.xl },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm, color: COLORS.white },
  scanningBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  scanningTxt: { color: COLORS.textSecondary, fontSize: 14 },
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTxt: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  emptySub: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", paddingHorizontal: SPACING.xl },
  rescanBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: SPACING.md, backgroundColor: COLORS.charcoal, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.gold },
  rescanTxt: { color: COLORS.gold, fontWeight: "700", fontSize: 13 },
  deviceCard: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  deviceInfo: { flexDirection: "row", alignItems: "center" },
  deviceName: { fontWeight: "700", color: COLORS.white, fontSize: 14 },
  deviceMac: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  pairedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(61,214,140,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  pairedBadgeTxt: { color: COLORS.success, fontWeight: "800", fontSize: 11 },
});
