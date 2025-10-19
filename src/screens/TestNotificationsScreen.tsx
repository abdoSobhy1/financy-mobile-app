import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../constants";
import NotificationService from "../services/notificationService";
import BillPaymentService from "../services/billPaymentService";

const TestNotificationsScreen: React.FC = () => {
  const notificationService = NotificationService.getInstance();
  const billPaymentService = BillPaymentService.getInstance();

  const handleRequestPermissions = async () => {
    try {
      const granted = await notificationService.requestPermissions();
      Alert.alert("إذونات الإشعارات", granted ? "تم منح الإذونات بنجاح" : "تم رفض الإذونات");
    } catch (error) {
      Alert.alert("خطأ", "فشل في طلب الإذونات");
    }
  };

  const handleScheduleReminders = async () => {
    try {
      await notificationService.scheduleAllNotifications();
      Alert.alert("نجح", "تم جدولة التذكيرات بنجاح");
    } catch (error) {
      Alert.alert("خطأ", "فشل في جدولة التذكيرات");
    }
  };

  const handleSendTestNotification = async () => {
    try {
      await notificationService.sendTransactionReminder();
      Alert.alert("نجح", "تم إرسال إشعار تجريبي");
    } catch (error) {
      Alert.alert("خطأ", "فشل في إرسال الإشعار");
    }
  };

  const handleTestBillPayment = async () => {
    try {
      // Create a test bill payment
      const payment = await billPaymentService.recordPayment({
        billId: "test-bill-id",
        amount: 100,
        paymentDate: new Date().toISOString(),
        paymentMethod: "نقداً",
        note: "دفعة تجريبية",
      });

      Alert.alert("نجح", "تم تسجيل دفعة تجريبية");
    } catch (error) {
      Alert.alert("خطأ", "فشل في تسجيل الدفعة");
    }
  };

  const handleCheckSettings = async () => {
    try {
      const settings = await notificationService.getNotificationSettings();
      Alert.alert("إعدادات الإشعارات", `التذكيرات مفعلة: ${settings.enabled ? "نعم" : "لا"}\n` + `المواعيد: ${settings.times.join(", ")}`);
    } catch (error) {
      Alert.alert("خطأ", "فشل في تحميل الإعدادات");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>اختبار الإشعارات والمدفوعات</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إعدادات الإشعارات</Text>

          <TouchableOpacity style={styles.button} onPress={handleRequestPermissions}>
            <Ionicons name="notifications-outline" size={20} color="#FFF" />
            <Text style={styles.buttonText}>طلب إذونات الإشعارات</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleCheckSettings}>
            <Ionicons name="settings-outline" size={20} color="#FFF" />
            <Text style={styles.buttonText}>عرض إعدادات الإشعارات</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>اختبار الإشعارات</Text>

          <TouchableOpacity style={styles.button} onPress={handleScheduleReminders}>
            <Ionicons name="time-outline" size={20} color="#FFF" />
            <Text style={styles.buttonText}>جدولة التذكيرات</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleSendTestNotification}>
            <Ionicons name="paper-plane-outline" size={20} color="#FFF" />
            <Text style={styles.buttonText}>إرسال إشعار تجريبي</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>اختبار مدفوعات الفواتير</Text>

          <TouchableOpacity style={styles.button} onPress={handleTestBillPayment}>
            <Ionicons name="card-outline" size={20} color="#FFF" />
            <Text style={styles.buttonText}>تسجيل دفعة تجريبية</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={UI.COLORS.PRIMARY} />
          <Text style={styles.infoText}>
            هذه الشاشة مخصصة لاختبار وظائف الإشعارات وتسجيل المدفوعات. يمكنك استخدامها للتأكد من أن جميع الوظائف تعمل بشكل صحيح.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.COLORS.PRIMARY,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
    flex: 1,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: UI.COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    color: UI.COLORS.TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
});

export default TestNotificationsScreen;
