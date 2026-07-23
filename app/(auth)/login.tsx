import { useState } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Pressable, TextInput, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { saveToken, getDeviceId } from "@/src/store";
import { useEmailAuth } from "@/src/hooks/use-email-auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, resetPassword, loading: authLoading, error: authError, setError: setAuthError, needsConfirmation } = useEmailAuth();
  const displayError = error || authError;

  const finishLogin = async (res: { token: string; user: any }) => {
    await saveToken(res.token);
    router.replace("/(tabs)");
  };

  const onSignIn = async () => {
    setError("");
    if (!EMAIL_REGEX.test(email)) { setError("Please enter a valid email address"); return; }
    if (!password) { setError("Please enter your password"); return; }
    const supabaseToken = await signIn(email, password);
    if (!supabaseToken) return;
    setLoading(true);
    try {
      const device_id = await getDeviceId();
      const res = await api.emailPasswordLogin({ supabase_token: supabaseToken, email, name: email.split("@")[0], device_id });
      await finishLogin(res);
    } catch (e: any) { setError(e?.message || "Login failed"); }
    finally { setLoading(false); }
  };

  const onSignUp = async () => {
    setError("");
    setAuthError("");
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!EMAIL_REGEX.test(email)) { setError("Please enter a valid email address"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    const supabaseToken = await signUp(email, password);
    if (!supabaseToken) return;
    setLoading(true);
    try {
      const device_id = await getDeviceId();
      const res = await api.emailPasswordLogin({ supabase_token: supabaseToken, email, name: name.trim(), device_id });
      await finishLogin(res);
    } catch (e: any) { setError(e?.message || "Sign up failed"); }
    finally { setLoading(false); }
  };

  const onForgotPassword = async () => {
    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter your email address above first, then tap Forgot Password");
      return;
    }
    setError("");
    setAuthError("");
    const ok = await resetPassword(email);
    if (ok) {
      setResetSent(true);
      Alert.alert("Check Your Email", `A password reset link has been sent to ${email}. Tap the link in the email to reset your password.`);
    }
  };

  return (
    <View style={styles.root}>
      <Image source="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200" style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      <LinearGradient colors={["rgba(10,10,10,0.6)", "rgba(10,10,10,0.88)", COLORS.black]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kb}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.heroWrap}>
            <View style={styles.logoRing}><Text style={styles.logoMonogram}>A</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>ADMIN PORTAL</Text></View>
            <Text testID="brand-title" style={styles.brand}>MEZBAAN</Text>
            <Text style={styles.brandSub}>ADMIN</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{mode === "signin" ? "Admin Sign In" : "Create Admin Account"}</Text>
            <Text style={styles.cardSub}>{mode === "signin" ? "Sign in to manage orders and menu" : "Sign up to access the admin panel"}</Text>

            {mode === "signup" && (
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={{ marginHorizontal: SPACING.sm }} />
                <TextInput testID="signup-name-input" placeholder="Full name" placeholderTextColor={COLORS.textMuted} autoCapitalize="words" value={name} onChangeText={setName} style={styles.input} />
              </View>
            )}

            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={{ marginHorizontal: SPACING.sm }} />
              <TextInput testID="login-email-input" placeholder="you@example.com" placeholderTextColor={COLORS.textMuted} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input} />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={{ marginHorizontal: SPACING.sm }} />
              <TextInput testID="login-password-input" placeholder="Password" placeholderTextColor={COLORS.textMuted} secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} style={styles.input} />
            </View>

            {mode === "signin" && (
              <View style={styles.forgotRow}>
                <Pressable testID="forgot-password-btn" onPress={onForgotPassword} disabled={loading || authLoading}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>
              </View>
            )}

            {resetSent && (
              <Text style={styles.successMsg}>Reset email sent! Check your inbox.</Text>
            )}

            {needsConfirmation && mode === "signup" && (
              <Text style={styles.confirmMsg}>Account created! Check your email to confirm, then switch to Sign In.</Text>
            )}

            {displayError ? <Text testID="login-error" style={styles.error}>{displayError}</Text> : null}

            <Pressable testID={mode === "signin" ? "login-signin-btn" : "login-signup-btn"} onPress={mode === "signin" ? onSignIn : onSignUp} disabled={loading || authLoading} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
              {loading || authLoading ? <ActivityIndicator color={COLORS.black} /> : (
                <>
                  <Text style={styles.ctaText}>{mode === "signin" ? "Sign In" : "Sign Up"}</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.black} />
                </>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchTxt}>{mode === "signin" ? "Don't have an account? " : "Already have an account? "}</Text>
              <Pressable testID={mode === "signin" ? "login-goto-signup" : "login-goto-signin"} onPress={() => { setError(""); setAuthError(""); setResetSent(false); setMode(mode === "signin" ? "signup" : "signin"); }}>
                <Text style={styles.switchLink}>{mode === "signin" ? "Sign Up" : "Sign In"}</Text>
              </Pressable>
            </View>
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
  badge: { borderWidth: 1, borderColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.pill, marginBottom: SPACING.md },
  badgeText: { color: COLORS.gold, fontWeight: "800", fontSize: 11, letterSpacing: 2 },
  brand: { fontSize: 52, fontWeight: "900", color: COLORS.white, letterSpacing: 6 },
  brandSub: { fontSize: 18, fontWeight: "700", color: COLORS.gold, letterSpacing: 10, marginTop: -6 },
  card: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.strong },
  cardTitle: { fontSize: 24, fontWeight: "900", color: COLORS.white },
  cardSub: { color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg, fontSize: 13 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, height: 56, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, fontSize: 16, color: COLORS.white, height: "100%" },
  forgotRow: { alignItems: "flex-end", marginBottom: SPACING.sm },
  forgotText: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
  successMsg: { color: COLORS.success || "#4ade80", fontSize: 13, textAlign: "center", marginBottom: SPACING.sm },
  confirmMsg: { color: "#fbbf24", fontSize: 13, textAlign: "center", marginBottom: SPACING.sm, lineHeight: 18 },
  error: { color: COLORS.error, marginBottom: SPACING.sm, marginTop: SPACING.sm, textAlign: "center" },
  cta: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: SPACING.sm, ...SHADOW.gold },
  ctaText: { color: COLORS.black, fontWeight: "900", fontSize: 16 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: SPACING.lg },
  switchTxt: { color: COLORS.textSecondary, fontSize: 14 },
  switchLink: { color: COLORS.gold, fontWeight: "800", fontSize: 14 },
});
