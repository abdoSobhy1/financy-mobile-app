// Sign In Screen for Firebase Authentication — Premium Dark UI
import React, { useState, useEffect, useRef } from "react";
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
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { signIn, signUp, sendPasswordReset } from "../store/slices/authSlice";
import { Button } from "../components/ui";
import { Ionicons } from "@expo/vector-icons";
import { AppDispatch } from "../store";

import { useAppTheme } from "../components/ui/ThemeProvider";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  FadeInUp,
  FadeInDown,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const SignInScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  // Floating orb animations
  const orb1Y = useSharedValue(0);
  const orb2Y = useSharedValue(0);
  const orb3X = useSharedValue(0);

  useEffect(() => {
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    orb2Y.value = withRepeat(
      withDelay(
        500,
        withSequence(
          withTiming(15, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-15, {
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
      ),
      -1,
      true,
    );
    orb3X.value = withRepeat(
      withDelay(
        1000,
        withSequence(
          withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-10, {
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
      ),
      -1,
      true,
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb1Y.value }],
  }));
  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb2Y.value }],
  }));
  const orb3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb3X.value }],
  }));

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    try {
      await dispatch(signIn({ email: email.trim(), password })).unwrap();
    } catch (error: any) {
      Alert.alert("Sign In Failed", error.message);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
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
    } catch (error: any) {
      Alert.alert("Sign Up Failed", error.message);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address first");
      return;
    }
    Alert.alert(
      "Reset Password",
      "Send password reset email to " + email + "?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            try {
              await dispatch(sendPasswordReset(email.trim())).unwrap();
              Alert.alert("Success", "Password reset email sent");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ],
    );
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
  };

  const renderInput = (
    icon: string,
    placeholder: string,
    value: string,
    onChange: (text: string) => void,
    fieldId: string,
    options: {
      secure?: boolean;
      keyboardType?: any;
      autoCapitalize?: any;
      togglePassword?: boolean;
    } = {},
  ) => (
    <Animated.View
      entering={FadeInUp.delay(
        fieldId === "email" ? 400 : fieldId === "password" ? 500 : 600,
      ).duration(500)}>
      <View
        style={[
          styles(colors).inputCard,
          focusedField === fieldId && styles(colors).inputCardFocused,
        ]}>
        <View style={styles(colors).inputIconBox}>
          <Ionicons
            name={icon as any}
            size={18}
            color={
              focusedField === fieldId
                ? colors.primary
                : colors.onSurfaceVariant
            }
          />
        </View>
        <TextInput
          style={styles(colors).input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={value}
          onChangeText={onChange}
          secureTextEntry={options.secure && !showPassword}
          keyboardType={options.keyboardType || "default"}
          autoCapitalize={options.autoCapitalize || "none"}
          autoCorrect={false}
          onFocus={() => setFocusedField(fieldId)}
          onBlur={() => setFocusedField(null)}
        />
        {options.togglePassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles(colors).eyeButton}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={18}
              color="rgba(255,255,255,0.3)"
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles(colors).container, { backgroundColor: colors.background }]}>

      {/* Floating orbs */}
      <Animated.View style={[styles(colors).orb, styles(colors).orb1, orb1Style]} />
      <Animated.View style={[styles(colors).orb, styles(colors).orb2, orb2Style]} />
      <Animated.View style={[styles(colors).orb, styles(colors).orb3, orb3Style]} />

      <KeyboardAvoidingView
        style={styles(colors).keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles(colors).scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Logo & Header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            style={styles(colors).header}>
            <View style={styles(colors).logoContainer}>
              <View style={[styles(colors).logoGradient, { backgroundColor: colors.primaryContainer }]} >
                <Image
                  source={require("../../assets/splash-icon.png")}
                  style={styles(colors).logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles(colors).appName}>Financy</Text>
            <Text style={styles(colors).tagline}>
              {isSignUp
                ? "Create your account to get started"
                : "Welcome back! Manage your finances"}
            </Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(600)}
            style={styles(colors).formCard}>
            {/* Title inside card */}
            <Text style={styles(colors).formTitle}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>

            {isSignUp &&
              renderInput(
                "person-outline",
                "Display Name",
                displayName,
                setDisplayName,
                "name",
                { autoCapitalize: "words" },
              )}

            {renderInput(
              "mail-outline",
              "Email address",
              email,
              setEmail,
              "email",
              { keyboardType: "email-address" },
            )}

            {renderInput(
              "lock-closed-outline",
              "Password",
              password,
              setPassword,
              "password",
              { secure: true, togglePassword: true },
            )}

            {isSignUp &&
              renderInput(
                "shield-checkmark-outline",
                "Confirm Password",
                confirmPassword,
                setConfirmPassword,
                "confirm",
                { secure: true },
              )}

            {/* Error */}
            {error && (
              <View style={styles(colors).errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles(colors).errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
              <Button
                title={isSignUp ? "Create Account" : "Sign In"}
                onPress={isSignUp ? handleSignUp : handleSignIn}
                loading={loading}
                icon="arrow-forward"
                iconPosition="right"
                style={styles(colors).submitButton}
              />

            {/* Forgot Password */}
            {!isSignUp && (
              <TouchableOpacity
                style={styles(colors).forgotButton}
                onPress={handleForgotPassword}>
                <Text style={styles(colors).forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Switch Auth Mode */}
          <Animated.View
            entering={FadeInUp.delay(700).duration(500)}
            style={styles(colors).switchRow}>
            <Text style={styles(colors).switchText}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={styles(colors).switchAction}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Floating orbs
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orb1: {
    width: 180,
    height: 180,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    top: SCREEN_HEIGHT * 0.08,
    right: -40,
  },
  orb2: {
    width: 120,
    height: 120,
    backgroundColor: "rgba(109, 40, 217, 0.1)",
    top: SCREEN_HEIGHT * 0.45,
    left: -30,
  },
  orb3: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(167, 139, 250, 0.08)",
    bottom: SCREEN_HEIGHT * 0.15,
    right: 30,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoGradient: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    overflow: "hidden",
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  // Form card
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 20,
  },

  // Input
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  inputCardFocused: {
    borderColor: "rgba(139, 92, 246, 0.4)",
    backgroundColor: "rgba(139, 92, 246, 0.06)",
  },
  inputIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
  },
  eyeButton: {
    padding: 6,
  },

  // Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    flex: 1,
  },

  // Submit button
  submitButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 6,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
    letterSpacing: 0.3,
  },

  // Forgot
  forgotButton: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "500",
  },

  // Switch
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 6,
  },
  switchText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  switchAction: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
});
