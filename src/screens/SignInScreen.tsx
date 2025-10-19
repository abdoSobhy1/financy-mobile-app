// Sign In Screen for Firebase Authentication
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { signIn, signUp, sendPasswordReset } from "../store/slices/authSlice";
import { UI } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import { AppDispatch } from "../store";

export const SignInScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

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
        })
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

    Alert.alert("Reset Password", "Send password reset email to " + email + "?", [
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
    ]);
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Financy</Text>
          <Text style={styles.subtitle}>{isSignUp ? "Create your account" : "Welcome back"}</Text>
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} />
              <TextInput
                style={styles.input}
                placeholder="Display Name"
                placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={UI.COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          {isSignUp && (
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={16} color={UI.COLORS.ERROR} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isSignUp ? handleSignUp : handleSignIn}
            disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}</Text>
          </TouchableOpacity>

          {!isSignUp && (
            <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
              <Text style={styles.forgotButtonText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>{isSignUp ? "Already have an account?" : "Don't have an account?"}</Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={styles.switchButtonText}>{isSignUp ? "Sign In" : "Sign Up"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: UI.SPACING.LG,
  },
  header: {
    alignItems: "center",
    marginBottom: UI.SPACING.XL * 2,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: UI.COLORS.PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  subtitle: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.COLORS.CARD,
    borderRadius: 12,
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    marginBottom: UI.SPACING.MD,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  input: {
    flex: 1,
    marginLeft: UI.SPACING.SM,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: UI.SPACING.SM,
    borderRadius: 8,
    marginBottom: UI.SPACING.MD,
  },
  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginLeft: UI.SPACING.XS,
    flex: 1,
  },
  button: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: UI.SPACING.MD,
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  buttonDisabled: {
    backgroundColor: UI.COLORS.TEXT_MUTED,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  forgotButton: {
    alignItems: "center",
    marginBottom: UI.SPACING.LG,
  },
  forgotButtonText: {
    fontSize: 12,
    color: UI.COLORS.PRIMARY,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  switchText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    marginRight: UI.SPACING.XS,
  },
  switchButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: UI.COLORS.PRIMARY,
  },
});
