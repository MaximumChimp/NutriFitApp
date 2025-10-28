// screens/NotificationsScreen.jsx
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useNotifications } from "../../../context/NotificationsContext";

// Set notification handler to show banner, play sound, set badge
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,  // 🔔 Show banner even in foreground
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function NotificationsScreen({ navigation }) {
  const { notifications, addNotification, clearNotifications } = useNotifications();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearNotifications}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate("MainTabs", { screen: "Home" });
            }}
          >
            <Ionicons name="close" size={26} color="#111" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scroll}>
        <Text style={styles.dateLabel}>Today • {today}</Text>

        {notifications.length === 0 ? (
          <Text style={styles.emptyText}>No notifications</Text>
        ) : (
          notifications.map((notif, index) => (
            <View key={index} style={styles.notifItem}>
              <Ionicons
                name={notif.icon || "notifications-outline"}
                size={20}
                color="#14532d"
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{notif.title}</Text>
                <Text style={styles.notifDesc}>{notif.message}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 15 },
  clearText: { color: "#4d4d4d", fontSize: 16, marginRight: 10 },
  scroll: { marginTop: 20 },
  dateLabel: { fontSize: 14, fontWeight: "600", color: "#6b7280", marginBottom: 12 },
  emptyText: { color: "#6b7280", fontStyle: "italic", marginTop: 20, textAlign: "center" },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  notifTitle: { fontWeight: "600", fontSize: 16, color: "#111" },
  notifDesc: { fontSize: 14, color: "#444", marginTop: 2 },
});
