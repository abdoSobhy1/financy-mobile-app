// Sync Status Indicator Component
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { RootState, AppDispatch } from "../../../app/store";
import { refreshSyncStatus } from "../store/syncSlice";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface SyncStatusProps {
  style?: any;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ style }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isOnline, syncInProgress, pendingOperations, lastSync, error } = useSelector((state: RootState) => state.sync);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { colors, typography, spacing, radius } = useAppTheme();

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
    if (error) return colors.error;
    if (syncInProgress) return colors.tertiary;
    if (!isOnline) return colors.onSurfaceVariant;
    if (pendingOperations > 0) return colors.tertiary;
    return colors.primary;
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
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.surfaceVariant,
          borderColor: colors.outlineVariant,
          borderRadius: radius.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
        style
      ]} 
      onPress={handleRefresh} 
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Ionicons name={getStatusIcon() as any} size={16} color={getStatusColor()} style={syncInProgress ? styles.spinning : undefined} />
        <View style={[styles.textContainer, { marginLeft: spacing.xs }]}>
          <Text style={[styles.statusText, typography.label, { color: getStatusColor() }]}>{getStatusText()}</Text>
          {lastSync && !syncInProgress && <Text style={[styles.lastSyncText, typography.bodySmall, { color: colors.onSurfaceVariant }]}>{formatLastSync()}</Text>}
        </View>
      </View>

      {error && (
        <Text style={[styles.errorText, typography.bodySmall, { color: colors.error, marginTop: spacing.xs }]} numberOfLines={1}>
          {error}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    // flex: 1,
  },
  statusText: {
  },
  lastSyncText: {
  },
  errorText: {
  },
  spinning: {
    // Animation would be handled via Animated API or react-native-reanimated
  },
});
