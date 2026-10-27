import { AlertService } from "../services/AlertService";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { signIn, signUp, signInAsGuest, sendPasswordReset } from "../store/slices/authSlice";
import { syncWithFirebase } from "../store/slices/syncSlice";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../components/ui/ThemeProvider";

// Actual app logo (same asset used for the launcher icon in app.json)
const APP_LOGO = require("../../assets/icon.png");

export const SignInScreen: React.FC = () => {
  const { colors, typography, radius } = useAppTheme();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.auth);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      AlertService.alert("Error", "Please fill in all fields");
      return;
    }
    try {
      await dispatch(signIn({ email: email.trim(), password })).unwrap();
      // Automatically trigger sync with Firebase database right after successful login
      dispatch(syncWithFirebase({ showToast: true }));
    } catch (error: any) {
      AlertService.alert("Sign In Failed", error.message);
    }
  };

  const handleContinueAsGuest = async () => {
    try {
      await dispatch(signInAsGuest()).unwrap();
    } catch (error: any) {
      AlertService.alert("Guest Login Failed", error.message);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      AlertService.alert("Error", "Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      AlertService.alert("Error", "Password must be at least 6 characters long");
      return;
    }
    try {
      await dispatch(
        signUp({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        }),
      ).unwrap();
      // Automatically trigger sync with Firebase database right after successful signup
      dispatch(syncWithFirebase({ showToast: true }));
    } catch (error: any) {
      AlertService.alert("Sign Up Failed", error.message);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      AlertService.alert("Error", "Please enter your email address first");
      return;
    }
    AlertService.alert(
      "Reset Password",
      `Send password reset email to ${email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            try {
              await dispatch(sendPasswordReset(email.trim())).unwrap();
              AlertService.alert("Success", "Password reset email sent!");
            } catch (error: any) {
              AlertService.alert("Error", error.message);
            }
          },
        },
      ],
    );
  };

  const renderLogo = () => (
    <View style={styles.logoContainer}>
      <Image
        source={APP_LOGO}
        style={styles.logoImage}
        resizeMode="cover"
        accessibilityLabel="Financy logo"
      />
      <Text
        style={[typography.h1, { color: colors.onBackground, fontSize: 36, lineHeight: 44 }]}
        numberOfLines={1}
      >
        Financy
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {renderLogo()}

        <View style={{ alignItems: "center", marginBottom: 40, width: "100%" }}>
          {/* Full-width + centered so Android never wraps/clips the last word
              (previously "Welcome back" rendered as just "Welcome"). */}
          <Text
            style={[
              typography.h1,
              { color: colors.onBackground, marginBottom: 8, fontSize: 28, lineHeight: 36, width: "100%", textAlign: "center" },
            ]}
          >
            {isSignUp ? "Create an account" : "Welcome back"}
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: "center", width: "100%" }]}>
            {isSignUp ? "Sign up to start managing your finances." : "Sign in to continue managing your finances."}
          </Text>
        </View>

        <View style={{ width: "100%", gap: 24 }}>
          
          {isSignUp && (
            <View>
              <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>Name</Text>
              <View style={[
                styles.inputContainer, 
                { backgroundColor: colors.surfaceVariant, borderColor: focusedField === "name" ? colors.primary : colors.outlineVariant }
              ]}>
                <Ionicons name="person-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.onBackground }]}
                  placeholder="John Doe"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={displayName}
                  onChangeText={setDisplayName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          )}

          <View>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>Email</Text>
            <View style={[
              styles.inputContainer, 
              { backgroundColor: colors.surfaceVariant, borderColor: focusedField === "email" ? colors.primary : colors.outlineVariant }
            ]}>
              <Ionicons name="mail-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.onBackground }]}
                placeholder="name@example.com"
                placeholderTextColor={colors.onSurfaceVariant}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>Password</Text>
            <View style={[
              styles.inputContainer, 
              { backgroundColor: colors.surfaceVariant, borderColor: focusedField === "password" ? colors.primary : colors.outlineVariant }
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.onBackground }]}
                placeholder="••••••••"
                placeholderTextColor={colors.onSurfaceVariant}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {!isSignUp && (
            <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: "flex-end" }}>
              <Text style={[typography.label, { color: colors.primary, fontWeight: "600" }]}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={isSignUp ? handleSignUp : handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[typography.bodyLarge, { color: colors.onPrimary, fontWeight: "600" }]}>
                {isSignUp ? "Sign Up" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
            <Text style={[typography.label, { color: colors.onSurfaceVariant, paddingHorizontal: 12 }]}>
              OR
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
          </View>

          <TouchableOpacity
            style={[
              styles.guestButton,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.outlineVariant,
              },
            ]}
            onPress={handleContinueAsGuest}
            disabled={loading}
          >
            <Ionicons
              name="person-circle-outline"
              size={22}
              color={colors.onSurface}
              style={{ marginRight: 8 }}
            />
            <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "600" }]}>
              Continue as Guest
            </Text>
          </TouchableOpacity>
          <Text
            style={[
              typography.label,
              {
                color: colors.onSurfaceVariant,
                textAlign: "center",
                marginTop: -12,
                fontSize: 12,
              },
            ]}
          >
            Offline local storage only • Cloud backup disabled • 3 AI receipt scans/day
          </Text>

        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 40 }}>
          <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
          </Text>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={[typography.bodyMedium, { color: colors.onBackground, fontWeight: "600" }]}>
              {isSignUp ? "Sign In" : "Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingVertical: 40,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  guestButton: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SignInScreen;
