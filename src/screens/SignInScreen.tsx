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
import { UI } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import { AppDispatch } from "../store";
import { LinearGradient } from "expo-linear-gradient";
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
          styles.inputCard,
          focusedField === fieldId && styles.inputCardFocused,
        ]}>
        <View style={styles.inputIconBox}>
          <Ionicons
            name={icon as any}
            size={18}
            color={
              focusedField === fieldId
                ? UI.COLORS.PRIMARY
                : "rgba(255,255,255,0.3)"
            }
          />
        </View>
        <TextInput
          style={styles.input}
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
            style={styles.eyeButton}>
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
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#0A0A1E", "#12122E", "#1A0A2E", "#0F0F23"]}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating orbs */}
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]} />
      <Animated.View style={[styles.orb, styles.orb2, orb2Style]} />
      <Animated.View style={[styles.orb, styles.orb3, orb3Style]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Logo & Header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["#8B5CF6", "#6D28D9", "#5B21B6"]}
                style={styles.logoGradient}>
                <Image
                  source={require("../../assets/splash-icon.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>Financy</Text>
            <Text style={styles.tagline}>
              {isSignUp
                ? "Create your account to get started"
                : "Welcome back! Manage your finances"}
            </Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(600)}
            style={styles.formCard}>
            {/* Title inside card */}
            <Text style={styles.formTitle}>
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
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.submitButton}>
              <LinearGradient
                colors={
                  loading
                    ? ["#4B4B6B", "#3B3B5B"]
                    : ["#8B5CF6", "#7C3AED", "#6D28D9"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitText}>
                      {isSignUp ? "Create Account" : "Sign In"}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Forgot Password */}
            {!isSignUp && (
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Switch Auth Mode */}
          <Animated.View
            entering={FadeInUp.delay(700).duration(500)}
            style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={styles.switchAction}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A1E",
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
    color: "#fff",
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
    color: "#fff",
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
    color: "#fff",
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
    color: "#fff",
    letterSpacing: 0.3,
  },

  // Forgot
  forgotButton: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotText: {
    fontSize: 13,
    color: "rgba(139, 92, 246, 0.8)",
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
    color: "#8B5CF6",
  },
});
