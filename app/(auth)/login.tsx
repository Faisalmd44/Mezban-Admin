import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "../../src/theme";
import { api } from "../../src/api";
import { saveToken, useApp } from "../../src/store";
import { useEmailAuth } from "../../src/hooks/use-email-auth";
import * as Application from "expo-application";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Safe Device ID function for Web and Android
const getDeviceId = async () => {
  if (Platform.OS === 'android') {
    return Application.androidId || 'android-device';
  }
  return 'web-device';
};

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
  const { setUser } = useApp();
  const { signIn, signUp, resetPassword, loading: authLoading, error: authError } = useEmailAuth();
  const displayError = error || authError;

  const finishLogin = async (res: { token: string; user?: any }) => {
    await saveToken(res.token);
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setUser(res.user ?? null);
    }
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
      const res = await api.emailPasswordLogin({ 
  email, 
  password, 
  supabase_token: supabaseToken, 
  device_id 
});

      await finishLogin(res);
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async () => {
    setError("");
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!EMAIL_REGEX.test(email)) { setError("Please enter a valid email address"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    const supabaseToken = await signUp(email, password);
    if (!supabaseToken) return;
    setLoading(true);
    try {
      const device_id = await getDeviceId();
      const res = await api.emailPasswordLogin({ supabase_token: supabaseToken, device_id });
      await finishLogin(res);
    } catch (e: any) {
      setError(e?.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async () => {
    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter your email address above first, then tap Forgot Password");
      return;
    }
    setError("");
    const ok = await resetPassword(email);
    if (ok) {
      setResetSent(true);
      Alert.alert("Check Your Email", "A password reset link has been sent.");
    }
  };

 return (
  <KeyboardAvoidingView 
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={{ flex: 1 }}
  >
    <View style={styles.root}>
      <Image source={{ uri: "https://images.unsplash.com/photo-1414235372982-b13c8f8d9b15" }} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={["rgba(10,10,10,0.6)", "rgba(10,10,10,0.95)"]} style={StyleSheet.absoluteFillObject} />
      
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      > {/* Aapka Baaki Ka Saara Form Code (View heroWrap, View card, etc.) */} 

          <View style={styles.heroWrap}>
            <View style={styles.logoRing}><Text style={styles.logoMonogram}>A</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>ADMIN PORTAL</Text></View>
            <Text testID="brand-title" style={styles.brand}>MEZBAAN</Text>
            <Text style={styles.brandSub}>ADMIN</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{mode === "signin" ? "Admin Sign In" : "Create Admin"}</Text>
            <Text style={styles.cardSub}>{mode === "signin" ? "Sign in to manage orders and menu" : "Register new admin account"}</Text>

            {mode === "signup" && (
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color={COLORS.gold} />
                <TextInput testID="signup-name-input" style={styles.input} placeholder="Full Name" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
              </View>
            )}

            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={COLORS.gold} />
              <TextInput testID="login-email-input" style={styles.input} placeholder="Admin Email" placeholderTextColor={COLORS.textMuted} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.gold} />
              <TextInput testID="login-password-input" style={styles.input} placeholder="Password" placeholderTextColor={COLORS.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
            </View>

            {mode === "signin" && (
              <View style={styles.forgotRow}>
                <Pressable testID="forgot-password-btn" onPress={onForgotPassword}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>
              </View>
            )}

            {resetSent && <Text style={styles.successMsg}>Reset email sent! Check inbox.</Text>}
            {displayError ? <Text testID="login-error" style={styles.error}>{displayError}</Text> : null}

            <Pressable testID={mode === "signin" ? "login-submit-btn" : "signup-submit-btn"} style={[styles.cta, (loading || authLoading) && { opacity: 0.7 }]} onPress={mode === "signin" ? onSignIn : onSignUp} disabled={loading || authLoading}>
              {(loading || authLoading) ? <ActivityIndicator color={COLORS.black} /> : (
                <>
                  <Text style={styles.ctaText}>{mode === "signin" ? "Sign In" : "Sign Up"}</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.black} />
                </>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchTxt}>{mode === "signin" ? "Don't have an account?" : "Already have an account?"}</Text>
              <Pressable testID={mode === "signin" ? "login-goto-signup" : "signup-goto-login"} onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}>
                <Text style={styles.switchLink}>{mode === "signin" ? "Sign Up" : "Sign In"}</Text>
              </Pressable>
            </View>
      </View>
    </ScrollView>
  </View>
</KeyboardAvoidingView>
);

}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  kb: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: SPACING.xl },
  heroWrap: { alignItems: "center", marginBottom: SPACING.xxl },
  logoRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: COLORS.gold, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,193,7,0.08)", marginBottom: SPACING.md },
  logoMonogram: { fontSize: 40, fontWeight: "900", color: COLORS.gold },
  badge: { borderWidth: 1, borderColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, marginBottom: SPACING.sm, backgroundColor: "rgba(255,193,7,0.1)" },
  badgeText: { color: COLORS.gold, fontWeight: "800", fontSize: 10, letterSpacing: 2 },
  brand: { fontSize: 52, fontWeight: "900", color: COLORS.white, letterSpacing: 4 },
  brandSub: { fontSize: 18, fontWeight: "700", color: COLORS.gold, letterSpacing: 8, marginTop: -SPACING.xs },
  card: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", ...SHADOW.lg },
  cardTitle: { fontSize: 24, fontWeight: "900", color: COLORS.white },
  cardSub: { color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg, fontSize: 13 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, height: 52 },
  input: { flex: 1, fontSize: 16, color: COLORS.white, height: "100%", marginLeft: SPACING.sm },
  forgotRow: { alignItems: "flex-end", marginBottom: SPACING.sm },
  forgotText: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
  successMsg: { color: COLORS.success || "#4ade80", fontSize: 13, marginBottom: SPACING.sm, textAlign: "center" },
  error: { color: COLORS.error, marginBottom: SPACING.sm, marginHorizontal: SPACING.xs, fontSize: 13 },
  cta: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pixel || RADIUS.lg, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.xs, marginTop: SPACING.xs },
  ctaText: { color: COLORS.black, fontWeight: "900", fontSize: 16 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: SPACING.lg, gap: SPACING.xs },
  switchTxt: { color: COLORS.textSecondary, fontSize: 14 },
  switchLink: { color: COLORS.gold, fontWeight: "800", fontSize: 14 }
});

