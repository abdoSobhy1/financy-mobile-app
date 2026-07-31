import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ui/ThemeProvider';

export interface BaseFormProps {
  // Header configuration
  title: string;
  isEditMode?: boolean;
  
  // Navigation handlers
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
  
  // Loading and error states
  isLoading?: boolean;
  isDeleteLoading?: boolean;
  
  // Content
  children: React.ReactNode;
  
  // Styling
  showDeleteButton?: boolean;
}

/**
 * Unified form screen component that provides consistent layout,
 * header, navigation, and keyboard handling for all create/edit forms
 */
export const BaseForm: React.FC<BaseFormProps> = ({
  title,
  isEditMode = false,
  onCancel,
  onSave,
  onDelete,
  isLoading = false,
  isDeleteLoading = false,
  children,
  showDeleteButton = false,
}) => {
  const { colors, typography, spacing, radius } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomColor: colors.outlineVariant, backgroundColor: colors.surface }]}>
          {/* Cancel Button */}
          <TouchableOpacity onPress={onCancel} style={[styles.cancelButton, { padding: spacing.xs, borderRadius: radius.md }]}>
            <Ionicons
              name="close"
              size={24}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
          
          {/* Title */}
          <Text style={[typography.h3, styles.title, { color: colors.onSurface }]}>{title}</Text>
          
          {/* Action Buttons */}
          <View style={[styles.headerActions, { gap: spacing.sm }]}>
            {/* Delete Button (Edit Mode Only) */}
            {showDeleteButton && isEditMode && onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                style={[styles.deleteButton, { padding: spacing.xs, borderRadius: radius.md }]}
                disabled={isDeleteLoading}
              >
                {isDeleteLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.error}
                  />
                ) : (
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.error}
                  />
                )}
              </TouchableOpacity>
            )}
            
            {/* Save Button */}
            <TouchableOpacity
              onPress={onSave}
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
                isLoading && styles.saveButtonDisabled,
              ]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.onPrimary}
                />
              ) : (
                <Text style={[typography.bodyLarge, styles.saveButtonText, { color: colors.onPrimary }]}>
                  {isEditMode ? 'Save' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Form Content */}
        <ScrollView
          style={[styles.content, { padding: spacing.md }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  cancelButton: {
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
  },
  saveButton: {
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
  },
  content: {
    flex: 1,
  },
});