import re

file_path = "src/screens/SettingsScreens.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find the start of // RENDER
render_start = content.find("// RENDER")
if render_start == -1:
    print("Could not find // RENDER")
    exit(1)

# Find the end of SettingsScreen component
# The component ends before `const getStyles = `
styles_start = content.find("const getStyles =", render_start)
if styles_start == -1:
    print("Could not find getStyles")
    exit(1)

before_render = content[:render_start]

new_render = """// RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Top Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceVariant, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="person" size={16} color={colors.onSurfaceVariant} />
          </View>
          <Text style={[typography.h2, { color: colors.onBackground, marginLeft: spacing.md }]}>
            Financy
          </Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={colors.onBackground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: tabBarHeight + 100 }} showsVerticalScrollIndicator={false}>
        
        <Text style={[typography.h1, { color: colors.onBackground, marginTop: spacing.md, marginBottom: 4 }]}>Settings</Text>
        <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.xl }]}>Manage your account and preferences.</Text>

        <SectionLabel text="ACCOUNT" />
        <GlassCard>
          <SettingRow icon="person-outline" title="Profile Information" subtitle="Update your name, email, and avatar" />
          <SettingRow icon="shield-checkmark-outline" title="Security" subtitle="Password, 2FA, and linked devices" />
        </GlassCard>

        <SectionLabel text="PREFERENCES" />
        <GlassCard>
          <SettingRow icon="cash-outline" title="Currency" subtitle="Base currency for display (USD)" rightElement={<View style={{ flexDirection: "row", alignItems: "center" }}><Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant, marginRight: 8 }]}>USD</Text><Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} /></View>} />
          <SettingRow icon="globe-outline" title="Language" subtitle="English (US)" rightElement={<Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />} />
          <SettingRow icon="moon-outline" title="Theme" subtitle="Dark mode" rightElement={<Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />} />
          <SettingRow icon="apps-outline" title="Categories" subtitle="Manage transaction categories and icons" onPress={() => setAddCategoryModalVisible(true)} />
        </GlassCard>

        <SectionLabel text="DATA" />
        <GlassCard>
          <SettingRow icon="download-outline" title="Export Data" subtitle="Download your transaction history (CSV/PDF)" onPress={handleExportData} />
          <SettingRow icon="cloud-upload-outline" title="Backup & Sync" subtitle="Last synced: Today, 10:42 AM" onPress={handleSyncNow} />
        </GlassCard>

        <SectionLabel text="ABOUT" />
        <GlassCard>
          <SettingRow icon="information-circle-outline" title="About Financy" subtitle="Version 2.4.1 (Build 492)" onPress={handleVersionClick} />
          <ListRow
            title="Sign Out"
            onPress={() => dispatch(signOut())}
            leading={
              <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,107,107,0.1)" }}>
                <Ionicons name="log-out-outline" size={16} color="#FF6B6B" />
              </View>
            }
            trailing={<View/>}
            titleStyle={{ color: "#FF6B6B", fontWeight: "600" }}
          />
        </GlassCard>

      </ScrollView>
    </SafeAreaView>
  );
};

"""

# Retain getStyles
styles_content = content[styles_start:]

new_content = before_render + new_render + styles_content

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Settings replaced successfully.")
