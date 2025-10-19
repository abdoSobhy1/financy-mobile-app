// Hook to manage user session activity
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState } from "react-native";
import { RootState } from "../store";
import { updateActivity } from "../store/slices/authSlice";

export const useSessionManager = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Update activity when user interacts with the app
  const updateUserActivity = useCallback(() => {
    if (isAuthenticated) {
      dispatch(updateActivity() as any);
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Update activity when app becomes active
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        updateUserActivity();
      }
    };

    // Set up listeners
    const subscription = AppState.addEventListener("change", handleAppStateChange);

    // Update activity immediately when hook is mounted
    updateUserActivity();

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, updateUserActivity]);

  // Expose manual activity update function
  return {
    updateActivity: updateUserActivity,
  };
};
