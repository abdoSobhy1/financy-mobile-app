import { useRef, useState } from "react";
import { TextInput } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../../app/store";
import { syncWithFirebase } from "../../../infrastructure/sync/store/syncSlice";
import { AlertService } from "../../../shared/services/AlertService";
import { sendPasswordReset, signIn, signInAsGuest, signUp } from "../store/authSlice";

/** Owns screen state and actions; rendering stays in SignInScreen. */
export function useSignInScreen() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; }>({});

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.auth);

  const validateEmail = (val: string) => {
    return /\S+@\S+\.\S+/.test(val);
  };

  const handleSignIn = async () => {
    const newErrors: { name?: string; email?: string; password?: string; } = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.email) emailRef.current?.focus();
      else if (newErrors.password) passwordRef.current?.focus();
      return;
    }

    setErrors({});
    try {
      await dispatch(signIn({ email: email.trim(), password })).unwrap();
      // Automatically trigger sync with Firebase database right after successful login
      dispatch(syncWithFirebase({ showToast: true }));
    } catch (error: any) {
      AlertService.alert("Sign In Failed", error.message);
    }
  };

  const handleContinueAsGuest = async () => {
    AlertService.alert(
      "Continue as a guest?",
      "Your data will stay on this device only. Guest mode has no cloud sync or backup, so you may lose access to your data if you change or lose this device. You can sign in or sign up later to keep this data and enable sync.",
      [
        {
          text: "Sign Up Instead",
          onPress: () => setIsSignUp(true),
        },
        {
          text: "Continue as Guest",
          onPress: async () => {
            try {
              await dispatch(signInAsGuest()).unwrap();
            } catch (error: any) {
              AlertService.alert("Guest Login Failed", error.message);
            }
          },
        },
      ],
    );
  };

  const handleSignUp = async () => {
    const newErrors: { name?: string; email?: string; password?: string; } = {};
    if (!displayName.trim()) {
      newErrors.name = "Name is required";
    }
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name) nameRef.current?.focus();
      else if (newErrors.email) emailRef.current?.focus();
      else if (newErrors.password) passwordRef.current?.focus();
      return;
    }

    setErrors({});
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
  return {
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
  };
}

export type SignInScreenController = ReturnType<typeof useSignInScreen>;
