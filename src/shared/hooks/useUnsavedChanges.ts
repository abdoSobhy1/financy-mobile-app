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
  isModal?: boolean;
}

export function useUnsavedChanges({
  hasChanges,
  isEditing = false,
  onInterceptBack,
  title = "Discard Changes",
  message,
  enabled = true,
  isModal = false,
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

  const hasChangesRef = useRef(hasChanges);
  hasChangesRef.current = hasChanges;

  const alertMessageRef = useRef(alertMessage);
  alertMessageRef.current = alertMessage;

  const titleRef = useRef(title);
  titleRef.current = title;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const markAsSaved = useCallback(() => {
    isSavingRef.current = true;
  }, []);

  const resetSaved = useCallback(() => {
    isSavingRef.current = false;
  }, []);

  const confirmExit = useCallback(
    (onExit?: () => void) => {
      if (!enabledRef.current || !hasChangesRef.current || isSavingRef.current) {
        onExit?.();
        return true;
      }

      AlertService.alert(titleRef.current, alertMessageRef.current, [
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
    []
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

  // React Navigation beforeRemove interception (ONLY for screen routes, NEVER for modals)
  useEffect(() => {
    if (!enabled || !navigation || isModal) return;

    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (isSavingRef.current) {
        return;
      }

      if (onInterceptBackRef.current && onInterceptBackRef.current()) {
        e.preventDefault();
        return;
      }

      if (!hasChangesRef.current) {
        return;
      }

      e.preventDefault();

      AlertService.alert(titleRef.current, alertMessageRef.current, [
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
  }, [navigation, enabled, isModal]);

  return {
    confirmExit,
    markAsSaved,
    resetSaved,
    isSavingRef,
  };
}
