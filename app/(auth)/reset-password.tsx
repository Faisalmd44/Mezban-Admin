import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Pressable, TextInput, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { supabase } from "@/src/lib/supabase";

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const onUpdatePassword = async () => {
    setError("");
    if (!newPassword) { setError("Please enter a new password"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const { error: sbError } = await supabase.auth.updateUser({ password: newPassword });
      if (sbError) { setError(sbError.message); return; }
      Alert.alert("Password Updated", "Your password has been reset successfully. Please sign in with your new password.");
      router.replace("/(auth)/login");
    } catch (e: any) { setError(e?.message || "Failed to update password"); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.root}>
      <Image source="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200" style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      <LinearGradient colors={["rgba(10,10,10,0.6)", "rgba(10,10,10,0.88)", COLORS.black]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kb}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.heroWrap}>
            <View style={styles.logoRing}><Text style={styles.logoMonogram}>A</Text></View>
            <Text style={styles.brand}>MEZBAAN</Text>
            <Text style={styles.brandSub}>RESET PASSWORD</Text>
          </View>

          <View style={styles.card}>
            {!recoveryReady ? (
              <>
                <Text style={styles.cardTitle}>Check Your Email</Text>
                <Text style={styles.cardSub}>We sent you a password reset link. Tap the link in the email to open this page and set a new password.</Text>
                <Pressable testID="reset-back-btn" onPress={() => router.replace("/(auth)/login")} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
                  <Text style={styles.ctaText}>Back to Login</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Set New Password</Text>
                <Text style={styles.cardSub}>Enter a new password for your account</Text>

                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={{ marginHorizontal: SPACING.sm }} />
                  <TextInput testID="reset-new-password-input" placeholder="New password" placeholderTextColor={COLORS.textMuted} secureTextEntry autoCapitalize="none" value={newPassword} onChangeText={setNewPassword} style={styles.input} />
                </View>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={{ marginHorizontal: SPACING.sm }} />
                  <TextInput testID="reset-confirm-password-input" placeholder="Confirm new password" placeholderTextColor={COLORS.textMuted} secureTextEntry autoCapitalize="none" value={confirmPassword} onChangeText={setConfirmPassword} style={styles.input} />
                </View>

                {error ? <Text testID="reset-error" style={styles.error}>{error}</Text> : null}

                <Pressable testID="reset-update-btn" onPress={onUpdatePassword} disabled={loading} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
                  {loading ? <ActivityIndicator color={COLORS.black} /> : (
                    <>
                      <Text style={styles.ctaText}>Update Password</Text>
                      <Ionicons name="arrow-forward" size={20} color={COLORS.black} />
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  kb: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: SPACING.xxl },
  heroWrap: { alignItems: "center", marginBottom: SPACING.xxl },
  logoRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: COLORS.gold, alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg, ...SHADOW.gold },
  logoMonogram: { fontSize: 40, fontWeight: "900", color: COLORS.gold },
  brand: { fontSize: 52, fontWeight: "900", color: COLORS.white, letterSpacing: 6 },
  brandSub: { fontSize: 18, fontWeight: "700", color: COLORS.gold, letterSpacing: 10, marginTop: -6 },
  card: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.strong },
  cardTitle: { fontSize: 24, fontWeight: "900", color: COLORS.white },
  cardSub: { color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg, fontSize: 13 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, height: 56, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, fontSize: 16, color: COLORS.white, height: "100%" },
  error: { color: COLORS.error, marginBottom: SPACING.sm, marginTop: SPACING.sm, textAlign: "center" },
  cta: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: SPACING.sm, ...SHADOW.gold },
  ctaText: { color: COLORS.black, fontWeight: "900", fontSize: 16 },
});
