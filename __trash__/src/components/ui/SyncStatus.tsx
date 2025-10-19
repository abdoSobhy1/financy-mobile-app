// Sync Status Indicator Component
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { RootState, AppDispatch } from "../../store";
import { refreshSyncStatus } from "../../store/slices/syncSlice";
import { UI } from "../../constants";

interface SyncStatusProps {
  style?: any;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ style }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isOnline, syncInProgress, pendingOperations, lastSync, error } = useSelector((state: RootState) => state.sync);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Auto-refresh sync status every 10 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      dispatch(refreshSyncStatus());
    }, 10000); // Every 10 seconds

    // Initial refresh
    dispatch(refreshSyncStatus());

    return () => clearInterval(interval);
  }, [dispatch, isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleRefresh = () => {
    dispatch(refreshSyncStatus());
  };

  const getStatusIcon = () => {
    if (error) return "alert-circle";
    if (syncInProgress) return "sync";
    if (!isOnline) return "cloud-offline";
    if (pendingOperations > 0) return "time";
    return "checkmark-circle";
  };

  const getStatusColor = () => {
    if (error) return UI.COLORS.ERROR;
    if (syncInProgress) return UI.COLORS.WARNING;
    if (!isOnline) return UI.COLORS.TEXT_MUTED;
    if (pendingOperations > 0) return UI.COLORS.WARNING;
    return UI.COLORS.SUCCESS;
  };

  const getStatusText = () => {
    if (error) return "Sync Error";
    if (syncInProgress) return "Syncing...";
    if (!isOnline) return "Offline";
    if (pendingOperations > 0) return `${pendingOperations} pending`;
    return "Synced";
  };

  const formatLastSync = () => {
    if (!lastSync) return "";
    const now = Date.now();
    const diff = now - lastSync;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={handleRefresh} activeOpacity={0.7}>
      <View style={styles.content}>
        <Ionicons name={getStatusIcon() as any} size={16} color={getStatusColor()} style={syncInProgress ? styles.spinning : undefined} />
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
          {lastSync && !syncInProgress && <Text style={styles.lastSyncText}>{formatLastSync()}</Text>}
        </View>
      </View>

      {error && (
        <Text style={styles.errorText} numberOfLines={1}>
          {error}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: UI.COLORS.CARD_BLUR,
    borderRadius: 8,
    paddingHorizontal: UI.SPACING.SM,
    paddingVertical: UI.SPACING.XS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    marginLeft: UI.SPACING.XS,
    // flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  lastSyncText: {
    fontSize: 10,
    color: UI.COLORS.TEXT_MUTED,
  },
  errorText: {
    fontSize: 10,
    color: UI.COLORS.ERROR,
    marginTop: UI.SPACING.XS,
  },
  spinning: {
    // Animation would be handled via Animated API or react-native-reanimated
  },
});
