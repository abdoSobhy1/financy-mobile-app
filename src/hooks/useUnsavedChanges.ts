import { useEffect, useRef, useCallback } from "react";
import { BackHandler } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AlertService } from "../services/AlertService";

export interface UseUnsavedChangesOptions {
  hasChanges: boolean;
  isEditing?: boolean;
  onInterceptBack?: () => boolean;
  title?: string;
  message?: string;
  enabled?: boolean;
}

export function useUnsavedChanges({
  hasChanges,
  isEditing = false,
  onInterceptBack,
  title = "Discard Changes",
  message,
  enabled = true,
}: UseUnsavedChangesOptions) {
  let navigation: any = null;
  try {
    navigation = useNavigation();
  } catch {
    // Component might be in a modal outside a navigation container
  }

  const isSavingRef = useRef(false);
  const onInterceptBackRef = useRef(onInterceptBack);
  onInterceptBackRef.current = onInterceptBack;

  const defaultMessage = isEditing
    ? "Your changes will be lost. Are you sure you want to exit?"
    : "There are changes that will be dismissed. Are you sure you want to exit?";

  const alertMessage = message || defaultMessage;

  const markAsSaved = useCallback(() => {
    isSavingRef.current = true;
  }, []);

  const resetSaved = useCallback(() => {
    isSavingRef.current = false;
  }, []);

  const confirmExit = useCallback(
    (onExit?: () => void) => {
      if (!enabled || !hasChanges) {
        onExit?.();
        return true;
      }

      AlertService.alert(title, alertMessage, [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            isSavingRef.current = true;
            onExit?.();
          },
        },
      ]);
      return false;
    },
    [enabled, hasChanges, title, alertMessage]
  );

  // Hardware back button interception (e.g. for closing custom keypad or other overlays)
  useEffect(() => {
    if (!enabled || !onInterceptBack) return;

    const onBackPress = () => {
      if (onInterceptBackRef.current && onInterceptBackRef.current()) {
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [enabled, onInterceptBack]);

  // React Navigation beforeRemove interception
  useEffect(() => {
    if (!enabled || !navigation) return;

    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (isSavingRef.current) {
        return;
      }

      if (onInterceptBackRef.current && onInterceptBackRef.current()) {
        e.preventDefault();
        return;
      }

      if (!hasChanges) {
        return;
      }

      e.preventDefault();

      AlertService.alert(title, alertMessage, [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            isSavingRef.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, enabled, hasChanges, title, alertMessage]);

  return {
    confirmExit,
    markAsSaved,
    resetSaved,
    isSavingRef,
  };
}
