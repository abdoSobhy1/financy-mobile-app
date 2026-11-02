import { styles } from "./SignInScreen.styles";
import { useSignInScreen } from "../hooks/useSignInScreen";

import React from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

// Actual app logo (same asset used for the launcher icon in app.json)
const APP_LOGO = require("../../../../assets/icon.png");

export const SignInScreen: React.FC = () => {
  const { colors, typography, radius } = useAppTheme();
  const {
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    isSignUp,
    setIsSignUp,
    showPassword,
    setShowPassword,
    focusedField,
    setFocusedField,
    errors,
    setErrors,
    nameRef,
    emailRef,
    passwordRef,
    loading,
    handleSignIn,
    handleContinueAsGuest,
    handleSignUp,
    handleForgotPassword
  } = useSignInScreen();

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
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: errors.name ? colors.error : focusedField === "name" ? colors.primary : colors.outlineVariant,
                }
              ]}>
                <Ionicons name="person-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  ref={nameRef}
                  style={[styles.input, { color: colors.onBackground }]}
                  placeholder="John Doe"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.name && (
                <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, fontWeight: "600" }}>
                  {errors.name}
                </Text>
              )}
            </View>
          )}

          <View>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>Email</Text>
            <View style={[
              styles.inputContainer,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: errors.email ? colors.error : focusedField === "email" ? colors.primary : colors.outlineVariant,
              }
            ]}>
              <Ionicons name="mail-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={[styles.input, { color: colors.onBackground }]}
                placeholder="name@example.com"
                placeholderTextColor={colors.onSurfaceVariant}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.email && (
              <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, fontWeight: "600" }}>
                {errors.email}
              </Text>
            )}
          </View>

          <View>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>Password</Text>
            <View style={[
              styles.inputContainer,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: errors.password ? colors.error : focusedField === "password" ? colors.primary : colors.outlineVariant,
              }
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { color: colors.onBackground }]}
                placeholder="••••••••"
                placeholderTextColor={colors.onSurfaceVariant}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={isSignUp ? handleSignUp : handleSignIn}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, fontWeight: "600" }}>
                {errors.password}
              </Text>
            )}
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
            Offline local storage only • Cloud backup disabled
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

export default SignInScreen;
