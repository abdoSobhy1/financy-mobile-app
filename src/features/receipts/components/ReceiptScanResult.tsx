import { styles } from "./ReceiptScanModal.styles";
import type { ReceiptScanModalController } from "../hooks/useReceiptScanModal";

import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme, type AppTheme } from "../../../shared/theme/ThemeProvider";

interface ReceiptScanResultProps {
  colors: AppTheme["colors"];
  handleDocumentScanner: ReceiptScanModalController["handleDocumentScanner"];
  typography: AppTheme["typography"];
  handleGalleryPick: ReceiptScanModalController["handleGalleryPick"];
  handleDocumentPick: ReceiptScanModalController["handleDocumentPick"];
}
export function ReceiptScanResult({ colors, handleDocumentScanner, typography, handleGalleryPick, handleDocumentPick }: ReceiptScanResultProps) {
  return (<View style={styles.optionsList}>
    {/* Option 1: Document Scanner */}
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.optionCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.primary,
          borderWidth: 1.5,
        },
      ]}
      onPress={handleDocumentScanner}>
      <View
        style={[
          styles.optionIconBox,
          { backgroundColor: colors.primaryContainer },
        ]}>
        <Ionicons
          name="camera-outline"
          size={24}
          color={colors.onPrimaryContainer}
        />
      </View>
      <View style={styles.optionContent}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.onBackground, fontWeight: "700" },
            ]}>
            Document Scanner
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.primary },
            ]}>
            <Text style={styles.badgeText}>SMART CROP</Text>
          </View>
        </View>
        <Text
          style={[
            typography.label,
            { color: colors.onSurfaceVariant, marginTop: 2 },
          ]}>
          Live camera with auto-edge detection & perspective correction
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.primary}
      />
    </TouchableOpacity>

    {/* Option 2: Gallery */}
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.optionCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.outlineVariant,
        },
      ]}
      onPress={handleGalleryPick}>
      <View
        style={[
          styles.optionIconBox,
          { backgroundColor: colors.surfaceVariant },
        ]}>
        <Ionicons
          name="images-outline"
          size={22}
          color={colors.onSurfaceVariant}
        />
      </View>
      <View style={styles.optionContent}>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.onBackground, fontWeight: "600" },
          ]}>
          Choose Photo
        </Text>
        <Text
          style={[
            typography.label,
            { color: colors.onSurfaceVariant, marginTop: 2 },
          ]}>
          Select a saved receipt photo from your gallery
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.onSurfaceVariant}
      />
    </TouchableOpacity>

    {/* Option 3: Document / PDF */}
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.optionCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.outlineVariant,
        },
      ]}
      onPress={handleDocumentPick}>
      <View
        style={[
          styles.optionIconBox,
          { backgroundColor: colors.surfaceVariant },
        ]}>
        <Ionicons
          name="document-text-outline"
          size={22}
          color={colors.onSurfaceVariant}
        />
      </View>
      <View style={styles.optionContent}>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.onBackground, fontWeight: "600" },
          ]}>
          PDF or File
        </Text>
        <Text
          style={[
            typography.label,
            { color: colors.onSurfaceVariant, marginTop: 2 },
          ]}>
          Browse files for digital invoice, slip or PDF
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.onSurfaceVariant}
      />
    </TouchableOpacity>
  </View>);
}
