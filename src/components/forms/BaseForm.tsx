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
import { THEME } from '../../constants/theme';

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
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Cancel Button */}
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons
              name="close"
              size={24}
              color={THEME.colors.textSecondary}
            />
          </TouchableOpacity>
          
          {/* Title */}
          <Text style={styles.title}>{title}</Text>
          
          {/* Action Buttons */}
          <View style={styles.headerActions}>
            {/* Delete Button (Edit Mode Only) */}
            {showDeleteButton && isEditMode && onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                style={styles.deleteButton}
                disabled={isDeleteLoading}
              >
                {isDeleteLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={THEME.colors.error}
                  />
                ) : (
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={THEME.colors.error}
                  />
                )}
              </TouchableOpacity>
            )}
            
            {/* Save Button */}
            <TouchableOpacity
              onPress={onSave}
              style={[
                styles.saveButton,
                isLoading && styles.saveButtonDisabled,
              ]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={THEME.colors.textInverse}
                />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditMode ? 'Save' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Form Content */}
        <ScrollView
          style={styles.content}
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
    backgroundColor: THEME.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  cancelButton: {
    padding: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.md,
  },
  title: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: THEME.typography.fontWeight.semibold as any,
    color: THEME.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  deleteButton: {
    padding: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.md,
  },
  saveButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: THEME.colors.textInverse,
    fontSize: THEME.typography.fontSize.base,
    fontWeight: THEME.typography.fontWeight.semibold as any,
  },
  content: {
    flex: 1,
    padding: THEME.spacing.md,
  },
});